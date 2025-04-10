"use client";

import { useState } from "react";
import PaymentForm from "../components/PaymentForm";
import PaymentStatus from "../components/PaymentStatus";

export default function Home() {
    const [paymentStatus, setPaymentStatus] = useState(null);

    return (
        <main className="container-fluid">
            <div className="row">
                <div className="col-12">
                    {paymentStatus ? (
                        <div className="container py-4">
                            <PaymentStatus
                                status={paymentStatus}
                                onReset={() => setPaymentStatus(null)}
                            />
                        </div>
                    ) : (
                        <PaymentForm
                            onPaymentComplete={(status) =>
                                setPaymentStatus(status)
                            }
                        />
                    )}
                </div>
            </div>
        </main>
    );
}
