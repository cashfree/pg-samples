package com.example.cashfree.api;

import com.cashfree.pg.ApiException;
import com.cashfree.pg.ApiResponse;
import com.cashfree.pg.Cashfree;
import com.cashfree.pg.model.CreateOrderRequest;
import com.cashfree.pg.model.CustomerDetails;
import com.cashfree.pg.model.OrderEntity;
import com.cashfree.pg.model.OrderMeta;
import com.cashfree.pg.model.PaymentEntity;
import com.example.cashfree.config.AppProperties;
import com.example.cashfree.config.CashfreeProperties;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class OrderController {

    private static final Pattern ORDER_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{3,50}$");
    private static final BigDecimal MIN_AMOUNT = new BigDecimal("1.00");
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("100000.00");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final List<String> PAYMENT_STATUS_PRIORITY = List.of(
            "SUCCESS",
            "FAILED",
            "PENDING",
            "USER_DROPPED",
            "CANCELLED",
            "VOID",
            "NOT_ATTEMPTED");

    private final Cashfree cashfree;
    private final CashfreeProperties cashfreeProperties;
    private final AppProperties appProperties;

    public OrderController(
            Cashfree cashfree,
            CashfreeProperties cashfreeProperties,
            AppProperties appProperties) {
        this.cashfree = cashfree;
        this.cashfreeProperties = cashfreeProperties;
        this.appProperties = appProperties;
    }

    @GetMapping("/config")
    DemoConfig config() {
        return new DemoConfig(
                cashfreeProperties.getSdkType(),
                cashfreeProperties.getSdkVersion(),
                cashfreeProperties.getEnvironment().toUpperCase(Locale.ROOT),
                credentialsConfigured());
    }

    @GetMapping("/orders/generate-id")
    Map<String, String> generateOrderId() {
        String suffix = Long.toUnsignedString(SECURE_RANDOM.nextLong(), 36);
        return Map.of("orderId", "sdkdemo_" + Instant.now().toEpochMilli() + "_" + suffix);
    }

    @PostMapping("/orders")
    ResponseEntity<OrderResponse> createOrder(@RequestBody CreateOrderPayload payload) throws ApiException {
        ensureCredentialsConfigured();

        String orderId = validateOrderId(payload.orderId());
        BigDecimal amount = validateAmount(payload.amount());

        CustomerDetails customerDetails = new CustomerDetails()
                .customerId("merchant_demo_customer")
                .customerPhone("9999999999")
                .customerName("Merchant Demo User");

        String returnUrl = normalizedBaseUrl()
                + "/return.html?order_id="
                + URLEncoder.encode(orderId, StandardCharsets.UTF_8);

        CreateOrderRequest request = new CreateOrderRequest()
                .orderId(orderId)
                .orderAmount(amount)
                .orderCurrency("INR")
                .customerDetails(customerDetails)
                .orderMeta(new OrderMeta().returnUrl(returnUrl))
                .orderNote("Cashfree Java PG SDK merchant walkthrough demo");

        ApiResponse<OrderEntity> response = cashfree.PGCreateOrder(
                request,
                UUID.randomUUID().toString(),
                UUID.randomUUID(),
                null);

        OrderEntity order = response.getData();
        return ResponseEntity.ok(toOrderResponse(order));
    }

    @GetMapping("/orders/{orderId}/status")
    OrderStatusResponse fetchOrderStatus(@PathVariable String orderId) throws ApiException {
        ensureCredentialsConfigured();
        String safeOrderId = validateOrderId(orderId);

        ApiResponse<OrderEntity> response = cashfree.PGFetchOrder(
                safeOrderId,
                UUID.randomUUID().toString(),
                null,
                null);

        OrderEntity order = response.getData();
        PaymentDetails paymentDetails = fetchLatestPaymentDetails(safeOrderId);
        return new OrderStatusResponse(
                order.getOrderId(),
                order.getCfOrderId(),
                order.getOrderStatus(),
                order.getOrderAmount(),
                order.getOrderCurrency(),
                paymentDetails);
    }

    private PaymentDetails fetchLatestPaymentDetails(String orderId) throws ApiException {
        ApiResponse<List<PaymentEntity>> response = cashfree.PGOrderFetchPayments(
                orderId,
                UUID.randomUUID().toString(),
                null,
                null);

        List<PaymentEntity> payments = response.getData();
        if (payments == null || payments.isEmpty()) {
            return null;
        }

        return payments.stream()
                .filter(payment -> payment != null && hasTransactionIdentifier(payment))
                .min(Comparator
                        .comparingInt(OrderController::paymentStatusPriority)
                        .thenComparing(PaymentEntity::getPaymentTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .or(() -> payments.stream()
                        .filter(payment -> payment != null)
                        .max(Comparator
                                .comparing(PaymentEntity::getPaymentTime, Comparator.nullsFirst(String::compareTo))
                                .thenComparing(PaymentEntity::getCfPaymentId, Comparator.nullsFirst(String::compareTo))))
                .map(payment -> new PaymentDetails(
                        payment.getCfPaymentId(),
                        payment.getBankReference(),
                        payment.getPaymentGroup(),
                        payment.getPaymentTime(),
                        payment.getPaymentStatus() == null ? null : payment.getPaymentStatus().getValue(),
                        payment.getPaymentMessage()))
                .orElse(null);
    }

    private static boolean hasTransactionIdentifier(PaymentEntity payment) {
        return StringUtils.hasText(payment.getCfPaymentId());
    }

    private static int paymentStatusPriority(PaymentEntity payment) {
        String status = payment.getPaymentStatus() == null ? null : payment.getPaymentStatus().getValue();
        int index = PAYMENT_STATUS_PRIORITY.indexOf(status);
        return index >= 0 ? index : PAYMENT_STATUS_PRIORITY.size();
    }

    private OrderResponse toOrderResponse(OrderEntity order) {
        return new OrderResponse(
                order.getOrderId(),
                order.getCfOrderId(),
                order.getOrderStatus(),
                order.getOrderAmount(),
                order.getOrderCurrency(),
                order.getPaymentSessionId(),
                cashfreeProperties.getSdkType(),
                cashfreeProperties.getSdkVersion());
    }

    private String validateOrderId(String orderId) {
        if (!StringUtils.hasText(orderId) || !ORDER_ID_PATTERN.matcher(orderId.trim()).matches()) {
            throw new IllegalArgumentException("Order ID must be 3-50 characters and use letters, numbers, underscore, or hyphen only.");
        }
        return orderId.trim();
    }

    private BigDecimal validateAmount(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount is required.");
        }
        BigDecimal normalized = amount.stripTrailingZeros();
        if (normalized.scale() > 2 || normalized.compareTo(MIN_AMOUNT) < 0 || normalized.compareTo(MAX_AMOUNT) > 0) {
            throw new IllegalArgumentException("Amount must be between 1.00 and 100000.00 with up to two decimals.");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private void ensureCredentialsConfigured() {
        if (!credentialsConfigured()) {
            throw new IllegalArgumentException("Cashfree credentials are not configured on the server.");
        }
    }

    private boolean credentialsConfigured() {
        return StringUtils.hasText(cashfreeProperties.getClientId())
                && StringUtils.hasText(cashfreeProperties.getClientSecret());
    }

    private String normalizedBaseUrl() {
        String baseUrl = StringUtils.hasText(appProperties.getBaseUrl())
                ? appProperties.getBaseUrl().trim()
                : "http://localhost:8080";
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public record CreateOrderPayload(String orderId, BigDecimal amount) {
    }

    public record DemoConfig(String sdkType, String sdkVersion, String environment, boolean credentialsConfigured) {
    }

    public record OrderResponse(
            String orderId,
            String cfOrderId,
            String orderStatus,
            BigDecimal orderAmount,
            String orderCurrency,
            String paymentSessionId,
            String sdkType,
            String sdkVersion) {
    }

    public record OrderStatusResponse(
            String orderId,
            String cfOrderId,
            String orderStatus,
            BigDecimal orderAmount,
            String orderCurrency,
            PaymentDetails payment) {
    }

    public record PaymentDetails(
            String cfPaymentId,
            String bankReference,
            String paymentGroup,
            String paymentTime,
            String paymentStatus,
            String paymentMessage) {
    }
}
