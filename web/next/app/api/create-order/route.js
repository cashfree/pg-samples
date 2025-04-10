import { NextResponse } from "next/server";
import { Cashfree } from "cashfree-pg";

export async function POST(request) {
    try {
        const body = await request.json();
        const { amount, customerDetails, orderMeta } = body;

        // Generate unique order ID
        const orderId = `order_${Date.now()}`;

        // Initialize Cashfree SDK with sandbox environment
        const cashfree = new Cashfree(
            Cashfree.SANDBOX,
            process.env.CASHFREE_CLIENT_ID,
            process.env.CASHFREE_CLIENT_SECRET
        );

        // Create payment order
        const orderRequest = {
            order_id: orderId,
            order_amount: parseFloat(amount).toFixed(2),
            order_currency: "INR",
            customer_details: {
                customer_id: customerDetails.customerId || `cust_${Date.now()}`,
                customer_name: customerDetails.name,
                customer_email: customerDetails.email,
                customer_phone: customerDetails.phone || "9999999999",
            },
            order_meta: {
                return_url:
                    orderMeta.returnUrl ||
                    `${process.env.NEXT_PUBLIC_BASE_URL}/payment/status?order_id={order_id}`,
            },
        };

        // Use the instance method instead of the static method
        const response = await cashfree.PGCreateOrder(orderRequest);

        console.log("Payment order response:", response.data);

        return NextResponse.json({
            success: true,
            data: {
                orderId: response.data.order_id,
                orderToken: response.data.order_token,
                orderStatus: response.data.order_status,
                orderCurrency: response.data.order_currency,
                orderAmount: response.data.order_amount,
                payment_session_id: response.data.payment_session_id,
            },
        });
    } catch (error) {
        console.error("Error creating payment order:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to create payment order",
            },
            { status: 500 }
        );
    }
}
