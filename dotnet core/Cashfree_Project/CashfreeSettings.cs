namespace Cashfree_Project.Config
{
    public class CashfreeSettings
    {
        public string ClientId { get; set; } = "";
        public string ClientSecret { get; set; } = "";
        public string BaseUrl { get; set; } = ""; // optional (we'll auto-pick env)
    }
}
