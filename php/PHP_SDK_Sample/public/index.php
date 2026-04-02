<?php

declare(strict_types=1);

$siteTitle = 'Cashfree Demo Store';
$products = require __DIR__ . '/../catalog.php';
$currency = $products[0]['currency'] ?? 'INR';

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($siteTitle) ?></title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="store-shell">
        <section class="hero-panel">
            <div class="hero-copy">
                <span class="hero-eyebrow">Cashfree PHP SDK Demo</span>
                <h1><?= htmlspecialchars($siteTitle) ?></h1>
                <p>Build a mixed cart, set quantities across premium demo products, and send the total to Cashfree from your backend only.</p>
            </div>
            <div class="hero-metrics">
                <div class="metric-card">
                    <strong>4</strong>
                    <span>Product tiers</span>
                </div>
                <div class="metric-card">
                    <strong>100%</strong>
                    <span>Backend order creation</span>
                </div>
                <div class="metric-card">
                    <strong>Live</strong>
                    <span>Invoice-ready flow</span>
                </div>
            </div>
        </section>

        <div class="store-layout">
            <section class="catalog-panel">
                <div class="section-heading">
                    <h2>Curated Products</h2>
                    <p>Select any mix of products. The server validates quantities and calculates the final order amount.</p>
                </div>
                <div class="product-grid">
                    <?php foreach ($products as $product): ?>
                        <article class="product-card" data-product-card>
                            <div class="product-accent"><?= htmlspecialchars($product['accent'], ENT_QUOTES, 'UTF-8') ?></div>
                            <div class="product-image-wrap">
                                <img
                                    class="product-image"
                                    src="<?= htmlspecialchars((string) $product['image'], ENT_QUOTES, 'UTF-8') ?>"
                                    alt="<?= htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8') ?>"
                                />
                            </div>
                            <h3><?= htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8') ?></h3>
                            <p><?= htmlspecialchars($product['description'], ENT_QUOTES, 'UTF-8') ?></p>
                            <div class="product-footer">
                                <div class="price">₹<?= number_format((float) $product['price'], 2) ?></div>
                                <div class="qty-field">
                                    <span class="qty-label">Qty</span>
                                    <div class="qty-stepper">
                                        <button
                                            type="button"
                                            class="qty-button"
                                            data-qty-action="decrease"
                                            data-target-product="<?= htmlspecialchars($product['id'], ENT_QUOTES, 'UTF-8') ?>"
                                            aria-label="Decrease quantity for <?= htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8') ?>"
                                        >-</button>
                                        <input
                                            class="product-qty"
                                            type="number"
                                            form="checkoutForm"
                                            name="items[<?= htmlspecialchars($product['id'], ENT_QUOTES, 'UTF-8') ?>]"
                                            min="0"
                                            max="10"
                                            step="1"
                                            value="<?= $product['id'] === 'growth-stack' ? '1' : '0' ?>"
                                            data-product-id="<?= htmlspecialchars($product['id'], ENT_QUOTES, 'UTF-8') ?>"
                                            data-product-name="<?= htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8') ?>"
                                            data-product-price="<?= number_format((float) $product['price'], 2, '.', '') ?>"
                                        />
                                        <button
                                            type="button"
                                            class="qty-button"
                                            data-qty-action="increase"
                                            data-target-product="<?= htmlspecialchars($product['id'], ENT_QUOTES, 'UTF-8') ?>"
                                            aria-label="Increase quantity for <?= htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8') ?>"
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>
            </section>

            <form id="checkoutForm" class="checkout-panel luxe-panel" action="api/checkout.php" method="POST">
                <div class="section-heading">
                    <h2>Customer Details</h2>
                    <p>Your cart total updates instantly and the backend recomputes it before creating the Cashfree order.</p>
                </div>

                <label>
                    Name
                    <input id="customerName" name="customerName" type="text" placeholder="Your name" value="Test User" required />
                </label>
                <label>
                    Email
                    <input id="customerEmail" name="customerEmail" type="email" placeholder="you@example.com" value="test@example.com" required />
                </label>
                <label>
                    Phone
                    <input id="customerPhone" name="customerPhone" type="tel" placeholder="9999999999" value="9999999999" required />
                </label>

                <input type="hidden" name="currency" value="<?= htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') ?>">
                <input id="computedAmount" type="hidden" name="amount" value="">

                <div class="summary-card">
                    <div class="summary-row">
                        <span>Selected items</span>
                        <strong id="selectedItemsCount">0</strong>
                    </div>
                    <div id="cartPreview" class="cart-preview"></div>
                    <div class="summary-total">
                        <span>Total</span>
                        <strong id="grandTotal" data-currency="<?= htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') ?>">₹0.00</strong>
                    </div>
                </div>

                <button id="buyButton" type="submit">Proceed to Cashfree Checkout</button>
                <div id="statusMessage" class="status-message"></div>
            </form>
        </div>
    </div>
    <script src="assets/app.js"></script>
</body>
</html>
