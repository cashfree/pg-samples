import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { config } from "dotenv";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

config();

const app = new Hono();
app.use("*", cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.get("/", (c) => {
    const html = readFileSync(join(__dirname, "index.html"), "utf8");
    return c.html(html);
});

app.post("/api/create-order", async (c) => {
    try {
        const cashfree = new Cashfree(
            CFEnvironment.SANDBOX,
            process.env.APP_ID,
            process.env.SECRET_KEY
        );

        const orderRequest = {
            order_amount: 1.0,
            order_currency: "INR",
            order_id: "devstudio_" + Date.now(),
            customer_details: {
                customer_id: "devstudio_user",
                customer_phone: "8474090589",
            },
            order_meta: {
                notify_url:
                    "https://www.cashfree.com/devstudio/preview/pg/webhooks/19140510",
            },
        };

        const response = await cashfree.PGCreateOrder(orderRequest);
        return c.json(response.data);
    } catch (error) {
        return c.json({ error: "Something went wrong" }, 500);
    }
});

serve({
    fetch: app.fetch,
    port: 3000,
});

console.log(`Server running at http://localhost:3000`);
