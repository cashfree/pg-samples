# 💳 Cashfree .NET 8 Sample App

This repository contains a sample **ASP.NET Core Web Application (Razor Pages)** that demonstrates how to integrate **Cashfree Payment Gateway** using the official [Cashfree .NET SDK (`cashfree_pg`)](https://www.nuget.org/packages/cashfree_pg).

---

## 🚀 Features

- ⚡ **ASP.NET Core Web App** targeting **.NET 8.0**  
- 📦 Uses **Cashfree PG SDK v5.0.6**  
- 📝 Demonstrates **order creation with customer details**  
- 🔐 Reads configuration (Client ID, Secret Key, Base URL) from `appsettings.json`  
- 🌍 Supports both **Sandbox** and **Production** environments  

---

## 📂 Project Structure

```bash
.
├── Cashfree_Project.csproj       # Project file
├── Pages/
│   ├── Index.cshtml              # UI form for order creation
│   ├── Index.cshtml.cs           # Backend Razor Page logic
├── appsettings.json              # Cashfree API credentials & config
├── Properties/
│   └── launchSettings.json       # Dev environment config
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

▶️ Running the Project

1️⃣ Ensure you have .NET 8 SDK installed:

dotnet --version


(Should return 8.x.x)

2️⃣ Clone this repository:

git clone https://github.com/yourusername/cashfree-dotnet-sample.git
cd cashfree-dotnet-sample


3️⃣ Restore dependencies:

dotnet restore


4️⃣ Run the app:

dotnet run


5️⃣ Navigate to:

http://localhost:5080


(or the port mentioned in launchSettings.json)

📖 Notes

🔐 Requires TLS 1.2 enabled for API calls

⚠️ Keep your ClientId and ClientSecret safe — do not commit them to public repos

🌍 In production, update BaseUrl to:

https://api.cashfree.com/pg

📝 License

This sample is for demonstration purposes only.
For complete API reference, visit Cashfree Docs
.
