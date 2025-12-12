using System;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Services;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

public partial class cashfree_Default : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
    }

    [WebMethod]
    public static string CreateOrder()
    {
        // 🔐 Force TLS 1.2 (required by Cashfree)
        System.Net.ServicePointManager.SecurityProtocol = (System.Net.SecurityProtocolType)3072;

        string url = "https://sandbox.cashfree.com/pg/orders";
        //string url = "https://api.cashfree.com/pg/orders";
        string orderId = "order_" + Guid.NewGuid().ToString();

        var body = new
        {
            order_id = orderId,
            order_amount = 499.00,
            order_currency = "INR",
            customer_details = new
            {
                customer_id = "CUST123",
                customer_email = "rahul@example.com",
                customer_phone = "9876543210",
                customer_name = "Rahul"
            },
            order_meta = new
            {
                return_url = "https://crfstudioz.com/cashfree/return.aspx?order_id=" + orderId,
                notify_url = "https://crfstudioz.com/webhook"
            }
        };

        string jsonBody = JsonConvert.SerializeObject(body);

        var request = (HttpWebRequest)WebRequest.Create(url);
        request.Method = "POST";
        request.ContentType = "application/json";
        request.Headers["x-api-version"] = "2025-01-01";
        // Use environment variables for credentials to avoid leaking secrets in source
        string clientId = Environment.GetEnvironmentVariable("CASHFREE_APP_ID") ?? "REPLACE_WITH_YOUR_CLIENT_ID";
        string clientSecret = Environment.GetEnvironmentVariable("CASHFREE_SECRET") ?? "REPLACE_WITH_YOUR_CLIENT_SECRET";
        request.Headers["x-client-id"] = clientId;
        request.Headers["x-client-secret"] = clientSecret;
        byte[] bytes = Encoding.UTF8.GetBytes(jsonBody);
        request.ContentLength = bytes.Length;

        using (var rs = request.GetRequestStream())
        {
            rs.Write(bytes, 0, bytes.Length);
        }

        string responseText;
        try
        {
            using (var resp = (HttpWebResponse)request.GetResponse())
            using (var sr = new StreamReader(resp.GetResponseStream()))
            {
                responseText = sr.ReadToEnd();
            }
        }
        catch (WebException ex)
        {
            using (var sr = new StreamReader(ex.Response.GetResponseStream()))
            {
                responseText = sr.ReadToEnd();
            }
        }

        JObject parsed = JObject.Parse(responseText);
        string sessionId = parsed["payment_session_id"] != null
            ? parsed["payment_session_id"].ToString()
            : null;

        return JsonConvert.SerializeObject(new
        {
            raw = parsed,
            payment_session_id = sessionId,
            order_id = orderId
        });
    }
}