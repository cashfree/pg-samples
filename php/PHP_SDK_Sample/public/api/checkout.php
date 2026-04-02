<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../order_storage.php';

use Cashfree\Client;
use Cashfree\Checkout;

$config = require __DIR__ . '/../../config.php';
$catalog = require __DIR__ . '/../../catalog.php';
$catalogById = [];

foreach ($catalog as $catalogItem) {
    $catalogById[$catalogItem['id']] = $catalogItem;
}

$customerName = trim($_POST['customerName'] ?? '');
$customerEmail = trim($_POST['customerEmail'] ?? '');
$customerPhone = trim($_POST['customerPhone'] ?? '');
$orderCurrency = trim($_POST['currency'] ?? 'INR');
$orderId = 'order-' . time() . '-' . bin2hex(random_bytes(3));
$requestedItems = $_POST['items'] ?? [];
$lineItems = [];
$orderAmount = 0.0;

if (is_array($requestedItems)) {
    foreach ($requestedItems as $productId => $quantity) {
        if (!isset($catalogById[$productId])) {
            continue;
        }

        $qty = max(0, min(10, (int) $quantity));
        if ($qty === 0) {
            continue;
        }

        $product = $catalogById[$productId];
        $unitPrice = (float) $product['price'];
        $lineTotal = round($unitPrice * $qty, 2);
        $orderAmount += $lineTotal;

        $lineItems[] = [
            'id' => $product['id'],
            'name' => $product['name'],
            'description' => $product['description'],
            'quantity' => $qty,
            'unit_price' => $unitPrice,
            'line_total' => $lineTotal,
        ];
    }
}

$orderAmount = round($orderAmount, 2);

if ($customerName === '' || $customerEmail === '' || $customerPhone === '' || $orderAmount <= 0 || $lineItems === []) {
    http_response_code(400);
    echo '<h1>Invalid checkout request</h1>';
    echo '<p>Please provide valid customer details and select at least one product.</p>';
    exit;
}

try {
    $client = new Client($config['app_id'], $config['secret_key'], $config['environment']);
    $checkout = new Checkout($client);
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $baseUrl = $scheme . '://' . $_SERVER['HTTP_HOST'];
    $returnUrl = $baseUrl . '/success.php?orderId={order_id}';
    $notifyUrl = $config['notify_url'] ?? ($baseUrl . '/api/payment_webhook.php');

    $response = $checkout->createOrder(
        $orderId,
        $orderAmount,
        $customerName,
        $customerPhone,
        $customerEmail,
        $orderCurrency,
        [
            'return_url' => $returnUrl,
            'notify_url' => $notifyUrl,
        ]
    );

    $paymentSessionId = $response['payment_session_id'] ?? null;
    if (!is_string($paymentSessionId) || $paymentSessionId === '') {
        throw new RuntimeException('Cashfree did not return a payment_session_id.');
    }

    saveOrderSnapshot($orderId, [
        'order_id' => $orderId,
        'customer' => [
            'name' => $customerName,
            'email' => $customerEmail,
            'phone' => $customerPhone,
        ],
        'items' => $lineItems,
        'order_amount' => $orderAmount,
        'order_currency' => $orderCurrency,
        'created_at' => date(DATE_ATOM),
    ]);

    $mode = $config['environment'] === 'production' ? 'production' : 'sandbox';
    $escapedSessionId = htmlspecialchars($paymentSessionId, ENT_QUOTES, 'UTF-8');
    $escapedMode = htmlspecialchars($mode, ENT_QUOTES, 'UTF-8');
    $failureUrl = htmlspecialchars($baseUrl . '/failure.php?order_id=' . rawurlencode($orderId), ENT_QUOTES, 'UTF-8');
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Processing to Payment Page</title>
    <link rel="stylesheet" href="../assets/style.css">
    <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
</head>
<body class="redirect-body">
    <div class="redirect-screen">
        <div class="redirect-spinner" aria-hidden="true"></div>
        <h1>Processing to Payment Page</h1>
        <div id="statusMessage" class="status-message loading">Please wait while we connect you to the payment page.</div>
        <div
            id="cashfreeCheckoutMount"
            hidden
            data-payment-session-id="<?= $escapedSessionId ?>"
            data-cashfree-mode="<?= $escapedMode ?>"
            data-failure-url="<?= $failureUrl ?>"
        ></div>
        <noscript>
            <p>JavaScript is required to continue to Cashfree Checkout.</p>
        </noscript>
    </div>
    <script src="../assets/app.js"></script>
</body>
</html>
<?php
} catch (Throwable $exception) {
    http_response_code(500);
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Checkout error</title><link rel="stylesheet" href="../assets/style.css"></head><body class="redirect-body"><div class="redirect-screen"><h1>Checkout error</h1><div class="status-message error">' . htmlspecialchars($exception->getMessage(), ENT_QUOTES, 'UTF-8') . '</div></div></body></html>';
}
