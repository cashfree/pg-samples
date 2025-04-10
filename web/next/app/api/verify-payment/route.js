import { NextResponse } from "next/server";
import { Cashfree } from "cashfree-pg";

export async function POST(request) {
    try {
        const body = await request.json();
        const { orderId } = body;
        console.log("Verifying payment for order ID:", orderId);
        if (!orderId) {
            return NextResponse.json(
                { success: false, error: "Order ID is required" },
                { status: 400 }
            );
        }

        // Initialize Cashfree SDK with sandbox environment
        const cashfree = new Cashfree(
            Cashfree.SANDBOX,
            process.env.CASHFREE_CLIENT_ID,
            process.env.CASHFREE_CLIENT_SECRET
        );

        // Get order details using the instance method
        const payments = await cashfree.PGOrderFetchPayments(orderId);
        const order = await cashfree.PGFetchOrder(orderId);

        return NextResponse.json({
            success: true,
            data: {
                orderId: order.data.order_id,
                orderStatus: order.data.order_status,
                orderAmount: order.data.order_amount,
                orderCurrency: order.data.order_currency,
                paymentDetails: payments.data || [],
            },
        });
    } catch (error) {
        console.error("Error verifying payment:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to verify payment",
            },
            { status: 500 }
        );
    }
}
