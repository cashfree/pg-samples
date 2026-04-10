import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const config = {
  port: Number(process.env.PORT || 8090),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://127.0.0.1:8090",
  cashfreeEnv: (process.env.CASHFREE_ENV || "sandbox").toLowerCase(),
  cashfreeApiVersion: process.env.CASHFREE_API_VERSION || "2025-01-01",
  cashfreeClientId: process.env.CASHFREE_CLIENT_ID || "",
  cashfreeClientSecret: process.env.CASHFREE_CLIENT_SECRET || "",
  defaultOrderAmount: Number(process.env.DEFAULT_ORDER_AMOUNT || 1.0),
  defaultOrderCurrency: process.env.DEFAULT_ORDER_CURRENCY || "INR"
};

const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
let sdkCache = {
  body: null,
  fetchedAt: 0,
  contentType: "text/javascript; charset=utf-8"
};

const hasValidCredentials = () => {
  const id = config.cashfreeClientId.trim();
  const secret = config.cashfreeClientSecret.trim();
  if (!id || !secret) return false;
  if (id.toUpperCase().includes("REPLACE_ME")) return false;
  if (secret.toUpperCase().includes("REPLACE_ME")) return false;
  return true;
};

const cashfreeBaseUrl =
  config.cashfreeEnv === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

app.use(express.json());
app.use(express.static(publicDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true, env: config.cashfreeEnv, cashfreeBaseUrl });
});

app.get("/api/frontend-config", (_req, res) => {
  res.json({
    cashfreeMode: config.cashfreeEnv === "production" ? "production" : "sandbox",
    upiIntentFeatureFlagEnabled: true,
    cashfreeSdkPath: "/vendor/cashfree.js"
  });
});

app.get("/vendor/cashfree.js", async (_req, res) => {
  try {
    const now = Date.now();
    if (!sdkCache.body || now - sdkCache.fetchedAt > 1000 * 60 * 30) {
      const sdkResponse = await fetch(CASHFREE_SDK_URL);
      if (!sdkResponse.ok) {
        return res.status(502).send("Failed to fetch Cashfree SDK");
      }

      sdkCache = {
        body: await sdkResponse.text(),
        fetchedAt: now,
        contentType: sdkResponse.headers.get("content-type") || sdkCache.contentType
      };
    }

    res.setHeader("Content-Type", sdkCache.contentType);
    res.setHeader("Cache-Control", "public, max-age=1800");
    return res.send(sdkCache.body);
  } catch (error) {
    return res.status(500).json({
      error: "Cashfree SDK proxy failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/create-order", async (req, res) => {
  try {
    if (!hasValidCredentials()) {
      return res.status(500).json({
        error: "Missing credentials",
        message:
          "Set valid CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in server/.env (not REPLACE_ME placeholders)."
      });
    }

    const amount = Number(req.body?.orderAmount || config.defaultOrderAmount);
    const customerId = req.body?.customerId || `cust_${Date.now()}`;
    const customerPhone = req.body?.customerPhone || "9999999999";
    const customerName = req.body?.customerName || "Demo User";
    const customerEmail = req.body?.customerEmail || "demo@example.com";
    const orderId = req.body?.orderId || `order_${Date.now()}`;

    const statusPageUrl = `${config.publicBaseUrl}/status.html?order_id=${encodeURIComponent(orderId)}`;

    const payload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: config.defaultOrderCurrency,
      customer_details: {
        customer_id: customerId,
        customer_phone: customerPhone,
        customer_name: customerName,
        customer_email: customerEmail
      },
      order_meta: {
        return_url: `${config.publicBaseUrl}/status.html?order_id={order_id}`
      },
      order_note: "Order created from Android WebView demo"
    };

    const response = await fetch(`${cashfreeBaseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": config.cashfreeClientId,
        "x-client-secret": config.cashfreeClientSecret,
        "x-api-version": config.cashfreeApiVersion
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Cashfree create order failed",
        cashfree: data
      });
    }

    return res.json({
      orderId: data.order_id,
      cfOrderId: data.cf_order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status,
      statusPageUrl
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/api/order-status/:orderId", async (req, res) => {
  try {
    if (!hasValidCredentials()) {
      return res.status(500).json({
        error: "Missing credentials",
        message:
          "Set valid CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in server/.env (not REPLACE_ME placeholders)."
      });
    }

    const orderId = req.params.orderId;
    const response = await fetch(`${cashfreeBaseUrl}/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: {
        "x-client-id": config.cashfreeClientId,
        "x-client-secret": config.cashfreeClientSecret,
        "x-api-version": config.cashfreeApiVersion
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Cashfree order status failed",
        cashfree: data
      });
    }

    return res.json({
      orderId: data.order_id,
      cfOrderId: data.cf_order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status,
      orderAmount: data.order_amount,
      orderCurrency: data.order_currency,
      raw: data
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  console.log(`Cashfree environment: ${config.cashfreeEnv}`);
});
