using System;
using System.IO;
using System.Net;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

public partial class cashfree_Return : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (!IsPostBack)
        {
            string orderId = Request.QueryString["order_id"];

            if (string.IsNullOrEmpty(orderId))
            {
                lblMessage.Text = "order_id was not provided in the URL.";
                return;
            }

            lblMessage.Text = "Checking payment status for Order ID: " + Server.HtmlEncode(orderId);

            try
            {
                string rawJson;
                var result = GetOrderStatusDetailed(orderId, out rawJson);

                // Show friendly output on UI
                lblOrderStatus.Text = "Order Status: " + Server.HtmlEncode(result.Status);

                // Additional useful details (payment id, message, gateway id) if available
                var details = new StringBuilder();
                if (!string.IsNullOrEmpty(result.CfPaymentId)) details.Append(" cf_payment_id: " + Server.HtmlEncode(result.CfPaymentId) + ";");
                if (!string.IsNullOrEmpty(result.PaymentMessage)) details.Append(" message: " + Server.HtmlEncode(result.PaymentMessage) + ";");
                if (!string.IsNullOrEmpty(result.GatewayPaymentId)) details.Append(" gateway_payment_id: " + Server.HtmlEncode(result.GatewayPaymentId) + ";");

                if (details.Length > 0) lblOrderStatus.Text += " (" + details.ToString().Trim() + ")";

                // Pretty-print JSON for debugging (HTML-encoded)
                try
                {
                    var parsed = JToken.Parse(rawJson);
                    litRawJson.Text = "<pre>" + Server.HtmlEncode(parsed.ToString(Formatting.Indented)) + "</pre>";
                }
                catch
                {
                    litRawJson.Text = Server.HtmlEncode(rawJson);
                }
            }
            catch (Exception ex)
            {
                lblOrderStatus.Text = "Error: " + Server.HtmlEncode(ex.Message);
            }
        }
    }

    private class PaymentCheckResult
    {
        public string Status { get; set; }
        public string CfPaymentId { get; set; }
        public string PaymentMessage { get; set; }
        public string GatewayPaymentId { get; set; }
    }

    private PaymentCheckResult GetOrderStatusDetailed(string orderId, out string rawJson)
    {
        // Force TLS 1.2
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

        string baseUrl = "https://sandbox.cashfree.com";
        // string baseUrl = "https://api.cashfree.com"; //Use this endpoit
        string url = baseUrl + "/pg/orders/" + Uri.EscapeDataString(orderId) + "/payments";

        HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
        request.Method = "GET";
        request.Accept = "application/json";
        request.Headers["x-api-version"] = "2025-01-01";
        // Use environment variables for credentials to avoid leaking secrets in source
        string clientId = Environment.GetEnvironmentVariable("CASHFREE_APP_ID") ?? "REPLACE_WITH_YOUR_CLIENT_ID";
        string clientSecret = Environment.GetEnvironmentVariable("CASHFREE_SECRET") ?? "REPLACE_WITH_YOUR_CLIENT_SECRET";
        request.Headers["x-client-id"] = clientId;
        request.Headers["x-client-secret"] = clientSecret;
        string responseText = null;

        try
        {
            using (var resp = (HttpWebResponse)request.GetResponse())
            using (var sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
            {
                responseText = sr.ReadToEnd();
            }
        }
        catch (WebException ex)
        {
            if (ex.Response != null)
            {
                using (var errorResp = ex.Response)
                using (var sr = new StreamReader(errorResp.GetResponseStream(), Encoding.UTF8))
                {
                    responseText = sr.ReadToEnd();
                }
            }
            else
            {
                throw;
            }
        }

        rawJson = responseText ?? string.Empty;

        // Parse JSON into JToken to handle both array and object responses
        JToken root;
        try
        {
            root = JToken.Parse(rawJson);
        }
        catch (Exception parseEx)
        {
            throw new Exception("Invalid JSON returned from Cashfree: " + parseEx.Message);
        }

        // Normalize to JArray of payments
        JArray paymentsArray = null;

        if (root.Type == JTokenType.Array)
        {
            paymentsArray = (JArray)root;
        }
        else if (root.Type == JTokenType.Object)
        {
            var obj = (JObject)root;

            // Common shapes:
            // 1) { "payments": [ ... ] }
            // 2) { ...single payment object... }
            // 3) { "data": [ ... ] } or { "data": { ... } }

            JToken paymentsToken = obj["payments"] ?? obj["data"] ?? obj["payment"] ?? obj["payments"];
            if (paymentsToken != null)
            {
                if (paymentsToken.Type == JTokenType.Array) paymentsArray = (JArray)paymentsToken;
                else if (paymentsToken.Type == JTokenType.Object) paymentsArray = new JArray(paymentsToken);
            }
            else
            {
                // If none of the above, check if the object itself looks like a payment (has payment_status or cf_payment_id)
                if (obj["payment_status"] != null || obj["cf_payment_id"] != null || obj["cf_payment_id"] != null)
                {
                    paymentsArray = new JArray(obj);
                }
            }
        }

        // Default result
        var result = new PaymentCheckResult
        {
            Status = "Failure",
            CfPaymentId = null,
            PaymentMessage = null,
            GatewayPaymentId = null
        };

        if (paymentsArray != null && paymentsArray.Count > 0)
        {
            // Prefer the first payment entry as canonical for status
            var first = paymentsArray[0] as JObject;

            // Extract status and other useful fields
            string paymentStatus = (string)first["payment_status"] ?? (string)first["status"] ?? (string)first["paymentStatus"];
            string cfPaymentId = (string)first["cf_payment_id"] ?? (string)first["cf_paymentId"] ?? (string)first["cfPaymentId"];
            string paymentMessage = (string)first["payment_message"] ?? (string)first["message"] ?? (string)first["paymentMessage"];
            string gatewayPaymentId = null;
            var pgDetails = first["payment_gateway_details"] as JObject;
            if (pgDetails != null)
            {
                gatewayPaymentId = (string)pgDetails["gateway_payment_id"] ?? (string)pgDetails["gatewayPaymentId"];
            }

            // Determine simple status mapping
            if (!string.IsNullOrEmpty(paymentStatus) && paymentStatus.Equals("SUCCESS", StringComparison.OrdinalIgnoreCase))
            {
                result.Status = "Success";
            }
            else if (!string.IsNullOrEmpty(paymentStatus) &&
                     (paymentStatus.Equals("PENDING", StringComparison.OrdinalIgnoreCase)
                      || paymentStatus.Equals("INITIATED", StringComparison.OrdinalIgnoreCase)
                      || paymentStatus.Equals("PROCESSING", StringComparison.OrdinalIgnoreCase)))
            {
                result.Status = "Pending";
            }
            else
            {
                result.Status = !string.IsNullOrEmpty(paymentStatus) ? paymentStatus : "Failure";
            }

            result.CfPaymentId = cfPaymentId;
            result.PaymentMessage = paymentMessage;
            result.GatewayPaymentId = gatewayPaymentId;
        }
        else
        {
            // No payments array found — keep default "Failure"
            result.Status = "Failure";
        }

        return result;
    }
}
