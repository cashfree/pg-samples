# Cashfree Payment Integration with Koa

This project demonstrates how to integrate Cashfree Payment Gateway with a Node.js application built using the Koa framework.

## Description

This application showcases a complete payment flow using Cashfree's payment gateway, including:

- Creating payment orders
- Processing payments using the Cashfree SDK
- Handling payment callbacks and webhooks
- Displaying payment status and details

## Features

- Create payment orders with dynamic amounts and customer details
- Process payments using Cashfree's JavaScript SDK with modal checkout
- Display payment details after successful transactions
- Handle webhooks for payment status updates
- Verify payment status through server-side API calls

## Prerequisites

- Node.js (v12 or higher)
- npm or yarn
- Cashfree merchant account and API credentials

## Installation

```bash
# Clone the repository
git clone https://github.com/cashfree/pg-samples.git

# Navigate to the project directory
cd pg-samples/node/koa

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root with your Cashfree API credentials:

```
CASHFREE_CLIENT_ID=your_client_id
CASHFREE_CLIENT_SECRET=your_client_secret
```

## Usage

```bash
# Start the server
npm start
```

The server will be running at `http://localhost:3000` by default.

Open `http://localhost:3000/pay.html` in your browser to access the payment form.

## Payment Flow

1. Fill in customer details and amount in the payment form
2. Click "Pay Now" to create an order and initiate payment
3. Complete the payment in the Cashfree checkout modal
4. View payment status and details on the same page

## API Endpoints

- `POST /api/create-order` - Create a new payment order
- `GET /api/get-order-status/:orderId` - Get details of an existing order
