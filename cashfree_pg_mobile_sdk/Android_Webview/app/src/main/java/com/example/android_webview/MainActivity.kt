package com.example.android_webview

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var pendingStatusUrl: String? = null
    private var pendingOrderId: String? = null
    private var waitingForPspResult = false
    private val baseCandidates: List<String> = listOf(
        "http://127.0.0.1:8090"
    )

    private val upiIntentLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            if (waitingForPspResult) {
                waitingForPspResult = false
                pendingStatusUrl?.let { webView.loadUrl(it) }
            }
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        val nativeBanner = findViewById<android.widget.TextView>(R.id.nativeBanner)

        ViewCompat.setOnApplyWindowInsetsListener(nativeBanner) { view, insets ->
            val topInsets: Insets = insets.getInsets(
                WindowInsetsCompat.Type.statusBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.setPadding(
                view.paddingLeft,
                topInsets.top + dpToPx(12),
                view.paddingRight,
                view.paddingBottom
            )
            insets
        }
        ViewCompat.requestApplyInsets(nativeBanner)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            mediaPlaybackRequiresUserGesture = false
            setSupportMultipleWindows(false)
        }

        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                return handleNavigation(url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                return handleNavigation(url ?: return false)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    Toast.makeText(
                        this@MainActivity,
                        "Backend not reachable. Run adb reverse tcp:8090 tcp:8090 and restart the app.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }

        loadCurrentBase()
    }

    private fun handleNavigation(url: String): Boolean {
        if (isUpiOrPspUrl(url)) {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            return try {
                waitingForPspResult = true
                upiIntentLauncher.launch(intent)
                true
            } catch (_: ActivityNotFoundException) {
                waitingForPspResult = false
                Toast.makeText(this, "No supported UPI app found", Toast.LENGTH_SHORT).show()
                true
            } catch (_: Exception) {
                waitingForPspResult = false
                true
            }
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
            return false
        }

        return try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            true
        } catch (_: Exception) {
            true
        }
    }

    private fun isUpiOrPspUrl(url: String): Boolean {
        return url.startsWith("upi://") ||
            url.startsWith("tez://") ||
            url.startsWith("gpay://") ||
            url.startsWith("paytmmp://") ||
            url.startsWith("phonepe://")
    }

    private fun loadCurrentBase() {
        webView.loadUrl(baseCandidates.first())
    }

    override fun onResume() {
        super.onResume()
        if (waitingForPspResult && pendingStatusUrl != null) {
            waitingForPspResult = false
            webView.loadUrl(pendingStatusUrl!!)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    private inner class AndroidBridge {
        @JavascriptInterface
        fun setCheckoutContext(orderId: String, statusUrl: String) {
            pendingOrderId = orderId
            pendingStatusUrl = statusUrl
        }

        @JavascriptInterface
        fun getPendingOrderId(): String {
            return pendingOrderId.orEmpty()
        }
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }
}
