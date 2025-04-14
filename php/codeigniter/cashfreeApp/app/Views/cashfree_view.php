<!DOCTYPE html>
<html>
<head>
    <title>Buy T-Shirt | Cashfree Payment</title>
    <!-- Include Bootstrap CSS for styling -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Include jQuery for AJAX and DOM manipulation -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body>
<div class="container mt-5 text-center">

    <!-- Display product details -->
    <h2 class="mb-4">Cool T-Shirt for ₹1</h2>

    <div>
        <!-- Product image -->
        <img src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Wikipedia-T-shirt.jpg" alt="T-Shirt" class="img-fluid mb-3 rounded shadow" style="max-width: 300px;">
    </div>
    <div>
        <!-- Button to initiate payment -->
        <button type="button" id="button-confirm" class="btn btn-primary">Buy Now</button>
    </div>
    <!-- Message displayed when redirecting to Cashfree -->
    <h4 class="text-success d-none mt-3" id="text-redirect">Redirecting to Cashfree...</h4>
</div>

<!-- Include Cashfree SDK -->
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>

<script>
    $(document).ready(function () {
        // Handle the "Buy Now" button click
        $('#button-confirm').on('click', function () {
            var element = this;

            // Make an AJAX request to confirm the order
            $.ajax({
                type: 'GET',
                dataType: "json",
                url: '<?= site_url("cashfree/confirm") ?>',
                beforeSend: function () {
                    // Show loading text while processing
                    $(element).text('Loading...');
                },
                complete: function () {
                    // Reset button text after processing
                    $(element).text('Buy Now');
                },
                success: function (response) {
                    if (response.status === 1) {
                        // Hide the button and show redirect message
                        $(element).hide();
                        $('#text-redirect').removeClass("d-none");

                        // Initialize Cashfree SDK
                        const cashfree = Cashfree({ mode: response.environment });

                        let checkoutOptions = {
                            paymentSessionId: response.payment_session_id,
                            redirectTarget: "_modal",
                        };

                        // Function to fetch payment status
                        function fetchPaymentStatus(orderId) {
                            fetch(`/cashfree/checkOrder?order_id=${orderId}`)
                                .then(response => response.json())
                                .then(data => {
                                    const status = data.payment_status;
                                    // Redirect to thank you page with payment status
                                    location = `/cashfree/thankyou?status=${status}&order_id=${orderId}`;
                                })
                                .catch(error => {
                                    console.error("Error fetching payment status:", error);
                                    location = `/cashfree/thankyou?status=FAILED&order_id=${orderId}`;
                                });
                        }

                        // Open Cashfree checkout
                        cashfree.checkout(checkoutOptions).then((result) => {
                            if (result.error) {
                                console.log("User has closed the popup or there is some payment error, Check for Payment Status");
                                console.log(result.error);
                            }
                            if (result.redirect) {
                                console.log("Payment will be redirected");
                            }
                            if (result.paymentDetails) {
                                console.log("Payment has been completed, Check for Payment Status");
                                console.log(result.paymentDetails.paymentMessage);
                                console.log("Cashfree response:", response);
                                const orderId = response.order_id;
                                fetchPaymentStatus(orderId);
                            }
                        });
                    }
                }
            });
        });
    });
</script>
</body>
</html>
