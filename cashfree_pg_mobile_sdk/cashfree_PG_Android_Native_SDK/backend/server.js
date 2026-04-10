import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT || 8080);

app.use(cors());
app.use(express.json());

const API_VERSION = process.env.CASHFREE_API_VERSION || "2023-08-01";

function getCashfreeConfig(environment = "sandbox") {
    const isProd = environment.toLowerCase() === "production";
    const keyId = isProd
        ? process.env.CASHFREE_PROD_CLIENT_ID
        : process.env.CASHFREE_SANDBOX_CLIENT_ID;
    const secretKey = isProd
        ? process.env.CASHFREE_PROD_CLIENT_SECRET
        : process.env.CASHFREE_SANDBOX_CLIENT_SECRET;

    const baseUrl = isProd
        ? "https://api.cashfree.com"
        : "https://sandbox.cashfree.com";

    if (!keyId || !secretKey) {
        throw new Error(
            `Missing Cashfree credentials for environment=${environment}. Check backend/.env`
        );
    }

    return { baseUrl, keyId, secretKey };
}

function parsePaymentMode(payment) {
    if (!payment) {
        return "NA";
    }
    if (typeof payment.payment_group === "string") {
        return payment.payment_group;
    }
    if (typeof payment.payment_method === "string") {
        return payment.payment_method;
    }
    if (payment.payment_method && typeof payment.payment_method === "object") {
        return Object.keys(payment.payment_method).join(", ");
    }
    return "NA";
}

function pickLatestPayment(payments) {
    if (!Array.isArray(payments) || payments.length === 0) {
        return null;
    }

    const successful = payments.find(
        (payment) => String(payment.payment_status || "").toUpperCase() === "SUCCESS"
    );
    if (successful) {
        return successful;
    }

    return [...payments].sort((a, b) => {
        const timeA = new Date(a.payment_time || a.created_at || 0).getTime();
        const timeB = new Date(b.payment_time || b.created_at || 0).getTime();
        return timeB - timeA;
    })[0];
}

app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "cashfree-merchant-demo-backend" });
});

app.post("/api/create-order", async (req, res) => {
    try {
        const {
            order_amount,
            order_currency = "INR",
            customer_id,
            customer_phone,
            customer_email,
            environment = "sandbox"
        } = req.body || {};

        if (!order_amount || Number(order_amount) <= 0) {
            return res.status(400).json({ message: "order_amount must be a positive number" });
        }

        const { baseUrl, keyId, secretKey } = getCashfreeConfig(environment);
        const orderId = `order_${Date.now()}`;

        const payload = {
            order_id: orderId,
            order_amount: Number(order_amount),
            order_currency,
            customer_details: {
                customer_id: customer_id || "merchant_demo_user_001",
                customer_name: "Merchant Demo",
                customer_email: customer_email || "demo.merchant@example.com",
                customer_phone: customer_phone || "9999999999"
            },
            order_note: "Merchant demo order from Android SDK sample."
        };

        const response = await fetch(`${baseUrl}/pg/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-version": API_VERSION,
                "x-client-id": keyId,
                "x-client-secret": secretKey
            },
            body: JSON.stringify(payload)
        });

        const responseBody = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({
                message: "Cashfree create order failed",
                error: responseBody
            });
        }

        return res.json({
            order_id: responseBody.order_id,
            payment_session_id: responseBody.payment_session_id,
            order_status: responseBody.order_status
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});

app.get("/api/orders/:orderId/status", async (req, res) => {
    try {
        const { orderId } = req.params;
        const environment = req.query.environment || "sandbox";
        const { baseUrl, keyId, secretKey } = getCashfreeConfig(environment);

        const response = await fetch(`${baseUrl}/pg/orders/${orderId}/payments`, {
            headers: {
                "x-api-version": API_VERSION,
                "x-client-id": keyId,
                "x-client-secret": secretKey
            }
        });

        const responseBody = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({
                message: "Cashfree payment status fetch failed",
                error: responseBody
            });
        }

        const latestPayment = pickLatestPayment(responseBody);
        if (!latestPayment) {
            return res.json({
                order_id: orderId,
                payment_status: "PENDING",
                payment_time: null,
                payment_mode: null
            });
        }

        return res.json({
            order_id: orderId,
            payment_status: String(latestPayment.payment_status || "PENDING").toUpperCase(),
            payment_time:
                latestPayment.payment_time ||
                latestPayment.payment_completion_time ||
                latestPayment.created_at ||
                null,
            payment_mode: parsePaymentMode(latestPayment)
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`Cashfree merchant demo backend listening on port ${port}`);
});
