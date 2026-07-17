package com.example.cashfree.api;

import com.cashfree.pg.ApiException;
import com.cashfree.pg.ApiResponse;
import com.cashfree.pg.Cashfree;
import com.cashfree.pg.model.CreateSubscriptionRequest;
import com.cashfree.pg.model.CreateSubscriptionRequestPlanDetails;
import com.cashfree.pg.model.CreateSubscriptionRequestSubscriptionMeta;
import com.cashfree.pg.model.ManageSubscriptionRequest;
import com.cashfree.pg.model.SubscriptionCustomerDetails;
import com.cashfree.pg.model.SubscriptionEntity;
import com.example.cashfree.config.AppProperties;
import com.example.cashfree.config.CashfreeProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.ArrayList;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private static final Pattern SUBSCRIPTION_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_.\\- ]{3,250}$");
    private static final BigDecimal MIN_AMOUNT = new BigDecimal("1.00");
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("100000.00");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final Cashfree cashfree;
    private final CashfreeProperties cashfreeProperties;
    private final AppProperties appProperties;

    public SubscriptionController(
            Cashfree cashfree,
            CashfreeProperties cashfreeProperties,
            AppProperties appProperties) {
        this.cashfree = cashfree;
        this.cashfreeProperties = cashfreeProperties;
        this.appProperties = appProperties;
    }

    @GetMapping("/generate-id")
    GenerateIdResponse generateSubscriptionId() {
        String suffix = Long.toUnsignedString(SECURE_RANDOM.nextLong(), 36);
        return new GenerateIdResponse("subdemo_" + Instant.now().toEpochMilli() + "_" + suffix);
    }

    @PostMapping
    ResponseEntity<SubscriptionResponse> createSubscription(
            @RequestBody CreateSubscriptionPayload payload) throws ApiException {
        ensureCredentialsConfigured();

        String subscriptionId = validateSubscriptionId(payload.subscriptionId());
        BigDecimal maxAmount = validateAmount(payload.maxAmount());

        SubscriptionCustomerDetails customerDetails = new SubscriptionCustomerDetails()
                .customerName("Demo User")
                .customerEmail("demo@example.com")
                .customerPhone("9999999999");

        CreateSubscriptionRequestPlanDetails planDetails = new CreateSubscriptionRequestPlanDetails()
                .planName("Demo ON_DEMAND Plan")
                .planType("ON_DEMAND")
                .planCurrency("INR")
                .planMaxAmount(maxAmount);

        String returnUrl = normalizedBaseUrl()
                + "/api/subscriptions/return?subscription_id="
                + URLEncoder.encode(subscriptionId, StandardCharsets.UTF_8);

        CreateSubscriptionRequest request = new CreateSubscriptionRequest()
                .subscriptionId(subscriptionId)
                .customerDetails(customerDetails)
                .planDetails(planDetails)
                .subscriptionMeta(new CreateSubscriptionRequestSubscriptionMeta().returnUrl(returnUrl))
                .subscriptionNote("Cashfree Java SDK subscription demo");

        ApiResponse<SubscriptionEntity> response = cashfree.SubsCreateSubscription(
                request,
                UUID.randomUUID().toString(),
                UUID.randomUUID(),
                null);

        SubscriptionEntity entity = response.getData();
        return ResponseEntity.ok(toSubscriptionResponse(entity));
    }

    @GetMapping("/{subscriptionId}")
    SubscriptionResponse fetchSubscription(@PathVariable String subscriptionId) throws ApiException {
        ensureCredentialsConfigured();
        String safeId = validateSubscriptionId(subscriptionId);

        ApiResponse<SubscriptionEntity> response = cashfree.SubsFetchSubscription(
                safeId,
                UUID.randomUUID().toString(),
                UUID.randomUUID(),
                null);

        return toSubscriptionResponse(response.getData());
    }

    @GetMapping("/{subscriptionId}/payments")
    List<SubscriptionPaymentSummary> fetchSubscriptionPayments(
            @PathVariable String subscriptionId) throws Exception {
        ensureCredentialsConfigured();
        String safeId = validateSubscriptionId(subscriptionId);

        // Use raw OkHttp to avoid SDK deserialization bug:
        // AuthorizationDetails.payment_method is typed String but Cashfree returns a JSON object.
        boolean isSandbox = !"PRODUCTION".equalsIgnoreCase(cashfreeProperties.getEnvironment());
        String apiBase = isSandbox ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg";

        okhttp3.OkHttpClient httpClient = new okhttp3.OkHttpClient();
        okhttp3.Request req = new okhttp3.Request.Builder()
                .url(apiBase + "/subscriptions/" + safeId + "/payments")
                .get()
                .addHeader("x-client-id", cashfreeProperties.getClientId())
                .addHeader("x-client-secret", cashfreeProperties.getClientSecret())
                .addHeader("x-api-version", "2023-08-01")
                .addHeader("Accept", "application/json")
                .build();

        try (okhttp3.Response httpResp = httpClient.newCall(req).execute()) {
            String body = httpResp.body() != null ? httpResp.body().string() : "[]";
            if (!httpResp.isSuccessful()) {
                throw new ApiException(httpResp.code(), "Cashfree payments API error: " + body);
            }
            JsonNode root = new ObjectMapper().readTree(body);
            if (!root.isArray()) {
                return List.of();
            }
            List<SubscriptionPaymentSummary> result = new ArrayList<>();
            for (JsonNode node : root) {
                if (node.isObject()) {
                    result.add(jsonToPaymentSummary(node));
                }
            }
            return result;
        }
    }

    private SubscriptionPaymentSummary jsonToPaymentSummary(JsonNode o) {
        return new SubscriptionPaymentSummary(
                strOf(o, "cf_payment_id"),
                strOf(o, "payment_id"),
                strOf(o, "subscription_id"),
                decimalOf(o, "payment_amount"),
                strOf(o, "payment_schedule_date"),
                strOf(o, "payment_status"));
    }

    private String strOf(JsonNode o, String key) {
        JsonNode n = o.get(key);
        return (n != null && !n.isNull()) ? n.asText() : null;
    }

    private BigDecimal decimalOf(JsonNode o, String key) {
        JsonNode n = o.get(key);
        if (n == null || n.isNull()) return null;
        try {
            return n.decimalValue();
        } catch (Exception ex) {
            return null;
        }
    }

    @RequestMapping(value = "/return", method = {RequestMethod.GET, RequestMethod.POST})
    ResponseEntity<Void> subscriptionReturn(
            @RequestParam(required = false) String subscription_id) {
        String location = "/subscription.html";
        if (StringUtils.hasText(subscription_id)) {
            location += "?subscription_id=" + URLEncoder.encode(subscription_id, StandardCharsets.UTF_8);
        }
        return ResponseEntity.status(HttpStatus.FOUND).header("Location", location).build();
    }

    @PostMapping("/{subscriptionId}/manage")
    SubscriptionResponse manageSubscription(
            @PathVariable String subscriptionId,
            @RequestBody ManageSubscriptionPayload payload) throws ApiException {
        ensureCredentialsConfigured();
        String safeId = validateSubscriptionId(subscriptionId);
        String action = validateAction(payload.action());

        ManageSubscriptionRequest request = new ManageSubscriptionRequest().action(action);

        ApiResponse<SubscriptionEntity> response = cashfree.SubsManageSubscription(
                safeId,
                request,
                UUID.randomUUID().toString(),
                UUID.randomUUID(),
                null);

        return toSubscriptionResponse(response.getData());
    }

    private SubscriptionResponse toSubscriptionResponse(SubscriptionEntity entity) {
        return new SubscriptionResponse(
                entity.getSubscriptionId(),
                entity.getCfSubscriptionId(),
                entity.getSubscriptionStatus(),
                entity.getSubscriptionSessionId());
    }

    private String validateSubscriptionId(String subscriptionId) {
        if (!StringUtils.hasText(subscriptionId)
                || !SUBSCRIPTION_ID_PATTERN.matcher(subscriptionId.trim()).matches()) {
            throw new IllegalArgumentException(
                    "Subscription ID must be 3-250 characters using letters, numbers, underscore, dot, hyphen, or space.");
        }
        return subscriptionId.trim();
    }

    private BigDecimal validateAmount(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Max amount is required.");
        }
        BigDecimal normalized = amount.stripTrailingZeros();
        if (normalized.scale() > 2
                || normalized.compareTo(MIN_AMOUNT) < 0
                || normalized.compareTo(MAX_AMOUNT) > 0) {
            throw new IllegalArgumentException(
                    "Amount must be between 1.00 and 100000.00 with up to two decimals.");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private String validateAction(String action) {
        if (action == null) {
            throw new IllegalArgumentException("Action is required.");
        }
        return switch (action.toUpperCase()) {
            case "CANCEL", "PAUSE", "ACTIVATE" -> action.toUpperCase();
            default -> throw new IllegalArgumentException(
                    "Action must be one of: CANCEL, PAUSE, ACTIVATE.");
        };
    }

    private String normalizedBaseUrl() {
        String baseUrl = StringUtils.hasText(appProperties.getBaseUrl())
                ? appProperties.getBaseUrl().trim()
                : "http://localhost:8080";
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    private void ensureCredentialsConfigured() {
        if (!StringUtils.hasText(cashfreeProperties.getClientId())
                || !StringUtils.hasText(cashfreeProperties.getClientSecret())) {
            throw new IllegalArgumentException("Cashfree credentials are not configured on the server.");
        }
    }

    public record GenerateIdResponse(String subscriptionId) {}

    public record CreateSubscriptionPayload(String subscriptionId, BigDecimal maxAmount) {}

    public record ManageSubscriptionPayload(String action) {}

    public record SubscriptionResponse(
            String subscriptionId,
            String cfSubscriptionId,
            String subscriptionStatus,
            String subscriptionSessionId) {}

    public record SubscriptionPaymentSummary(
            String cfPaymentId,
            String paymentId,
            String subscriptionId,
            BigDecimal paymentAmount,
            String paymentScheduleDate,
            String paymentStatus) {}
}
