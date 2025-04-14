// Load environment variables from .env file
require("dotenv").config();

// Import required modules
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Cashfree, CFEnvironment } = require("cashfree-pg");

// Initialize the Express app
const app = express();
const PORT = 3000; // Define the port for the server

// Middleware for enabling CORS and parsing JSON requests
app.use(cors());
app.use(express.json());

// Serve the HTML file for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Initialize Cashfree SDK with environment and credentials
const cashfree = new Cashfree(
  CFEnvironment.SANDBOX, // Use sandbox environment
  process.env.APP_ID, // Cashfree App ID from environment variables
  process.env.SECRET_KEY // Cashfree Secret Key from environment variables
);

// API endpoint to create a new order
app.post("/api/create-order", async (req, res) => {
  try {
    // Define the order request payload
    const orderRequest = {
      order_amount: 1.01, // Order amount
      order_currency: "INR", // Currency
      order_id: "devstudio_" + Date.now(), // Generate a unique order ID
      customer_details: {
        customer_id: "devstudio_user", // Customer ID
        customer_phone: "8474090589", // Customer phone number
      },
      order_meta: {
        notify_url: "https://yourhost.com/order/webhooks", // Webhook URL for notifications
      },
    };

    // Create the order using Cashfree SDK
    const response = await cashfree.PGCreateOrder(orderRequest);
    res.json(response.data); // Send the response back to the client
  } catch (error) {
    // Handle errors and send a 500 response
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

// API endpoint to fetch order details
app.post("/api/get-order", async (req, res) => {
  try {
    const { order_id } = req.body; // Extract order ID from the request body
    const response = await cashfree.PGFetchOrder(order_id); // Fetch order details
    res.json(response.data); // Send the response back to the client
  } catch (error) {
    // Handle errors and send a 500 response
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

// Webhook endpoint to verify payment notifications
app.post("/order/webhooks", async (req, res) => {
  try {
    // Verify the webhook signature using Cashfree SDK
    const response = await cashfree.PGVerifyWebhookSignature(
      req.headers["x-webhook-signature"], // Webhook signature header
      JSON.stringify(req.body), // Webhook payload
      req.headers["x-webhook-timestamp"] // Webhook timestamp header
    );
    console.log(response); // Log the verification response
  } catch (e) {
    console.log(e); // Log any errors
  }
});

// Start the server and listen on the defined port
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
