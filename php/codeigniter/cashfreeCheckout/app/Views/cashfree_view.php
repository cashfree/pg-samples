
<!DOCTYPE html>
<html>
<head>
    <title>Buy T-Shirt | Cashfree Payment</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body>
<div class="container mt-5 text-center">

    <h2 class="mb-4">Cool T-Shirt for ₹1</h2>

    <!-- T-Shirt Image -->
    <div>
    <img src="https://dummyimage.com/300x300/007bff/ffffff&text=T-Shirt" alt="T-Shirt" class="img-fluid mb-3 rounded shadow" style="max-width: 300px;">
    </div>
    <div>
    <!-- Buy Now Button -->
    <button type="button" id="button-confirm" class="btn btn-primary">Buy Now</button>
    </div>
    <h4 class="text-success d-none mt-3" id="text-redirect">Redirecting to Cashfree...</h4>
</div>

<!-- Cashfree SDK -->
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>

<script>
    $(document).ready(function () {
        $('#button-confirm').on('click', function () {
            var element = this;

            $.ajax({
                type: 'GET',
                dataType: "json",
                url: '<?= site_url("cashfree/confirm") ?>',
                beforeSend: function () {
                    $(element).text('Loading...');
                },
                complete: function () {
                    $(element).text('Buy Now');
                },
                success: function (response) {
                    if (response.status === 1) {
                        $(element).hide();
                        $('#text-redirect').removeClass("d-none");

                        const cashfree = Cashfree({ mode: response.environment });

                        let checkoutOptions = {
                            paymentSessionId: response.payment_session_id,
                            redirectTarget: "_modal",
                        };

                        function fetchPaymentStatus(orderId) {
                            fetch(`/cashfree/check-payment?order_id=${orderId}`)
                                .then(response => response.json())
                                .then(data => {
                                    const status = data.payment_status?.toUpperCase() === 'FAILED' ? 'FAILED' : 'SUCCESS';
                                    location = `/cashfree/thankyou?status=${status}&order_id=${orderId}`;
                                })
                                .catch(error => {
                                    console.error("Error fetching payment status:", error);
                                    location = `/cashfree/thankyou?status=failed&order_id=${orderId}`;
                                });
                        }


                        cashfree.checkout(checkoutOptions).then((result) => {
                            if(result.error){
                                console.log("User has closed the popup or there is some payment error, Check for Payment Status");
                                console.log(result.error);
                            }
                            if(result.redirect){
                                console.log("Payment will be redirected");
                            }
                            if(result.paymentDetails){
                                console.log("Payment has been completed, Check for Payment Status");
                                console.log(result.paymentDetails.paymentMessage);
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
