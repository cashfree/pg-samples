<?php

declare(strict_types=1);

$orderId = trim($_GET['order_id'] ?? ($_GET['orderId'] ?? ''));
$reason = trim($_GET['reason'] ?? '');
$escapedOrderId = htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8');
$escapedReason = htmlspecialchars($reason, ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="store-shell">
        <section class="receipt-hero">
            <div>
                <span class="hero-eyebrow">Payment Status</span>
                <h1>Payment Not Completed</h1>
                <p>You can return to the store, adjust the cart, and attempt checkout again.</p>
            </div>
            <div class="receipt-actions">
                <a class="button-link secondary" href="index.php">Return to store</a>
            </div>
        </section>

        <section class="luxe-panel">
            <div class="detail-list">
                <div><span>Order ID</span><strong><?= $escapedOrderId ?: 'N/A' ?></strong></div>
                <div><span>Reason</span><strong><?= $escapedReason !== '' ? $escapedReason : 'Payment was not completed.' ?></strong></div>
            </div>
        </section>
    </div>
</body>
</html>
