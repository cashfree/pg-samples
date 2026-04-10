import crypto from 'node:crypto';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');
const exampleEnvPath = path.join(__dirname, '.env.example');

if (fs.existsSync(envPath)) {
  dotenv.config({path: envPath});
} else if (fs.existsSync(exampleEnvPath)) {
  dotenv.config({path: exampleEnvPath});
  console.warn(
    'backend/.env was not found, so the server loaded backend/.env.example for local development.',
  );
}

const app = express();
const port = Number(process.env.PORT || 3000);
const cashfreeApiVersion = '2025-01-01';

app.use(cors());
app.use(express.json());

function getCredentials(environment) {
  if (environment === 'PRODUCTION') {
    return {
      appId: process.env.CASHFREE_APP_ID_PRODUCTION,
      secretKey: process.env.CASHFREE_SECRET_KEY_PRODUCTION,
      baseUrl: 'https://api.cashfree.com/pg',
    };
  }

  return {
    appId: process.env.CASHFREE_APP_ID_SANDBOX,
    secretKey: process.env.CASHFREE_SECRET_KEY_SANDBOX,
    baseUrl: 'https://sandbox.cashfree.com/pg',
  };
}

function assertCredentials(credentials) {
  if (!credentials.appId || !credentials.secretKey) {
    throw new Error(
      'Cashfree credentials are missing. Update backend/.env before starting payments.',
    );
  }
}

async function callCashfree(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.message || data?.type || 'Cashfree API request failed.';
    throw new Error(message);
  }

  return data;
}

app.get('/health', (_req, res) => {
  res.json({ok: true});
});

app.post('/api/cashfree/create-order', async (req, res) => {
  try {
    const {
      environment = 'SANDBOX',
      orderAmount,
      orderCurrency = 'INR',
      orderNote,
      customerName,
      customerEmail,
      customerPhone,
    } = req.body;

    const credentials = getCredentials(environment);
    assertCredentials(credentials);

    const customerId = `cust_${customerPhone}`;
    const orderId = `order_${Date.now()}`;

    const order = await callCashfree(`${credentials.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': cashfreeApiVersion,
        'x-client-id': credentials.appId,
        'x-client-secret': credentials.secretKey,
        'x-request-id': crypto.randomUUID(),
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: orderCurrency,
        order_note: orderNote,
        customer_details: {
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
      }),
    });

    res.json({
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      cfOrderId: order.cf_order_id,
      orderStatus: order.order_status,
    });
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : 'Unable to create Cashfree order.',
    });
  }
});

app.post('/api/cashfree/verify-order', async (req, res) => {
  try {
    const {orderId, environment = 'SANDBOX'} = req.body;

    if (!orderId) {
      res.status(400).json({message: 'orderId is required.'});
      return;
    }

    const credentials = getCredentials(environment);
    assertCredentials(credentials);

    const order = await callCashfree(`${credentials.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-api-version': cashfreeApiVersion,
        'x-client-id': credentials.appId,
        'x-client-secret': credentials.secretKey,
      },
    });

    res.json({
      orderId: order.order_id,
      orderStatus: order.order_status,
      paymentSessionId: order.payment_session_id,
    });
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : 'Unable to verify Cashfree order.',
    });
  }
});

app.listen(port, () => {
  console.log(`Cashfree backend listening on http://localhost:${port}`);
});
