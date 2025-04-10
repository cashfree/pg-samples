"use client";

import { useState, useEffect } from "react";

export default function PaymentForm({ onPaymentComplete }) {
    const [minAmount] = useState("100");
    const [quantity, setQuantity] = useState(1);
    const [size, setSize] = useState("S");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [cashfree, setCashfree] = useState(null);
    const [orderID, setOrderID] = useState(null);

    // Initialize Cashfree only on client-side
    useEffect(() => {
        const loadCashfree = async () => {
            try {
                const { load } = await import("@cashfreepayments/cashfree-js");
                const cashfreeInstance = await load({
                    mode: "sandbox",
                });
                setCashfree(cashfreeInstance);
            } catch (err) {
                console.error("Failed to load Cashfree:", err);
                setError(
                    "Failed to load payment gateway. Please try again later."
                );
            }
        };

        loadCashfree();
    }, []);

    const increment = () => {
        setQuantity(quantity + 1);
    };

    const decrement = () => {
        if (quantity > 1) {
            setQuantity(quantity - 1);
        }
    };

    const handleBuyNow = async () => {
        setLoading(true);
        setError("");

        try {
            // Create order through our API
            const createOrderResponse = await fetch("/api/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: parseFloat(minAmount) * quantity,
                    customerDetails: {
                        name: "Customer",
                        email: "customer@example.com",
                        phone: "9999999999",
                    },
                    orderMeta: {
                        returnUrl: `${window.location.origin}/payment/status`,
                    },
                }),
            });

            const orderData = await createOrderResponse.json();

            if (!orderData.success) {
                throw new Error(orderData.error || "Failed to create order");
            }

            setOrderID(orderData.data.orderId);

            // Initialize Cashfree payment
            if (!cashfree) {
                throw new Error("Payment gateway not initialized properly");
            }

            cashfree
                .checkout({
                    paymentSessionId: orderData.data.payment_session_id,
                    redirectTarget: "_modal",
                })
                .then(async function (data) {
                    if (!!data.error) {
                        setTimeout(() => {
                            alert(data.error.message);
                            setLoading(false);
                        }, 1000);
                        return;
                    }

                    if (data.paymentDetails) {
                        // Verify payment
                        const verifyUrl = `/api/verify-payment`;
                        const options = {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                orderId: orderData.data.orderId,
                            }),
                        };

                        try {
                            const response = await fetch(verifyUrl, options);
                            const verifyData = await response.json();

                            if (verifyData.data?.orderStatus === "PAID") {
                                onPaymentComplete({
                                    success: true,
                                    orderId: verifyData.data.orderId,
                                    message: "Payment successful",
                                    details: verifyData.data,
                                });
                            } else {
                                onPaymentComplete({
                                    success: false,
                                    orderId: verifyData.data?.orderId,
                                    message: "Payment failed",
                                    details: verifyData.data,
                                });
                            }
                        } catch (error) {
                            console.error(error);
                            onPaymentComplete({
                                success: false,
                                message:
                                    "Something went wrong while verifying payment",
                            });
                        }
                    } else {
                        setTimeout(() => {
                            onPaymentComplete({
                                success: false,
                                message: "Something is not right",
                            });
                        }, 1000);
                    }

                    setLoading(false);
                });
        } catch (err) {
            setLoading(false);
            setError(err.message || "Something went wrong");
            console.error("Payment error:", err);
        }
    };

    return (
        <section className="mt-5">
            <div className="container">
                <div className="row">
                    <div className="col-lg-6 mb-4 mb-lg-0">
                        <div className="img-box">
                            <img
                                src="https://pagedone.io/asset/uploads/1700471600.png"
                                alt="Yellow Tropical Printed Shirt image"
                                className="img-fluid"
                            />
                        </div>
                    </div>
                    <div className="col-lg-6 d-flex align-items-center">
                        <div className="w-100">
                            <p className="text-primary mb-2">
                                Clothing / Menswear
                            </p>
                            <h2 className="fw-bold mb-2">
                                Basic Yellow Tropical Printed Shirt
                            </h2>
                            <div className="mb-3">
                                <h6 className="d-inline-block me-3 fw-bold fs-4">
                                    ₹{parseInt(minAmount) * quantity}
                                </h6>
                                <div className="d-inline-block">
                                    <div className="text-warning me-1 d-inline-block">
                                        ★★★★☆
                                    </div>
                                    <span className="text-muted ms-2 small">
                                        1624 reviews
                                    </span>
                                </div>
                            </div>
                            <p className="text-muted mb-3">
                                Introducing our vibrant Basic Yellow Tropical
                                Printed Shirt - a celebration of style and
                                sunshine! Embrace the essence of summer wherever
                                you go with this eye-catching piece that
                                effortlessly blends comfort and tropical flair.{" "}
                                <a href="#" className="text-primary">
                                    More....
                                </a>
                            </p>
                            <ul className="list-unstyled mb-4">
                                <li className="mb-2">
                                    <span className="badge bg-primary rounded-circle me-2 p-2">
                                        ✓
                                    </span>
                                    <span>Branded shirt</span>
                                </li>
                                {/* More list items would go here, simplified for brevity */}
                            </ul>
                            <p className="fw-bold mb-2">Size</p>
                            <div className="border-bottom pb-3 mb-3">
                                <div className="row g-2 col-md-8">
                                    {["S", "M", "L", "XL", "XXL"].map(
                                        (sizeOption) => (
                                            <div
                                                className="col"
                                                key={sizeOption}
                                            >
                                                <button
                                                    onClick={() =>
                                                        setSize(sizeOption)
                                                    }
                                                    className={`btn w-100 rounded-pill ${
                                                        size === sizeOption
                                                            ? "btn-primary"
                                                            : "btn-outline-secondary"
                                                    }`}
                                                >
                                                    {sizeOption}
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="py-3">
                                <div className="mb-3">
                                    <div className="input-group">
                                        <button
                                            onClick={decrement}
                                            className="btn btn-outline-secondary rounded-start"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="text"
                                            value={quantity}
                                            readOnly
                                            className="form-control text-center"
                                            style={{ maxWidth: "80px" }}
                                        />
                                        <button
                                            onClick={increment}
                                            className="btn btn-outline-secondary rounded-end"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex align-items-center">
                                <button className="btn btn-light rounded-circle me-2">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="26"
                                        height="26"
                                        viewBox="0 0 26 26"
                                        fill="none"
                                    >
                                        <path
                                            d="M4.47084 14.3196L13.0281 22.7501L21.9599 13.9506M13.0034 5.07888C15.4786 2.64037 19.5008 2.64037 21.976 5.07888C24.4511 7.5254 24.4511 11.4799 21.9841 13.9265M12.9956 5.07888C10.5204 2.64037 6.49824 2.64037 4.02307 5.07888C1.54789 7.51738 1.54789 11.4799 4.02307 13.9184M4.02307 13.9184L4.04407 13.939M4.02307 13.9184L4.46274 14.3115"
                                            stroke="#0d6efd"
                                            strokeWidth="1.6"
                                            strokeMiterlimit="10"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                                <button
                                    disabled={loading || !cashfree}
                                    onClick={handleBuyNow}
                                    className="btn btn-primary btn-lg rounded-pill flex-grow-1"
                                >
                                    Buy Now
                                    {loading && (
                                        <span
                                            className="spinner-border spinner-border-sm ms-2"
                                            role="status"
                                            aria-hidden="true"
                                        ></span>
                                    )}
                                </button>
                            </div>

                            {error && (
                                <div className="alert alert-danger mt-3">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
