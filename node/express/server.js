require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Cashfree, CFEnvironment } = require("cashfree-pg");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/api/create-order", async (req, res) => {
    try {
        var cashfree = new Cashfree(
            CFEnvironment.SANDBOX,
            process.env.APP_ID,
            process.env.SECRET_KEY
        );

        const orderRequest = {
            order_amount: 1.0,
            order_currency: "INR",
            order_id: "devstudio_" + Date.now(), // generate unique order_id
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
        res.json(response.data);
    } catch (error) {
        res.status(500).json({
            error: "Something went wrong",
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
