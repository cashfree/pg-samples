# Nuxtjs Cashfree Payment Sample

This sample app demonstrates how to collect payments using the Cashfree JavaScript and Node.js SDKs with a popup checkout. It is built using Nuxtjs and includes both client-side code and server-side API endpoints.

## Table of Contents

- [Nuxt Cashfree Payment Sample](#nuxt-cashfree-payment-sample)
	- [Table of Contents](#table-of-contents)
	- [Prerequisites](#prerequisites)
	- [Setup](#setup)
	- [Configuration](#configuration)
	- [Running the App](#running-the-app)
	- [How It Works](#how-it-works)
	- [Troubleshooting](#troubleshooting)
	- [Further Reading](#further-reading)

## Prerequisites

- Node.js (v14 or later)
- npm

## Setup

1. **Clone the repository and navigate to the project folder:**

   ```bash
   git clone https://github.com/cashfree/pg-samples.git
   cd web/nuxt
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

## Configuration

1. **Environment Variables:**

   Create a .env file

   ```bash
   touch .env
   ```

   Open the .env file and set the following environment variables with your Cashfree credentials:

   ```
   CASHFREE_PG_APP_ID=your_cashfree_app_id
   CASHFREE_PG_SECRET_KEY=your_cashfree_secret_key
   ```

## Running the App

1. **Development Mode:**

   Use the following command to start the development server:

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).

2. **Building and Previewing:**

   To build the app:

   ```bash
   npm run build
   ```

   And to preview the production build:

   ```bash
   npm run preview
   ```

## How It Works

- **Checkout Flow:**

  1. On the client-side, the [app.vue](https://github.com/cashfree/pg-samples/blob/main/web/nuxt/app.vue) file loads Cashfree js sdk via cdn.
  2. When a user initiates a payment (for example, by clicking a button), the app sends a POST request to the `/api/payments` endpoint. This endpoint is implemented in [payment.ts](<[http://_vscodecontentref_/3](https://github.com/cashfree/pg-samples/blob/main/web/nuxt/server/api/payment.ts)>).
  3. The server endpoint in [payment.ts](<[http://_vscodecontentref_/4](https://github.com/cashfree/pg-samples/blob/main/web/nuxt/server/api/payment.ts)>) uses the Cashfree Node.js SDK to create an order and initiate a payment session.
  4. After the order is created, the client calls `cashfree.checkout` with the provided `paymentSessionId`. The checkout is rendered as a popup.
  5. Once payment is completed, the client-side code verifies the payment status by sending a GET request to the same `/api/verifyPayment` endpoint to check the order status.

- **Server-Side Integration:**

  - The file [cashfree.ts](https://github.com/cashfree/pg-samples/blob/main/web/nuxt/server/api/payment.ts) is where the Cashfree SDK is initialized. It loads environment variables from the .env file and exposes two functions:
    - [CreateOrder](https://github.com/cashfree/pg-samples/blob/main/web/nuxt/server/payment.ts) – To create a new order.
    - [CheckOrderStatus](https://github.com/cashfree/pg-samples/blob/main/web/nuxt/server/verifyPayment.ts) – To check the order status using the order ID.

## Troubleshooting

- **Environment Variables:**
  - Ensure that your environment variables in .env are correctly set. If not, the SDK will not initialize properly.
- **API Endpoint Issues:**

  - Check the [network tab](https://developer.mozilla.org/en-US/docs/Tools/Network_Monitor) of your browser's developer tools to ensure the API requests to `/api/order` are succeeding.
  - Look at the Nuxtjs app logs in the integrated terminal for any errors.

- **Popup Checkout:**
  - If the Cashfree popup checkout does not appear, verify that the `cashfree.checkout` call in [CreateButton.vue](https://github.com/cashfree/pg-samples/blob/main/web/nuxt/components/CreateButton.vue) is receiving a valid `paymentSessionId` from the server.

## Further Reading

- [Nuxt Documentation](https://nuxt.com/)
- [Cashfree Payments Documentation](https://docs.cashfree.com)
- [Cashfree Node.js SDK on npm](https://www.npmjs.com/package/cashfree-pg)
- [Cashfree JS SDK on npm](https://www.npmjs.com/package/@cashfreepayments/cashfree-js)
