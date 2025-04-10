# Next.js Cashfree Payment Integration

This project demonstrates how to integrate Cashfree Payments into a Next.js application using the Cashfree JavaScript SDK and Node.js SDK. It provides a complete payment flow with a user-friendly checkout experience.

## Table of Contents

-   [Next.js Cashfree Payment Integration](#nextjs-cashfree-payment-integration)
    -   [Table of Contents](#table-of-contents)
    -   [Features](#features)
    -   [Project Structure](#project-structure)
    -   [Prerequisites](#prerequisites)
    -   [Setup](#setup)
    -   [Configuration](#configuration)
    -   [Running the App](#running-the-app)
    -   [How It Works](#how-it-works)
        -   [Client-Side Integration](#client-side-integration)
        -   [Server-Side Integration](#server-side-integration)
        -   [Payment Flow](#payment-flow)
    -   [Troubleshooting](#troubleshooting)
    -   [Further Reading](#further-reading)

## Features

-   Clean, responsive UI built with Next.js and TailwindCSS
-   Complete payment flow from product selection to payment confirmation
-   Integration with Cashfree Payments' JavaScript and Node.js SDKs
-   Modal popup checkout experience
-   Payment verification and status handling
-   Error handling and feedback to the user

## Project Structure

The project follows a standard Next.js App Router structure with key files:

```
web/next/
├── app/                          # App router directory
│   ├── api/                      # API routes
│   │   ├── create-order/         # API endpoint to create a payment order
│   │   └── verify-payment/       # API endpoint to verify payment status
│   ├── payment/                  # Payment-related pages
│   │   └── status/               # Payment status page
│   └── page.js                   # Main app page
├── components/                   # React components
│   ├── PaymentForm.js            # Form for initiating payment
│   └── PaymentStatus.js          # Component for displaying payment status
├── public/                       # Static assets
├── .env.local                    # Environment variables (you need to create this)
└── next.config.mjs               # Next.js configuration
```

## Prerequisites

-   Node.js (v16 or later)
-   npm or yarn
-   Cashfree account with API credentials

## Setup

1. **Clone the repository and navigate to the project folder:**

    ```bash
    git clone https://github.com/cashfree/pg-samples.git
    cd web/next
    ```

2. **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

## Configuration

1. **Environment Variables:**
   Create a `.env.local` file in the root directory with your Cashfree credentials:
    ```
    CASHFREE_CLIENT_ID=your_cashfree_app_id
    CASHFREE_CLIENT_SECRET=your_cashfree_secret_key
    NEXT_PUBLIC_BASE_URL=http://localhost:3000
    ```

## Running the App

1. **Development Mode:**

    ```bash
    npm run dev
    # or
    yarn dev
    ```

    The app will be available at [http://localhost:3000](http://localhost:3000).

2. **Building for Production:**
    ```bash
    npm run build
    npm start
    # or
    yarn build
    yarn start
    ```

## How It Works

### Client-Side Integration

1. **Initialize Cashfree JS SDK:**
   The `PaymentForm.js` component uses the `@cashfreepayments/cashfree-js` library to initialize the Cashfree SDK in the client's browser:

    ```javascript
    const { load } = await import("@cashfreepayments/cashfree-js");
    const cashfreeInstance = await load({
        mode: "sandbox", // Use 'production' for live environment
    });
    ```

2. **Create Order and Open Checkout:**
   When a user clicks on the "Buy Now" button, the app:

    - Sends a POST request to the `/api/create-order` endpoint with order details
    - Receives a payment session ID in the response
    - Uses the Cashfree SDK to open the checkout modal:

    ```javascript
    cashfree
        .checkout({
            paymentSessionId: orderData.data.payment_session_id,
            redirectTarget: "_modal", // Opens checkout as a modal popup
        })
        .then(async function (data) {
            // Handle payment completion or errors
        });
    ```

### Server-Side Integration

1. **Create Order API:**
   The `/api/create-order/route.js` endpoint:

    - Initializes the Cashfree SDK with your credentials
    - Creates an order with the specified amount and customer details
    - Returns the order details including the payment session ID:

    ```javascript
    const cashfree = new Cashfree(
        Cashfree.SANDBOX,
        process.env.CASHFREE_CLIENT_ID,
        process.env.CASHFREE_CLIENT_SECRET
    );

    const response = await cashfree.PGCreateOrder(orderRequest);
    ```

2. **Verify Payment API:**
   The `/api/verify-payment/route.js` endpoint:
    - Takes an order ID and verifies its payment status
    - Returns the payment details and status

### Payment Flow

1. User selects product details and quantity
2. User clicks "Buy Now" to initiate payment
3. App creates an order through the server API
4. User completes payment in the Cashfree modal popup
5. App verifies payment status after completion
6. User sees payment confirmation or error message

## Troubleshooting

-   **Environment Variables:**

    -   Make sure your `.env.local` file contains the correct API credentials
    -   For production, change the mode from 'sandbox' to 'production'

-   **API Errors:**

    -   Check browser console and network tab for error details
    -   Verify that the order creation API is returning a valid payment session ID

-   **Popup Checkout Issues:**
    -   Some browsers might block popups; check browser settings
    -   Ensure the cashfree.checkout call receives a valid payment session ID

## Further Reading

-   [Next.js Documentation](https://nextjs.org/docs)
-   [Cashfree Payments Documentation](https://docs.cashfree.com)
-   [Cashfree JS SDK on npm](https://www.npmjs.com/package/@cashfreepayments/cashfree-js)
-   [Cashfree Node.js SDK on npm](https://www.npmjs.com/package/cashfree-pg)
