
# Cashfree Payment Gateway Integration with Echo Framework

This repository demonstrates the integration of the Cashfree Payment Gateway with the Echo framework in Go. It includes endpoints for creating orders, handling webhooks, and displaying product and status pages.

## Features

- **Product Page**: Displays a product with a "Buy Now" button.
- **Order Creation**: Creates an order using the Cashfree Payment Gateway API.
- **Popup Checkout**: Opens a Cashfree payment popup for seamless payment.
- **Webhook Handling**: Listens for payment status updates via webhooks.
- **Status Page**: Displays the payment status and order details.

## Prerequisites

- Go 1.18 or later
- Cashfree account credentials
- `.env` file with the following variables:
  ```plaintext
  CASHFREE_CLIENT_ID="your-client-id"
  CASHFREE_CLIENT_SECRET="your-client-secret"
  ```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```

2. Install dependencies:
   ```bash
   go mod tidy
   ```

3. Create a `.env` file in the root directory and add your Cashfree credentials:
   ```plaintext
   CASHFREE_CLIENT_ID="your-client-id"
   CASHFREE_CLIENT_SECRET="your-client-secret"
   ```

4. Run the application:
   ```bash
   go run cmd/main.go
   ```

## Endpoints

### 1. Product Page
- **URL**: `/product`
- **Method**: `GET`
- **Description**: Displays the product page with a "Buy Now" button.

### 2. Create Order
- **URL**: `/create-order`
- **Method**: `POST`
- **Description**: Creates an order and returns a payment session ID.

### 3. Status Page
- **URL**: `/status`
- **Method**: `GET`
- **Description**: Displays the payment status and order details.
- **Query Parameters**:
  - `order_id`: The ID of the order.

### 4. Webhook
- **URL**: `/webhook`
- **Method**: `POST`
- **Description**: Handles payment status updates from Cashfree.

## Project Structure

```
.
├── cmd/
│   └── main.go          # Entry point of the application
├── internal/
│   └── handlers/
│       └── handler.go   # Contains all route handlers
├── templates/
│   ├── product.html     # Product page template
│   ├── status.html      # Status page template
├── .env                 # Environment variables (not tracked in Git)
├── .gitignore           # Git ignore file
├── go.mod               # Go module file
├── go.sum               # Go dependencies
└── README.md            # Project documentation
```

## How It Works

1. **Product Page**: The user visits the `/product` endpoint to view the product and click "Buy Now."
2. **Order Creation**: The `/create-order` endpoint creates an order and initializes the Cashfree payment popup.
3. **Payment Popup**: The Cashfree JS SDK opens a popup for the user to complete the payment.
4. **Webhook**: Cashfree sends a webhook notification to `/webhook` when the payment status changes.
5. **Status Page**: The user is redirected to `/status` to view the payment status and order details.

## Dependencies

- [Echo](https://github.com/labstack/echo): Web framework for Go.
- [godotenv](https://github.com/joho/godotenv): Loads environment variables from a `.env` file.
- [Cashfree SDK](https://github.com/cashfree/cashfree-pg-sdk-go): Cashfree Payment Gateway SDK for Go.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Cashfree Payments](https://www.cashfree.com/)
- [Echo Framework](https://echo.labstack.com/)
```

This README.md provides a comprehensive overview of the project, including setup instructions, endpoints, and how the application works.