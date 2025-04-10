"use client";

export default function PaymentStatus({ status, onReset }) {
    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <div
                                className={`alert ${
                                    status.success
                                        ? "alert-success"
                                        : "alert-danger"
                                } mb-4`}
                            >
                                <h2 className="fs-4 fw-medium mb-2">
                                    {status.success
                                        ? "Payment Successful!"
                                        : "Payment Failed!"}
                                </h2>
                                <p className="mb-2">{status.message}</p>
                                {status.orderId && (
                                    <p className="mb-2">
                                        <strong>Order ID:</strong>{" "}
                                        {status.orderId}
                                    </p>
                                )}
                            </div>

                            {status.success && (
                                <div className="mb-4">
                                    <h3 className="fs-5 fw-medium mb-2">
                                        Payment Details
                                    </h3>
                                    <div className="border rounded bg-light p-3">
                                        <pre
                                            className="small"
                                            style={{
                                                whiteSpace: "pre-wrap",
                                                overflowX: "auto",
                                            }}
                                        >
                                            {JSON.stringify(
                                                status.details,
                                                null,
                                                2
                                            )}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onReset}
                                className="btn btn-primary w-100"
                            >
                                Make Another Payment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
