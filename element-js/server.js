// server.js  (CommonJS)
const express = require("express");
const cors = require("cors");
// IMPORTANT: install node-fetch v2 ->  npm i node-fetch@2
const fetch = require("node-fetch");
const path = require("path");

const app = express();

/* ---------- STATIC & MIDDLEWARE ---------- */
app.use(express.static(path.join(__dirname, "public"))); // serves /index.html, /buy.html, etc.
app.use(cors());                // optional for local dev
app.use("/api", express.json()); // JSON body for API routes

/* ---------- ENV PICKS ---------- */
const isSandbox = (process.env.CASHFREE_ENV || "sandbox") === "sandbox";
const need = (k) => { if (!process.env[k]) throw new Error(`Missing env: ${k}`); return process.env[k]; };

const BASE_URL  = isSandbox ? need("TEST_BASE_URL")       : need("PROD_BASE_URL");
const CLIENT_ID = isSandbox ? need("TEST_CLIENT_ID")      : need("PROD_CLIENT_ID");
const SECRET    = isSandbox ? need("TEST_CLIENT_SECRET")  : need("PROD_CLIENT_SECRET");

/* ---------- CREATE ORDER ONLY ---------- */
app.post("/api/create-order", async (req, res) => {
  try {
    const {
      order_amount,
      order_currency = "INR",
      customer_id,
      customer_email,
      customer_phone,
      order_note,
      return_url,
      notify_url
    } = req.body || {};

    const body = {
      order_amount,
      order_currency,
      customer_details: { customer_id, customer_email, customer_phone },
      order_note,
      order_meta: { return_url, notify_url }
    };

    const cfRes = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "x-client-id": CLIENT_ID,
        "x-client-secret": SECRET,
        "x-api-version": "2025-01-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await cfRes.json();
    if (!cfRes.ok) return res.status(cfRes.status).json(data);

    res.json({
      order_id: data.order_id,
      payment_session_id: data.payment_session_id
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* ---------- ROOT ---------- */
app.get("/", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

const PORT = Number(process.env.PORT || 5173);
app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT} (env=${isSandbox ? "SANDBOX" : "PRODUCTION"})`
  );
});