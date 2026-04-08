using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Options;
using cashfree_pg.Client;
using cashfree_pg.Model;
using Cashfree_Project.Config;
using System;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace Cashfree_Project.Pages
{
    public class ReturnModel : PageModel
    {
        private readonly CashfreeSettings _cfg;

        public ReturnModel(IOptions<CashfreeSettings> cfg)
        {
            _cfg = cfg.Value;
        }

        public string OrderId { get; set; }
        public OrderEntity OrderDetails { get; set; }
        public string PaymentStatus { get; set; }
        public string OrderAmount { get; set; }
        public string PaymentTime { get; set; }
        public string CfPaymentId { get; set; }
        public string BankReference { get; set; }
        public string PaymentMode { get; set; }
        public string ErrorMessage { get; set; }
        public string RawResponseJson { get; set; }

        public async Task<IActionResult> OnGetAsync()
        {
            OrderId = Request.Query["order_id"];

            if (string.IsNullOrWhiteSpace(OrderId))
            {
                ErrorMessage = "Order ID is missing from the return URL.";
                return Page();
            }

            try
            {
                // Decide environment from BaseUrl or default to SANDBOX
                var env = Cashfree.SANDBOX;
                if (!string.IsNullOrWhiteSpace(_cfg.BaseUrl) &&
                    _cfg.BaseUrl.Contains("api.cashfree.com", StringComparison.OrdinalIgnoreCase))
                {
                    env = Cashfree.PRODUCTION;
                }

                // Init SDK
                var cashfree = new Cashfree(env, _cfg.ClientId, _cfg.ClientSecret, null, null, null, false);

                // Fetch order details
                var result = cashfree.PGFetchOrder(OrderId, null, null, null);

                if (result?.Content is OrderEntity order)
                {
                    OrderDetails = order;
                    RawResponseJson = JsonSerializer.Serialize(order);

                    // Extract order-level fields
                    OrderId = order.GetType().GetProperty("order_id")?.GetValue(order)?.ToString() ?? "N/A";
                    PaymentStatus = order.GetType().GetProperty("order_status")?.GetValue(order)?.ToString() ?? "Unknown";
                    OrderAmount = order.GetType().GetProperty("order_amount")?.GetValue(order)?.ToString() ?? "N/A";
                    PaymentTime = order.GetType().GetProperty("payment_completion_time")?.GetValue(order)?.ToString() ?? 
                                  order.GetType().GetProperty("created_at")?.GetValue(order)?.ToString() ?? "N/A";

                    // Fetch payment details separately using OData or payments API
                    // First, try to get payments by querying all payments and filtering by order_id
                    try
                    {
                        var paymentsResult = cashfree.PGOrderFetchPayments(OrderId, null, null, null);
                        if (paymentsResult?.Content != null)
                        {
                            ExtractPaymentDetailsFromResponse(paymentsResult.Content);
                        }
                        else
                        {
                            Console.WriteLine("[OnGetAsync] PGOrderFetchPayments returned null content");
                        }
                    }
                    catch (Exception paymentEx)
                    {
                        Console.WriteLine($"[OnGetAsync] Error fetching payments details: {paymentEx.Message}");
                        // Fallback: try to extract from order if available
                        ExtractPaymentDetails(order);
                    }
                }
                else
                {
                    ErrorMessage = "Failed to fetch order details.";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error fetching order: {ex.Message}";
            }

            return Page();
        }

        private void ExtractPaymentDetailsFromResponse(object paymentResponse)
        {
            try
            {
                Console.WriteLine($"[ExtractPaymentDetailsFromResponse] Payment Response: {JsonSerializer.Serialize(paymentResponse)}");
                
                // Check if response is a list/collection
                if (paymentResponse is System.Collections.IEnumerable enumerable)
                {
                    var firstPayment = enumerable.Cast<object>().FirstOrDefault();
                    if (firstPayment != null)
                    {
                        Console.WriteLine($"[ExtractPaymentDetailsFromResponse] First Payment: {JsonSerializer.Serialize(firstPayment)}");
                        ExtractFromPaymentObject(firstPayment);
                    }
                }
                else
                {
                    // Single payment object
                    ExtractFromPaymentObject(paymentResponse);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ExtractPaymentDetailsFromResponse] Error: {ex.Message} | {ex.StackTrace}");
            }
        }

        private void ExtractFromPaymentObject(object payment)
        {
            try
            {
                var paymentType = payment.GetType();
                Console.WriteLine($"[ExtractFromPaymentObject] Payment type properties: {string.Join(", ", paymentType.GetProperties().Select(p => p.Name))}");

                // Extract cf_payment_id
                var cfPaymentIdProp = paymentType.GetProperty("cf_payment_id") ?? 
                                     paymentType.GetProperty("CfPaymentId") ??
                                     paymentType.GetProperty("payment_id") ??
                                     paymentType.GetProperty("PaymentId");
                
                CfPaymentId = cfPaymentIdProp?.GetValue(payment)?.ToString() ?? "N/A";
                Console.WriteLine($"[ExtractFromPaymentObject] CfPaymentId: {CfPaymentId}");

                // Extract bank_reference (UTR)
                var bankRefProp = paymentType.GetProperty("bank_reference") ?? 
                                paymentType.GetProperty("BankReference") ??
                                paymentType.GetProperty("utr") ??
                                paymentType.GetProperty("UTR") ??
                                paymentType.GetProperty("bank_account_number");
                
                BankReference = bankRefProp?.GetValue(payment)?.ToString() ?? "N/A";
                Console.WriteLine($"[ExtractFromPaymentObject] BankReference: {BankReference}");

                // Extract payment mode/group
                var paymentModeProp = paymentType.GetProperty("payment_group") ?? 
                                     paymentType.GetProperty("PaymentGroup") ??
                                     paymentType.GetProperty("payment_method") ??
                                     paymentType.GetProperty("PaymentMethod");
                
                PaymentMode = paymentModeProp?.GetValue(payment)?.ToString() ?? "N/A";
                Console.WriteLine($"[ExtractFromPaymentObject] PaymentMode: {PaymentMode}");

                // Update payment time if available
                var paymentTimeProp = paymentType.GetProperty("payment_completion_time") ?? 
                                     paymentType.GetProperty("PaymentCompletionTime") ??
                                     paymentType.GetProperty("created_at") ??
                                     paymentType.GetProperty("CreatedAt");
                
                if (paymentTimeProp != null)
                {
                    var timeValue = paymentTimeProp.GetValue(payment)?.ToString();
                    if (!string.IsNullOrEmpty(timeValue))
                    {
                        PaymentTime = timeValue;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ExtractFromPaymentObject] Error: {ex.Message}");
            }
        }

        private void ExtractPaymentDetails(OrderEntity order)
        {
            try
            {
                // Fallback method to extract payment details if available on order
                var paymentIdProp = order.GetType().GetProperty("cf_payment_id") ?? 
                                   order.GetType().GetProperty("CfPaymentId");
                if (paymentIdProp != null)
                {
                    CfPaymentId = paymentIdProp.GetValue(order)?.ToString() ?? "N/A";
                }

                var bankRefProp = order.GetType().GetProperty("bank_reference") ?? 
                                 order.GetType().GetProperty("BankReference");
                if (bankRefProp != null)
                {
                    BankReference = bankRefProp.GetValue(order)?.ToString() ?? "N/A";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ExtractPaymentDetails] Error: {ex.Message}");
            }
        }
    }
}