# Gin-Go Payment Integration

This is a sample project demonstrating a payment integration using the Gin framework in Go and the Cashfree Payment Gateway.

## Features

- **Frontend**: A simple HTML page to display a dummy product with a "Buy Now" button.
- **Backend**: 
  - Create an order and generate a payment session ID using the Cashfree SDK.
  - Fetch order status and display it on a status page.
  - Webhook support for payment updates.

## Prerequisites

- Go 1.18 or later
- Cashfree account for API credentials
- [Postman](https://www.postman.com/) or `curl` for testing API endpoints

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gin
2. Install dependencies:
    go mod tidy
3. Create a .env file in the root directory with the following content:
    CASHFREE_CLIENT_ID="your_client_id"
    CASHFREE_CLIENT_SECRET="your_client_secret"
4. Run the application:
    go run cmd/main.go
5. Open your browser and navigate to http://localhost:8080.

## API Endpoints
1. GET /
Serves the index.html page with a dummy product.

2. POST /create-order
Creates an order and returns a payment session ID.

3. GET /status
Fetches the order status and displays it on the status.html page.

4. POST /webhook
Handles webhook notifications from Cashfree.

## Testing

Use Postman or curl to test the /create-order and /status endpoints.
Simulate a payment flow using the Cashfree sandbox environment.

## Cashfree Integration
This project uses the Cashfree Go SDK for payment gateway integration. Ensure you have valid credentials and use the sandbox environment for testing.
