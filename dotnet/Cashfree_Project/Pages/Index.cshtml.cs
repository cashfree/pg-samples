using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Options;
using cashfree_pg.Client;
using cashfree_pg.Model;
using Cashfree_Project.Config;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace Cashfree_Project.Pages
{
    public class IndexModel : PageModel
    {
        private readonly CashfreeSettings _cfg;

        public IndexModel(IOptions<CashfreeSettings> cfg)
        {
            _cfg = cfg.Value;
        }

        [BindProperty] public string OrderId { get; set; }
        [BindProperty] public decimal OrderAmount { get; set; }
        [BindProperty] public string CustomerName { get; set; }
        [BindProperty] public string CustomerEmail { get; set; }
        [BindProperty] public string CustomerPhone { get; set; }

        public OrderEntity OrderResponse { get; set; }
        public string ErrorMessage { get; set; }
        public string OrderIdOut { get; set; }
        public string PaymentSessionIdOut { get; set; }
        public string RawResponseJson { get; set; }

        public void OnGet() { }

        public async Task<IActionResult> OnPostCreateOrderAsync()
        {
            try
            {
                // Debug: confirm form values and config are present
                Console.WriteLine($"[CreateOrder] OrderId={OrderId}, Amount={OrderAmount}");

                if (string.IsNullOrWhiteSpace(OrderId) || OrderAmount <= 0)
                {
                    ErrorMessage = "Order ID and Amount are required";
                    return Page();
                }

                // Decide environment from BaseUrl or default to SANDBOX
                var env = Cashfree.SANDBOX;
                if (!string.IsNullOrWhiteSpace(_cfg.BaseUrl) &&
                    _cfg.BaseUrl.Contains("api.cashfree.com", StringComparison.OrdinalIgnoreCase))
                {
                    env = Cashfree.PRODUCTION;
                }

                // Init SDK
                var cashfree = new Cashfree(env, _cfg.ClientId, _cfg.ClientSecret, null, null, null, false);

                // Optional base URL override (rarely needed):
                // cashfree.BasePath = _cfg.BaseUrl;

                var customerDetails = new CustomerDetails(
                    "cust_" + OrderId,     // customer_id
                    CustomerEmail,
                    CustomerPhone,
                    CustomerName
                );

                var req = new CreateOrderRequest(
                    OrderId,
                    Convert.ToDouble(OrderAmount),
                    "INR",
                    null,
                    customerDetails
                );
                req.order_meta = new OrderMeta
                {
                    return_url = "https://yourdomain.com/payment/response?order_id={order_id}"
                };

                // Log the outgoing JSON for sanity
                Console.WriteLine("[CreateOrder] Request JSON:");
                Console.WriteLine(JsonSerializer.Serialize(req));

                var result = cashfree.PGCreateOrder(req, null, null, null);

                if (result?.Content is OrderEntity order)
                {
                    OrderResponse = order;

                    // Try both casings
                    OrderIdOut = order.GetType().GetProperty("OrderId")?.GetValue(order)?.ToString()
                                 ?? order.GetType().GetProperty("order_id")?.GetValue(order)?.ToString();

                    PaymentSessionIdOut = order.GetType().GetProperty("PaymentSessionId")?.GetValue(order)?.ToString()
                                          ?? order.GetType().GetProperty("payment_session_id")?.GetValue(order)?.ToString();

                    RawResponseJson = JsonSerializer.Serialize(order);

                    Console.WriteLine($"[CreateOrder] Success. order_id={OrderIdOut}, psid={PaymentSessionIdOut}");
                }
                else
                {
                    ErrorMessage = "Failed to create order. Invalid response from payment gateway.";
                    Console.WriteLine("[CreateOrder] Invalid response (null or unexpected)");
                }

                return Page();
            }
            catch (ApiException apiEx)
            {
                ErrorMessage = $"Cashfree API error: {apiEx.Message} (Status: {apiEx.ErrorCode})";
                Console.WriteLine($"[CreateOrder] API EX: {apiEx.Message}\n{apiEx.StackTrace}");
                return Page();
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error creating order: {ex.Message}";
                Console.WriteLine($"[CreateOrder] EX: {ex.Message}\n{ex.StackTrace}");
                return Page();
            }
        }
    }
}
