// Importing necessary modules from the Cashfree Payment Gateway SDK
// and Nuxt.js event handler utilities
import { Cashfree, CFEnvironment } from "cashfree-pg";

// Define an event handler for processing payment requests
export default defineEventHandler(async (event) => {
  // Access runtime configuration for client ID and secret
  const config = useRuntimeConfig();

  // Initialize Cashfree instance with sandbox environment and credentials
  const cashfree = new Cashfree(CFEnvironment.SANDBOX, config.clientId, config.clientSecret);

  // Read the request body from the incoming event
  const body = await readBody(event);

  // Construct the payment order request object
  var request = {
    order_amount: body.amount, // Amount to be paid
    order_currency: body.currency, // Currency of the payment
    customer_details: {
      customer_id: "walterwNrcMi", // Unique customer ID
      customer_phone: "9999999999", // Customer's phone number
    },
    order_meta: {
      return_url: "https://www.cashfree.com/devstudio/preview/pg/web/checkout?order_id={order_id}", // URL to redirect after payment
      notify_url: "https://webhook.site/78066a24-b4a2-491d-9083-b47520a288e1", // Webhook URL for payment notifications
    },
  };

  // Send the payment order request to Cashfree and return the response
  const response = await cashfree.PGCreateOrder(request);
  return response.data;
});
