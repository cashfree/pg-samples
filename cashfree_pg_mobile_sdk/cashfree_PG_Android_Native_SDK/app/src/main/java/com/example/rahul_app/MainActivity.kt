package com.example.rahul_app

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cashfree.pg.api.CFPaymentGatewayService
import com.cashfree.pg.core.api.CFSession
import com.cashfree.pg.core.api.callback.CFCheckoutResponseCallback
import com.cashfree.pg.core.api.utils.CFErrorResponse
import com.cashfree.pg.core.api.webcheckout.CFWebCheckoutPayment
import com.cashfree.pg.core.api.webcheckout.CFWebCheckoutTheme
import com.cashfree.pg.ui.api.upi.intent.CFIntentTheme
import com.cashfree.pg.ui.api.upi.intent.CFUPIIntentCheckout
import com.cashfree.pg.ui.api.upi.intent.CFUPIIntentCheckoutPayment
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class MainActivity : ComponentActivity(), CFCheckoutResponseCallback {
    private val state = MainUiState()
    private val repository = MerchantDemoRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MerchantDemoApp(
                state = state,
                onEnvironmentSelected = { state.environment = it },
                onFlowSelected = { state.flow = it },
                onCreateOrderAndPay = { createOrderAndPay() },
                onCheckStatus = { refreshPaymentStatus() },
                onReset = { state.resetForNewAttempt() }
            )
        }
        CFPaymentGatewayService.getInstance().setCheckoutCallback(this)
    }

    override fun onPaymentVerify(orderID: String) {
        Log.d("onPaymentVerify", "verifyPayment triggered for $orderID")
        state.lastOrderId = orderID
        state.screen = AppScreen.VERIFY
        refreshPaymentStatus()
    }

    override fun onPaymentFailure(cfErrorResponse: CFErrorResponse, orderID: String) {
        Log.e("onPaymentFailure $orderID", cfErrorResponse.message ?: "Unknown failure")
        state.lastOrderId = orderID
        state.screen = AppScreen.VERIFY
        state.errorMessage = cfErrorResponse.message ?: "Payment failed before completion."
        refreshPaymentStatus()
    }

    private fun createOrderAndPay() {
        CoroutineScope(Dispatchers.Main).launch {
            state.isLoading = true
            state.errorMessage = null
            try {
                val amount = state.orderAmount.toDoubleOrNull()
                if (amount == null || amount <= 0.0) {
                    state.errorMessage = "Please enter a valid amount."
                    return@launch
                }

                val orderResponse = repository.createOrder(
                    amount = amount,
                    environment = state.environment,
                    backendBaseUrl = BuildConfig.CASHFREE_BACKEND_BASE_URL
                )

                state.lastOrderId = orderResponse.orderId
                state.lastPaymentSessionId = orderResponse.paymentSessionId
                doPayment(
                    orderId = orderResponse.orderId,
                    paymentSessionId = orderResponse.paymentSessionId,
                    environment = state.environment,
                    flow = state.flow
                )
            } catch (exception: Exception) {
                state.errorMessage = exception.message ?: "Unable to create order."
            } finally {
                state.isLoading = false
            }
        }
    }

    private fun refreshPaymentStatus() {
        val orderId = state.lastOrderId ?: return
        CoroutineScope(Dispatchers.Main).launch {
            state.isCheckingStatus = true
            try {
                val paymentStatus = repository.getPaymentStatus(
                    orderId = orderId,
                    environment = state.environment,
                    backendBaseUrl = BuildConfig.CASHFREE_BACKEND_BASE_URL
                )
                state.paymentStatus = paymentStatus.status
                state.paymentTime = paymentStatus.paymentTime ?: "NA"
                state.paymentMode = paymentStatus.paymentMode ?: "NA"
                state.errorMessage = null
            } catch (exception: Exception) {
                state.errorMessage = exception.message ?: "Unable to fetch payment status."
            } finally {
                state.isCheckingStatus = false
            }
        }
    }

    private fun doPayment(
        orderId: String,
        paymentSessionId: String,
        environment: DemoEnvironment,
        flow: PaymentFlow
    ) {
        val cfEnvironment = if (environment == DemoEnvironment.SANDBOX) {
            CFSession.Environment.SANDBOX
        } else {
            CFSession.Environment.PRODUCTION
        }

        val session = CFSession.CFSessionBuilder()
            .setOrderId(orderId)
            .setPaymentSessionID(paymentSessionId)
            .setEnvironment(cfEnvironment)
            .build()

        when (flow) {
            PaymentFlow.WEB_CHECKOUT -> {
                val webTheme = CFWebCheckoutTheme.CFWebCheckoutThemeBuilder()
                    .setNavigationBarBackgroundColor("#132447")
                    .setNavigationBarTextColor("#FFFFFF")
                    .build()

                val webCheckoutPayment = CFWebCheckoutPayment.CFWebCheckoutPaymentBuilder()
                    .setSession(session)
                    .setCFWebCheckoutUITheme(webTheme)
                    .build()

                CFPaymentGatewayService.getInstance().doPayment(this, webCheckoutPayment)
            }

            PaymentFlow.UPI_INTENT -> {
                val upiTheme = CFIntentTheme.CFIntentThemeBuilder()
                    .setPrimaryTextColor("#101828")
                    .setBackgroundColor("#FFFFFF")
                    .build()

                val upiIntentCheckout = CFUPIIntentCheckout.CFUPIIntentBuilder().build()

                val upiIntentPayment = CFUPIIntentCheckoutPayment.CFUPIIntentPaymentBuilder()
                    .setSession(session)
                    .setCfUPIIntentCheckout(upiIntentCheckout)
                    .setCfIntentTheme(upiTheme)
                    .build()

                CFPaymentGatewayService.getInstance().doPayment(this, upiIntentPayment)
            }
        }
    }
}

private enum class AppScreen {
    INTEGRATION,
    VERIFY
}

private enum class DemoEnvironment {
    SANDBOX,
    PRODUCTION
}

private enum class PaymentFlow {
    WEB_CHECKOUT,
    UPI_INTENT
}

private class MainUiState {
    var screen by mutableStateOf(AppScreen.INTEGRATION)
    var environment by mutableStateOf(DemoEnvironment.SANDBOX)
    var flow by mutableStateOf(PaymentFlow.WEB_CHECKOUT)
    var orderAmount by mutableStateOf("1.00")
    var isLoading by mutableStateOf(false)
    var isCheckingStatus by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var lastOrderId by mutableStateOf<String?>(null)
    var lastPaymentSessionId by mutableStateOf<String?>(null)
    var paymentStatus by mutableStateOf("NOT_ATTEMPTED")
    var paymentTime by mutableStateOf("NA")
    var paymentMode by mutableStateOf("NA")

    fun resetForNewAttempt() {
        screen = AppScreen.INTEGRATION
        errorMessage = null
        paymentStatus = "NOT_ATTEMPTED"
        paymentTime = "NA"
        paymentMode = "NA"
    }
}

private data class CreateOrderResponse(
    val orderId: String,
    val paymentSessionId: String
)

private data class PaymentStatusResponse(
    val status: String,
    val paymentTime: String?,
    val paymentMode: String?
)

private class MerchantDemoRepository {
    private val client = OkHttpClient()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun createOrder(
        amount: Double,
        environment: DemoEnvironment,
        backendBaseUrl: String
    ): CreateOrderResponse = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("order_amount", amount)
            .put("order_currency", "INR")
            .put("customer_id", "merchant_demo_user_001")
            .put("customer_email", "demo.merchant@example.com")
            .put("customer_phone", "9999999999")
            .put("environment", environment.name.lowercase())

        val request = Request.Builder()
            .url("${backendBaseUrl.trimEnd('/')}/api/create-order")
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { response ->
            val bodyString = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw IllegalStateException("Order create failed: $bodyString")
            }
            val json = JSONObject(bodyString)
            CreateOrderResponse(
                orderId = json.getString("order_id"),
                paymentSessionId = json.getString("payment_session_id")
            )
        }
    }

    suspend fun getPaymentStatus(
        orderId: String,
        environment: DemoEnvironment,
        backendBaseUrl: String
    ): PaymentStatusResponse = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(
                "${backendBaseUrl.trimEnd('/')}/api/orders/$orderId/status?environment=${environment.name.lowercase()}"
            )
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            val bodyString = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw IllegalStateException("Status fetch failed: $bodyString")
            }
            val json = JSONObject(bodyString)
            PaymentStatusResponse(
                status = json.optString("payment_status", "PENDING"),
                paymentTime = json.optString("payment_time", "NA"),
                paymentMode = json.optString("payment_mode", "NA")
            )
        }
    }
}

@Composable
private fun MerchantDemoApp(
    state: MainUiState,
    onEnvironmentSelected: (DemoEnvironment) -> Unit,
    onFlowSelected: (PaymentFlow) -> Unit,
    onCreateOrderAndPay: () -> Unit,
    onCheckStatus: () -> Unit,
    onReset: () -> Unit
) {
    val snackBarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(state.errorMessage) {
        state.errorMessage?.let { message ->
            scope.launch {
                snackBarHostState.showSnackbar(message)
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(hostState = snackBarHostState) },
        containerColor = Color(0xFFF4F6FB)
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) {
            when (state.screen) {
                AppScreen.INTEGRATION -> IntegrationScreen(
                    state = state,
                    onEnvironmentSelected = onEnvironmentSelected,
                    onFlowSelected = onFlowSelected,
                    onCreateOrderAndPay = onCreateOrderAndPay
                )

                AppScreen.VERIFY -> VerifyScreen(
                    state = state,
                    onCheckStatus = onCheckStatus,
                    onReset = onReset
                )
            }
        }
    }
}

@Composable
private fun IntegrationScreen(
    state: MainUiState,
    onEnvironmentSelected: (DemoEnvironment) -> Unit,
    onFlowSelected: (PaymentFlow) -> Unit,
    onCreateOrderAndPay: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Redirection SDK: Cashfree PG Android Native SDK v2.3.2",
            fontSize = 12.sp,
            color = Color(0xFF475467),
            fontWeight = FontWeight.Medium
        )

        Text(
            text = "Cashfree Merchant Demo",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0F172A)
        )

        Text(
            text = "Step 1: Start backend to create orders securely.\nStep 2: Select environment and payment flow.\nStep 3: Tap create order and complete payment.\nStep 4: Verify final status below.",
            color = Color(0xFF334155)
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Choose Environment", fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    EnvironmentButton(
                        text = "Sandbox",
                        selected = state.environment == DemoEnvironment.SANDBOX
                    ) { onEnvironmentSelected(DemoEnvironment.SANDBOX) }
                    EnvironmentButton(
                        text = "Production",
                        selected = state.environment == DemoEnvironment.PRODUCTION
                    ) { onEnvironmentSelected(DemoEnvironment.PRODUCTION) }
                }
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Choose Payment Method", fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(8.dp))
                PaymentFlowOption(
                    title = "doWebPayment",
                    selected = state.flow == PaymentFlow.WEB_CHECKOUT
                ) { onFlowSelected(PaymentFlow.WEB_CHECKOUT) }
                PaymentFlowOption(
                    title = "doUPIPayment",
                    selected = state.flow == PaymentFlow.UPI_INTENT
                ) { onFlowSelected(PaymentFlow.UPI_INTENT) }
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Order Amount (INR)", fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = state.orderAmount,
                    onValueChange = { state.orderAmount = it },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
                Text(
                    text = "Use test amounts for merchant demo scenarios.",
                    color = Color(0xFF64748B),
                    fontSize = 13.sp
                )
            }
        }

        Button(
            onClick = onCreateOrderAndPay,
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isLoading,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF132447))
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.height(18.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Text("Create Order & Proceed")
            }
        }
    }
}

@Composable
private fun VerifyScreen(
    state: MainUiState,
    onCheckStatus: () -> Unit,
    onReset: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Post Payment Verification",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0F172A)
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                DetailRow("Payment Status", state.paymentStatus)
                DetailRow("Order ID", state.lastOrderId ?: "NA")
                DetailRow("Payment Time", state.paymentTime)
                DetailRow("Payment Mode", state.paymentMode)
            }
        }

        if (state.paymentStatus.equals("PENDING", ignoreCase = true)) {
            Button(
                onClick = onCheckStatus,
                enabled = !state.isCheckingStatus,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16325B))
            ) {
                if (state.isCheckingStatus) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Check Status")
                }
            }
        }

        OutlinedButton(
            onClick = onReset,
            modifier = Modifier.fillMaxWidth(),
            border = BorderStroke(1.dp, Color(0xFF132447))
        ) {
            Text("Start New Payment")
        }
    }
}

@Composable
private fun EnvironmentButton(text: String, selected: Boolean, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = if (selected) Color(0xFF132447) else Color.White,
            contentColor = if (selected) Color.White else Color(0xFF132447)
        ),
        border = BorderStroke(1.dp, Color(0xFF132447))
    ) {
        Text(text)
    }
}

@Composable
private fun PaymentFlowOption(
    title: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .background(Color(0xFFF8FAFC), RoundedCornerShape(10.dp))
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = selected, onClick = onClick)
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = title, style = MaterialTheme.typography.bodyLarge)
        Spacer(modifier = Modifier.weight(1f))
        TextButton(onClick = onClick) {
            Text("Select")
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "$label:",
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF334155),
            modifier = Modifier.width(120.dp)
        )
        Text(text = value, color = Color(0xFF0F172A))
    }
}
