<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../order_storage.php';

use Cashfree\Client;
use Cashfree\Checkout;

$config = require __DIR__ . '/../config.php';

$orderId = trim($_GET['order_id'] ?? ($_GET['orderId'] ?? ''));
$orderStatus = null;
$paymentId = null;
$paymentStatus = null;
$paymentMethod = null;
$paymentTime = null;
$paymentError = null;
$statusError = null;
$orderData = null;
$snapshot = $orderId !== '' ? loadOrderSnapshot($orderId) : null;

if ($orderId !== '') {
    try {
        $client = new Client($config['app_id'], $config['secret_key'], $config['environment']);
        $checkout = new Checkout($client);
        $orderData = $checkout->getOrderStatus($orderId);
        $orderStatus = $orderData['order_status'] ?? null;

        $payments = $checkout->getOrderPayments($orderId);
        if (is_array($payments) && $payments !== []) {
            $successfulPayment = null;

            foreach ($payments as $payment) {
                if (($payment['payment_status'] ?? '') === 'SUCCESS') {
                    $successfulPayment = $payment;
                    break;
                }
            }

            $selectedPayment = $successfulPayment ?? $payments[0];
            $paymentId = (string) ($selectedPayment['cf_payment_id'] ?? '');
            $paymentStatus = (string) ($selectedPayment['payment_status'] ?? '');
            $paymentTime = (string) ($selectedPayment['payment_completion_time'] ?? ($selectedPayment['payment_time'] ?? ''));
            $paymentMethod = (string) ($selectedPayment['payment_group'] ?? '');
        }

        if (is_array($snapshot)) {
            $snapshot['cashfree_order'] = $orderData;
            $snapshot['payment'] = [
                'payment_id' => $paymentId,
                'payment_status' => $paymentStatus,
                'payment_method' => $paymentMethod,
                'payment_time' => $paymentTime,
            ];
            saveOrderSnapshot($orderId, $snapshot);
        }
    } catch (Throwable $exception) {
        $statusError = $exception->getMessage();
    }
}

$escapedOrderId = htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8');
$escapedOrderStatus = htmlspecialchars((string) $orderStatus, ENT_QUOTES, 'UTF-8');
$escapedStatusError = htmlspecialchars((string) $statusError, ENT_QUOTES, 'UTF-8');
$escapedPaymentId = htmlspecialchars((string) $paymentId, ENT_QUOTES, 'UTF-8');
$escapedPaymentStatus = htmlspecialchars((string) $paymentStatus, ENT_QUOTES, 'UTF-8');
$escapedPaymentMethod = htmlspecialchars((string) $paymentMethod, ENT_QUOTES, 'UTF-8');
$escapedPaymentTime = htmlspecialchars((string) $paymentTime, ENT_QUOTES, 'UTF-8');
$invoiceUrl = 'invoice.php?order_id=' . rawurlencode($orderId);
$invoiceDownloadUrl = $invoiceUrl . '&download=1&v=' . rawurlencode((string) filemtime(__DIR__ . '/../invoice_renderer.php'));
$items = is_array($snapshot['items'] ?? null) ? $snapshot['items'] : [];
$orderAmount = (float) ($snapshot['order_amount'] ?? ($orderData['order_amount'] ?? 0));
$currency = (string) ($snapshot['order_currency'] ?? ($orderData['order_currency'] ?? 'INR'));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="store-shell">
        <section class="receipt-hero">
            <div>
                <span class="hero-eyebrow">Payment Return</span>
                <h1><?= $orderStatus === 'PAID' ? 'Payment Confirmed' : 'Order Received' ?></h1>
                <p>Your return URL now shows the verified order summary, purchased products, and an invoice download option.</p>
            </div>
            <div class="receipt-actions">
                <a class="button-link secondary" href="index.php">Continue Shopping</a>
                <a class="button-link" href="<?= htmlspecialchars($invoiceDownloadUrl, ENT_QUOTES, 'UTF-8') ?>">Download Invoice PDF</a>
            </div>
        </section>

        <div class="receipt-layout">
            <section class="luxe-panel">
                <div class="section-heading">
                    <h2>Order Summary</h2>
                    <p>Verified against Cashfree on the backend.</p>
                </div>
                <div class="summary-grid">
                    <div class="summary-tile">
                        <span>Order ID</span>
                        <strong><?= $escapedOrderId ?: 'N/A' ?></strong>
                    </div>
                    <div class="summary-tile">
                        <span>Order Status</span>
                        <strong><?= $escapedOrderStatus ?: 'Unknown' ?></strong>
                    </div>
                    <div class="summary-tile">
                        <span>Payment ID</span>
                        <strong><?= $escapedPaymentId !== '' ? $escapedPaymentId : 'Pending' ?></strong>
                    </div>
                    <div class="summary-tile">
                        <span>Total Paid</span>
                        <strong><?= htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') ?> <?= number_format($orderAmount, 2) ?></strong>
                    </div>
                </div>
                <?php if ($escapedStatusError !== ''): ?>
                    <div class="status-message error">Verification error: <?= $escapedStatusError ?></div>
                <?php elseif ($orderStatus === 'PAID'): ?>
                    <div class="status-message success">Payment is confirmed and your invoice is ready to download.</div>
                <?php else: ?>
                    <div class="status-message loading">The order exists, but the final payment state is not marked as paid yet.</div>
                <?php endif; ?>
            </section>

            <section class="luxe-panel">
                <div class="section-heading">
                    <h2>Purchased Products</h2>
                    <p>Your invoice uses this product breakdown.</p>
                </div>
                <div class="invoice-items">
                    <?php foreach ($items as $item): ?>
                        <div class="invoice-line">
                            <div>
                                <strong><?= htmlspecialchars((string) $item['name'], ENT_QUOTES, 'UTF-8') ?></strong>
                                <span><?= htmlspecialchars((string) $item['description'], ENT_QUOTES, 'UTF-8') ?></span>
                            </div>
                            <div class="invoice-line-meta">
                                <span>Qty <?= (int) $item['quantity'] ?></span>
                                <strong>₹<?= number_format((float) $item['line_total'], 2) ?></strong>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </section>

            <section class="luxe-panel">
                <div class="section-heading">
                    <h2>Payment Details</h2>
                    <p>Fetched from Cashfree for the invoice.</p>
                </div>
                <div class="detail-list">
                    <div><span>Payment Status</span><strong><?= $escapedPaymentStatus !== '' ? $escapedPaymentStatus : 'Not available' ?></strong></div>
                    <div><span>Payment Method</span><strong><?= $escapedPaymentMethod !== '' ? $escapedPaymentMethod : 'Not available' ?></strong></div>
                    <div><span>Completed At</span><strong><?= $escapedPaymentTime !== '' ? $escapedPaymentTime : 'Not available' ?></strong></div>
                    <div><span>Invoice</span><strong><a href="<?= htmlspecialchars($invoiceUrl, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener noreferrer">Preview invoice</a></strong></div>
                </div>
            </section>
        </div>
    </div>
</body>
</html>
