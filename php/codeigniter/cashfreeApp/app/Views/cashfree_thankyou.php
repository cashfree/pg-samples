<!DOCTYPE html>
<html>
<head>
    <title>Thank You</title>
    <!-- Include Bootstrap CSS for styling -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="container text-center mt-5">
    <?php 
    // Determine if the payment was successful
    $isSuccess = ($status === 'SUCCESS'); 
    ?>

    <!-- Display success or failure message -->
    <h1 class="mb-4 <?= $isSuccess ? 'text-success' : 'text-danger' ?>">
        <?= $isSuccess ? '🎉 Thank You for Your Purchase!' : '❌ Payment Failed' ?>
    </h1>

    <!-- Display additional information based on payment status -->
    <p class="lead mb-4">
        <?= $isSuccess
            ? 'Your payment was successful.'
            : 'Something went wrong during the payment. Please try again.' ?>
    </p>

    <!-- Provide a button to retry or buy another product -->
    <a href="<?= site_url('/') ?>" class="btn btn-primary mt-3">
        <?= $isSuccess ? 'Buy Another T-Shirt' : 'Try Again' ?>
    </a>
</div>
</body>
</html>