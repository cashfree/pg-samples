"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentStatus from "../../../components/PaymentStatus";

export default function PaymentStatusPage() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");

    useEffect(() => {
        async function verifyPayment() {
            if (!orderId) {
                setStatus({
                    success: false,
                    message: "No order ID provided",
                });
                setLoading(false);
                return;
            }

            try {
                const response = await fetch("/api/verify-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId }),
                });

                const data = await response.json();

                if (data.success) {
                    setStatus({
                        success: data.data.orderStatus === "PAID",
                        orderId: data.data.orderId,
                        message:
                            data.data.orderStatus === "PAID"
                                ? "Payment successful!"
                                : `Payment status: ${data.data.orderStatus}`,
                        details: data.data,
                    });
                } else {
                    setStatus({
                        success: false,
                        orderId,
                        message: data.error || "Failed to verify payment",
                    });
                }
            } catch (error) {
                setStatus({
                    success: false,
                    orderId,
                    message:
                        error.message ||
                        "An error occurred while verifying payment",
                });
            } finally {
                setLoading(false);
            }
        }

        verifyPayment();
    }, [orderId]);

    const handleReset = () => {
        router.push("/");
    };

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-24">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">
                        Verifying Payment...
                    </h2>
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
                <h1 className="text-3xl font-bold text-center mb-10">
                    Payment Status
                </h1>

                {status && (
                    <PaymentStatus status={status} onReset={handleReset} />
                )}
            </div>
        </div>
    );
}
