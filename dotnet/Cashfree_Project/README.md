Cashfree .NET 8 Sample App

This repository contains a sample ASP.NET Core Web Application (Razor Pages) that demonstrates how to integrate Cashfree Payment Gateway using the official Cashfree .NET SDK (cashfree_pg)
.

🚀 Features

ASP.NET Core Web App targeting .NET 8.0

Uses Cashfree PG SDK v5.0.6

Demonstrates order creation with customer details

Reads configuration (App ID, Secret Key, URLs) from appsettings.json

Supports both Sandbox and Production environments

📂 Project Structure
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

.NET 8.0 SDK

Cashfree PG SDK (cashfree_pg v5.0.6)

Installed automatically via NuGet:

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


Use https://sandbox.cashfree.com/pg for testing

Use https://api.cashfree.com/pg for production

▶️ Running the Project

Ensure you have .NET 8 SDK installed:

dotnet --version


(Should be 8.x.x)

Clone this repository:

git clone https://github.com/yourusername/cashfree-dotnet-sample.git
cd cashfree-dotnet-sample


Restore dependencies:

dotnet restore


Run the app:

dotnet run


Navigate to:

http://localhost:5080


(or the port mentioned in launchSettings.json)

📖 Notes

Requires TLS 1.2 enabled for API calls.

Keep your ClientId and ClientSecret safe and do not commit them to public repos.

In production, update BaseUrl to https://api.cashfree.com/pg.

📝 License

This sample is for demonstration purposes. Refer to Cashfree Docs
 for complete API reference.
