# 💳 Cashfree .NET 8 Sample App

This repository contains a sample **ASP.NET Core Web Application (Razor Pages)** that demonstrates how to integrate **Cashfree Payment Gateway** using the official [Cashfree .NET SDK (`cashfree_pg`)](https://www.nuget.org/packages/cashfree_pg).

---

## 🚀 Features

- ⚡ **ASP.NET Core Web App** targeting **.NET 8.0**  
- 📦 Uses **Cashfree PG SDK v5.0.6**  
- 📝 Demonstrates **order creation with customer details**  
- 🔐 Reads configuration (Client ID, Secret Key, Base URL) from `appsettings.json`  
- 🌍 Supports both **Sandbox** and **Production** environments
- ✅ **Payment Return URL** - Handles payment callbacks and displays payment status
- 📊 **Payment Details** - Fetches and displays payment ID, bank reference, payment mode, and completion time
- 🎨 **Beautiful UI** - Interactive payment status page with visual indicators (✅ Success, ❌ Failed, ⏳ Pending)  

---

## 📂 Project Structure

```bash
.
├── Cashfree_Project.csproj           # Project file
├── Pages/
│   ├── Index.cshtml                  # UI form for order creation
│   ├── Index.cshtml.cs               # Backend Razor Page logic for order creation
│   ├── Return.cshtml                 # Payment result display page
│   ├── Return.cshtml.cs              # Backend logic for payment status & details
├── appsettings.json                  # Cashfree API credentials & config
├── Properties/
│   └── launchSettings.json           # Dev environment config
└── README.md
⚙️ Dependencies

This project depends on:

✅ .NET 8.0 SDK

✅ Cashfree PG SDK (cashfree_pg v5.0.6)

Installed via NuGet:

<ItemGroup>
  <PackageReference Include="cashfree_pg" Version="5.0.6" />
</ItemGroup>

🔧 Configuration

Update the appsettings.json file with your own credentials:

"CashfreeConfig": {
  "ClientId": "YOUR_CLIENT_ID",
  "ClientSecret": "YOUR_CLIENT_SECRET",
  "BaseUrl": "https://sandbox.cashfree.com/pg"
}


🧪 Use https://sandbox.cashfree.com/pg for testing

🚀 Use https://api.cashfree.com/pg for production

## 💰 Payment Flow

1. **Create Order** - User fills in order details on the home page and clicks "Create Order"
2. **Payment Gateway** - Redirected to Cashfree payment gateway to complete payment
3. **Payment Complete** - After payment, user is redirected back to the return URL: `http://localhost:5080/return?order_id={order_id}`
4. **Display Results** - The return page fetches payment details from Cashfree API and displays:
   - ✅ Payment status (Success/Failed/Pending)
   - Order ID
   - Order Amount
   - Cashfree Payment ID (cf_payment_id)
   - Bank UTR Reference
   - Payment Mode (e.g., Wallet, Card, Net Banking, UPI)
   - Payment Completion Time

▶️ Running the Project

1️⃣ Ensure you have .NET 8 SDK installed:

```bash
dotnet --version
```
(Should return 8.x.x)

2️⃣ Clone this repository:

```bash
git clone https://github.com/yourusername/cashfree-dotnet-sample.git
cd cashfree-dotnet-sample
```

3️⃣ Restore dependencies:

```bash
dotnet restore
```

4️⃣ Run the app:

```bash
dotnet run
```

5️⃣ Navigate to:

```
http://localhost:5080
```

(or the port mentioned in launchSettings.json)

## 🧪 Testing

1. Navigate to `http://localhost:5080`
2. Fill in the order form with:
   - Order ID: Any unique ID
   - Order Amount: Amount in INR
   - Customer Name: Test name
   - Customer Email: test@gmail.com
   - Customer Phone: 9999999999
3. Click **"Create Order"**
4. You'll be redirected to Cashfree payment gateway
5. Complete the payment (Sandbox mode)
6. You'll be redirected to the return page showing:
   - Payment status with visual indicator
   - Complete payment details
   - Transaction information

## 🔌 API Integration

### Order Creation
- **Endpoint**: `Pages/Index.cshtml` (POST via form)
- **Method**: `OnPostCreateOrderAsync()`
- **Details**: Creates a new order with customer information and returns payment session ID

### Payment Fetching
- **Endpoint**: `Pages/Return.cshtml` (GET with order_id parameter)
- **Methods**: 
  - `PGFetchOrder()` - Fetches order details
  - `PGOrderFetchPayments()` - Fetches payment details for the order
- **Details**: Returns complete payment information including payment ID, bank reference, and payment mode

## 📚 API Reference

All methods use the **Cashfree SDK** (`cashfree_pg v5.0.6`):

| Method | Purpose |
|--------|---------|
| `PGCreateOrder()` | Create a new order |
| `PGFetchOrder()` | Get order status and details |
| `PGOrderFetchPayments()` | Get payment details for an order |

📖 Notes

🔐 **Security**
- Requires TLS 1.2 enabled for API calls
- Keep your ClientId and ClientSecret safe — do not commit them to public repos
- Use environment variables for sensitive configuration in production

⚠️ **Environment**
- In production, update BaseUrl to: `https://api.cashfree.com/pg`
- In sandbox mode, use: `https://sandbox.cashfree.com/pg`

🛠️ **Troubleshooting**
- If return URL is not being called, ensure your network allows callbacks
- Check appsettings.json contains valid Cashfree credentials
- Monitor console logs for detailed API response information
- Port 5080 should be accessible; modify in `launchSettings.json` if needed

📝 License

This sample is for demonstration purposes only.
For complete API reference, visit [Cashfree Docs](https://docs.cashfree.com/).
