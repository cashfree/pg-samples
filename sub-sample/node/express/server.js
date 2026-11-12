require('dotenv').config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const fs = require("node:fs/promises");
const productionTestProduct = require('./production-test-product');
const app = express();
const PORT = process.env.PORT || 4000;
const APP_BASE_URL = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';
if (!['sandbox', 'production'].includes(CASHFREE_ENV)) throw new Error('CASHFREE_ENV must be sandbox or production');
if (CASHFREE_ENV === 'production' && (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET || !APP_BASE_URL.startsWith('https://'))) {
  throw new Error('Production requires CASHFREE_APP_ID, CASHFREE_SECRET and an HTTPS APP_BASE_URL');
}
const CASHFREE_API_URL = CASHFREE_ENV === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
const RETURN_LOG_PATH = process.env.RETURN_LOG_PATH || path.join(__dirname, 'logs', 'return-events.jsonl');
// Middleware
app.use(cors());
const captureRawBody = (req, res, buffer) => { req.rawBody = buffer.toString('utf8'); };
app.use(express.json({ verify: captureRawBody }));
app.use(express.urlencoded({ extended: false, verify: captureRawBody })); // Cashfree returns form POSTs
// Environment variables
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '11123595750e973ecc95c94ec5532111';
const CASHFREE_SECRET = process.env.CASHFREE_SECRET || 'TEST307e06bddd583cc3f86edf02f410fa8a69653d7d';
// Plan mapping
const PLANS = {
  basic: "Basic_Day_Plan",
  standard: "Standard_Monthly_Plan",
  premium: "Premium_Yearly_Plan"
};
app.get('/api/config', (req, res) => {
  res.set('Cache-Control', 'no-store').json({
    mode: CASHFREE_ENV,
    productionTest: CASHFREE_ENV === 'production' ? productionTestProduct() : null
  });
});
// Subscription creation endpoint
app.post("/api/subscribe", async (req, res) => {
  const { plan } = req.body || {};
  const isProductionTest = plan === 'production_test' && CASHFREE_ENV === 'production';
  if (!isProductionTest && !Object.hasOwn(PLANS, plan)) {
    return res.status(400).json({
      message: "Invalid plan selected",
      validPlans: [...Object.keys(PLANS), ...(CASHFREE_ENV === 'production' ? ['production_test'] : [])]
    });
  }
  try {
    const subscriptionId = `Sub_${Date.now()}`;
    const chargeDate = new Date();
    chargeDate.setUTCDate(chargeDate.getUTCDate() + 3);
    chargeDate.setUTCHours(10, 0, 0, 0);
    const isoFormatted = chargeDate.toISOString().split('.')[0] + "Z";
    const requestBody = {
      subscription_id: subscriptionId,
      customer_details: {
        customer_email: "r.rahul@cashfree.com",
        customer_phone: "9998887765",
        customer_name: "Rahul Raman"
      },
      plan_details: {
        plan_id: PLANS[plan]
      },
      authorization_details: {
        authorization_amount: 1,
        authorization_amount_refund: false
      },
      subscription_meta: {
        return_url: `${APP_BASE_URL}/return?subscription_id=${encodeURIComponent(subscriptionId)}`,
        notification_channel: ["EMAIL", "SMS"]
      },
      subscription_first_charge_time: isoFormatted,
      subscription_note: "Test subscription created via API"
    };
    if (isProductionTest) {
      Object.assign(requestBody, productionTestProduct());
      requestBody.subscription_note = 'Production one-cycle test: INR 1 authorization plus one INR 1 debit';
    }
    const curlCommand = `curl --request POST \\
  --url ${CASHFREE_API_URL}/subscriptions \\
  --header 'Content-Type: application/json' \\
  --header 'x-api-version: 2025-01-01' \\
  --header 'x-client-id: <CASHFREE_APP_ID>' \\
  --header 'x-client-secret: <CASHFREE_SECRET>' \\
  --data '${JSON.stringify(requestBody)}'`;
    const response = await axios.post(
      `${CASHFREE_API_URL}/subscriptions`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2025-01-01",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET
        },
        timeout: 15000
      }
    );
    res.json({
      message: "Subscription created successfully!",
      data: response.data,
      curl: curlCommand
    });
  } catch (error) {
    console.error("Cashfree API Error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Subscription creation failed",
      error: error.response?.data || error.message
    });
  }
});
// The redirect payload is not proof of payment. Fetch the status from Cashfree.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function returnPage(title, message, details = null, received = null) {
  return `<!DOCTYPE html>
  <html lang="en"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Subscription Return</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f5f7fa; color: #333; padding: 24px; }
      main { max-width: 800px; margin: 24px auto; background: white; padding: 28px; border-radius: 12px; }
      pre { background: #edf2f7; padding: 16px; overflow: auto; }
      a { color: #174ea6; }
    </style>
  </head><body><main>
    <h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>
    ${details ? `<h2>Verified subscription details</h2><pre>${escapeHtml(JSON.stringify(details, null, 2))}</pre>` : ''}
    ${received ? `<h2>Received return parameters</h2>
      <p>These are the parameters received on this request. Subscription status is verified separately above.</p>
      <h3>POST body</h3><pre>${escapeHtml(JSON.stringify(received.body, null, 2))}</pre>
      <h3>URL query parameters</h3><pre>${escapeHtml(JSON.stringify(received.query, null, 2))}</pre>` : ''}
    <p><a href="/">Back to subscription plans</a></p>
  </main></body></html>`;
}

app.route('/return').get(handleReturn).post(handleReturn);

async function handleReturn(req, res) {
  res.set('Cache-Control', 'no-store');
  const received = { body: req.body || {}, query: req.query };
  if (req.method === 'POST') {
    try {
      await fs.mkdir(path.dirname(RETURN_LOG_PATH), { recursive: true, mode: 0o700 });
      await fs.appendFile(RETURN_LOG_PATH, JSON.stringify({
        received_at: new Date().toISOString(),
        content_type: req.get('content-type') || '',
        ...received,
        raw_body: req.rawBody || ''
      }) + '\n', { mode: 0o600 });
    } catch (error) {
      console.error('Could not save return POST:', error.message);
      return res.status(500).send(returnPage('Return received but could not be saved',
        'Check the local return log directory permissions.', null, received));
    }
  }
  const render = (title, message, details = null) => returnPage(title, message, details, received);
  const data = req.method === 'POST' ? (req.body || {}) : req.query;
  const subscriptionId = data.subscription_id || data.subscriptionId ||
    data.cf_subscriptionId || req.query.subscription_id;
  if (!subscriptionId) {
    return res.send(render('Subscription return URL is ready',
      'No subscription was provided. Complete checkout to see the verified subscription status here.'));
  }
  if (typeof subscriptionId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(subscriptionId)) {
    return res.status(400).send(render('Invalid subscription ID',
      'The return URL must contain a valid subscription ID.'));
  }
  try {
    const response = await axios.get(
      `${CASHFREE_API_URL}/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        headers: {
          'x-api-version': '2025-01-01',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET
        },
        timeout: 15000
      }
    );
    const status = response.data.subscription_status || 'UNKNOWN';
    return res.send(render('Subscription status',
      `Subscription ${subscriptionId}: ${status}. Status fetched directly from Cashfree.`, {
        subscription_id: response.data.subscription_id || subscriptionId,
        subscription_status: status,
        authorization_status: response.data.authorization_details?.authorization_status || 'UNKNOWN'
      }));
  } catch (error) {
    const notFound = error.response?.status === 404;
    return res.status(notFound ? 404 : 502).send(render(
      notFound ? 'Subscription not found' : 'Unable to verify subscription',
      notFound ? 'Cashfree could not find this subscription.' :
        'The subscription status could not be fetched from Cashfree. Check the configured credentials and connection, then refresh this page.'));
  }
}
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
