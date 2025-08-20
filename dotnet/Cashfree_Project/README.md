# Cashfree .NET Sample App

This sample demonstrates integration of the Cashfree Payment Gateway using the official .NET SDK.

## Setup

1. Clone this repository and navigate to the `dotnet/cashfree-dotnet-sample` directory.
2. Restore dependencies:
   ```sh
   dotnet restore
   ```
3. Update `appsettings.json` with your Cashfree credentials:
   ```json
   "Cashfree": {
     "appId": "<YOUR_CASHFREE_APP_ID>",
     "secretKey": "<YOUR_CASHFREE_SECRET_KEY>"
   }
   ```
4. Run the app:
   ```sh
   dotnet run
   ```

## Features

- Create order form
- Cashfree SDK integration

## Notes

- Replace credential placeholders before running.
- For production, use secure storage for secrets.
