// Load environment variables from .env file
require('dotenv').config();

const Koa = require('koa');
const Router = require('@koa/router');
const serve = require('koa-static');
const { koaBody } = require('koa-body');
const path = require('path');
const { Cashfree } = require('cashfree-pg');

const PORT = process.env.PORT || 3000; // server port
const XClientId = process.env.CASHFREE_CLIENT_ID;
const XClientSecret = process.env.CASHFREE_CLIENT_SECRET;

const cashfree = new Cashfree(Cashfree.SANDBOX, XClientId, XClientSecret);

const app = new Koa();
const router = new Router();

// Serve static files (e.g., pay.html)
app.use(serve(path.join(__dirname, 'public')));

app.use(koaBody({
    includeUnparsed: true // This preserves the raw body
}));

// API endpoint for creating an order
router.post('/api/create-order', async (ctx) => {
  const { customerId, customerPhone, customerEmail, orderAmount } = ctx.request.body;

  const notifyUrl = `http://localhost:${PORT}/webhook`

  // Create order request
  const request = {
    "order_amount": orderAmount,
    "order_currency": "INR",
    "order_id": `order_${Math.floor(Math.random() * 10000000000)}`, // create unique order id
    "customer_details": {
        "customer_id": customerId,
        "customer_phone": customerPhone,
        "customer_email": customerEmail,
    },
    "order_meta": {
        "notify_url": notifyUrl,
    }
  };

  try {
    const response = await cashfree.PGCreateOrder(request);
    ctx.body = {
      orderId: response.data.order_id,
      paymentSessionId: response.data.payment_session_id,
    };
  } catch (error) {
    console.error('Error creating order:', error.response?.data || error.message);
    ctx.status = 500;
    ctx.body = { error: 'Failed to create order' };
  }
});

// Get order details API endpoint
router.get('/api/get-order-status/:orderId', async (ctx) => {
  const orderId = ctx.params.orderId;
  if (!orderId) {
    ctx.status = 400;
    ctx.body = { error: "Order ID is required" };
    return;
  }

  try {
    const response = await cashfree.PGFetchOrder(orderId);
    
    // Return the complete order details including payment details
    ctx.body = {
      success: true,
      order: response.data
    };
  } catch (error) {
    console.error('Error fetching order status:', error.response?.data || error.message);
    ctx.status = 500;
    ctx.body = { 
      success: false,
      error: 'Failed to fetch order status',
      errorDetails: error.response?.data || error.message
    };
  }
});

// Use the router
app.use(router.routes()).use(router.allowedMethods());

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open https://localhost:${PORT}/pay.html in your browser`);
});