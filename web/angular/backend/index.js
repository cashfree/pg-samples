const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post("/create-order", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.cashfree.com/pg/orders",
      req.body,
      {
        headers: {
          "x-client-id": process.env.CF_CLIENT_ID,
          "x-client-secret": process.env.CF_CLIENT_SECRET,
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-api-version": "2025-01-01",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ✅ New route to check payment status
app.get("/payment-status/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const response = await axios.get(
      `https://api.cashfree.com/pg/orders/${orderId}/payments`,
      {
        headers: {
          "x-client-id": process.env.CF_CLIENT_ID,
          "x-client-secret": process.env.CF_CLIENT_SECRET,
          Accept: "application/json",
          "x-api-version": "2025-01-01",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch payment status" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
