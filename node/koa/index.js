// Load environment variables from .env file
require("dotenv").config();

const Koa = require("koa"); // Koa framework for building the server
const Router = require("@koa/router"); // Router for handling routes
const serve = require("koa-static"); // Middleware for serving static files
const { koaBody } = require("koa-body"); // Middleware for parsing request bodies
const path = require("path"); // Utility for handling file paths
const { Cashfree } = require("cashfree-pg"); // Cashfree SDK for payment integration

// Server configuration
const PORT = process.env.PORT || 3000; // Server port
const XClientId = process.env.CASHFREE_CLIENT_ID; // Cashfree client ID
const XClientSecret = process.env.CASHFREE_CLIENT_SECRET; // Cashfree client secret

// Initialize Cashfree SDK
const cashfree = new Cashfree(Cashfree.SANDBOX, XClientId, XClientSecret);

const app = new Koa(); // Create a new Koa application
const router = new Router(); // Create a new router

// Serve static files (e.g., pay.html)
app.use(serve(path.join(__dirname, "public")));

// Middleware to parse request bodies
app.use(
  koaBody({
    includeUnparsed: true, // This preserves the raw body
  })
);

// API endpoint for creating an order
router.post("/api/create-order", async (ctx) => {
  // Extract customer and order details from the request body
  const { customerId, customerPhone, customerEmail, orderAmount } = ctx.request.body;

  const notifyUrl = `http://localhost:${PORT}/webhook`; // Notification URL for payment updates

  // Create order request payload
  const request = {
    order_amount: orderAmount,
    order_currency: "INR",
    order_id: `order_${Math.floor(Math.random() * 10000000000)}`, // Generate a unique order ID
    customer_details: {
      customer_id: customerId,
      customer_phone: customerPhone,
      customer_email: customerEmail,
    },
    order_meta: {
      notify_url: notifyUrl,
    },
  };

  try {
    // Call Cashfree API to create an order
    const response = await cashfree.PGCreateOrder(request);
    ctx.body = {
      orderId: response.data.order_id, // Return the order ID
      paymentSessionId: response.data.payment_session_id, // Return the payment session ID
    };
  } catch (error) {
    // Handle errors during order creation
    console.error("Error creating order:", error.response?.data || error.message);
    ctx.status = 500;
    ctx.body = { error: "Failed to create order" };
  }
});

// API endpoint to fetch order details
router.get("/api/get-order-status/:orderId", async (ctx) => {
  const orderId = ctx.params.orderId; // Extract order ID from the request parameters
  if (!orderId) {
    ctx.status = 400; // Bad request if order ID is missing
    ctx.body = { error: "Order ID is required" };
    return;
  }

  try {
    // Call Cashfree API to fetch order details
    const response = await cashfree.PGFetchOrder(orderId);

    // Return the complete order details including payment details
    ctx.body = {
      success: true,
      order: response.data,
    };
  } catch (error) {
    // Handle errors during fetching order details
    console.error("Error fetching order status:", error.response?.data || error.message);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: "Failed to fetch order status",
      errorDetails: error.response?.data || error.message,
    };
  }
});

// Use the router for handling routes
app.use(router.routes()).use(router.allowedMethods());

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open https://localhost:${PORT}/pay.html in your browser`);
});
