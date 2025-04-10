<!DOCTYPE html>
<html>
<head>
    <title>Thank You</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="container text-center mt-5">
    <?php $isSuccess = ($status === 'SUCCESS'); ?>

    <h1 class="mb-4 <?= $isSuccess ? 'text-success' : 'text-danger' ?>">
        <?= $isSuccess ? '🎉 Thank You for Your Purchase!' : '❌ Payment Failed' ?>
    </h1>

    <p class="lead mb-4">
        <?= $isSuccess
            ? 'Your payment was successful.'
            : 'Something went wrong during the payment. Please try again.' ?>
    </p>

    <a href="<?= site_url('cashfree') ?>" class="btn btn-primary mt-3">
        <?= $isSuccess ? 'Buy Another T-Shirt' : 'Try Again' ?>
    </a>
</div>
</body>
</html>