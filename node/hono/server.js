// Import required packages and modules
import { Hono } from "hono"; // Lightweight web framework for building APIs
import { serve } from "@hono/node-server"; // Server adapter for Node.js
import { cors } from "hono/cors"; // CORS middleware for handling cross-origin requests
import { config } from "dotenv"; // For loading environment variables from .env file
import { Cashfree, CFEnvironment } from "cashfree-pg"; // Cashfree Payment Gateway SDK
import { readFileSync } from "fs"; // For reading static HTML file
import { join } from "path"; // For handling file paths
import { fileURLToPath } from "url"; // For converting file URL to path
import { dirname } from "path"; // For getting directory name from file path

// Load environment variables from .env file
config();

// Initialize Hono app
const app = new Hono();

// Enable CORS for all routes to allow cross-origin requests
app.use("*", cors());

// Get directory name for the current module (ES module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Route handler for root path - serves the HTML interface
app.get("/", (c) => {
  const html = readFileSync(join(__dirname, "index.html"), "utf8"); // Read the HTML file
  return c.html(html); // Return the HTML content as a response
});

// Initialize Cashfree SDK with environment and credentials from .env
// CFEnvironment.SANDBOX is for testing, use CFEnvironment.PRODUCTION for live environment
const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.APP_ID, // Application ID from .env
  process.env.SECRET_KEY // Secret Key from .env
);

/**
 * API endpoint to create a new payment order
 * This is called when the user clicks the "Buy Now" button
 */
app.post("/api/create-order", async (c) => {
  try {
    // Define order details
    const orderRequest = {
      order_amount: 1.01, // Amount to be charged
      order_currency: "INR", // Currency code
      order_id: "devstudio_" + Date.now(), // Unique order ID (using timestamp)
      customer_details: {
        customer_id: "devstudio_user", // Unique ID for the customer
        customer_phone: "8474090589", // Customer's phone number
      },
      order_meta: {
        notify_url: "https://yourhost.com/order/webhooks", // Webhook URL for payment notifications
      },
    };

    // Call Cashfree API to create an order
    const response = await cashfree.PGCreateOrder(orderRequest);
    return c.json(response.data); // Return the response data as JSON
  } catch (error) {
    // Handle any errors during order creation
    return c.json({ error: "Something went wrong" }, 500);
  }
});

/**
 * API endpoint to fetch payment order details
 * Used to verify the status of a payment after checkout
 */
app.post("/api/get-order", async (c) => {
  try {
    // Get order_id from request body
    const reqBody = await c.req.json();
    const { order_id } = reqBody;

    // Call Cashfree API to get order details
    const response = await cashfree.PGFetchOrder(order_id);
    return c.json(response.data); // Return the response data as JSON
  } catch (error) {
    // Handle any errors while fetching order details
    return c.json({ error: "Something went wrong" }, 500);
  }
});

/**
 * Webhook handler for payment notifications from Cashfree
 * This endpoint receives real-time updates about payment status changes
 */
app.post("/order/webhooks", async (c) => {
  try {
    // Get the webhook data from request body
    const reqBody = await c.req.json();

    // Verify the authenticity of webhook using signature validation
    const response = await cashfree.PGVerifyWebhookSignature(
      c.req.header("x-webhook-signature"), // Webhook signature header
      JSON.stringify(reqBody), // Webhook payload
      c.req.header("x-webhook-timestamp") // Webhook timestamp header
    );
    console.log(response); // Log the verification response
  } catch (e) {
    // Log any errors during webhook processing
    console.log(e);
  }
});

// Start the server on port 3000
serve({
  fetch: app.fetch, // Hono app fetch handler
  port: 3000, // Port number
});

console.log(`Server running at http://localhost:3000`); // Log server start message
