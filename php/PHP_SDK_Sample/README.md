# Cashfree PHP Checkout Demo

This project is a PHP storefront demo that uses the official Cashfree PHP SDK on the backend and the Cashfree JavaScript SDK on the frontend.

Orders are created only on the PHP backend. The browser never creates a Cashfree order directly. The frontend only opens the payment page using the `payment_session_id` returned by the backend.

## Features

- Multi-product storefront with product images
- `+` and `-` quantity controls with live total calculation
- Server-side cart validation and amount recalculation
- Cashfree order creation through the official `cashfree/cashfree-pg` PHP SDK
- Cashfree JS SDK checkout launch using the backend-created `payment_session_id`
- Redirect screen with `Processing to Payment Page` messaging
- Return URL page with order status, purchased products, and payment details
- Invoice preview in browser
- Structured PDF invoice download
- Local order snapshot storage to preserve purchased product details for return page and invoice rendering

## Tech Stack

- PHP
- Cashfree official PHP SDK: `cashfree/cashfree-pg`
- Cashfree JavaScript SDK
- Dompdf for PDF invoice generation

## Project Structure

- `public/index.php`  
  Storefront page with product cards, images, quantity stepper controls, customer form, and cart summary

- `public/api/checkout.php`  
  Backend checkout endpoint that validates cart items, calculates total, creates the Cashfree order, stores a local order snapshot, and launches the payment redirect screen

- `public/success.php`  
  Return page that verifies the order from Cashfree, fetches payment details, and shows invoice actions

- `public/failure.php`  
  Friendly payment failure page

- `public/invoice.php`  
  Invoice preview endpoint and PDF download endpoint

- `public/api/payment_webhook.php`  
  Minimal webhook endpoint placeholder

- `public/assets/app.js`  
  Frontend cart logic, quantity updates, total calculation, and checkout launch handling

- `public/assets/style.css`  
  Storefront, return page, and shared UI styling

- `public/assets/products/`  
  Product illustration assets used by the storefront

- `src/Cashfree/Client.php`  
  Small wrapper around the official Cashfree PHP SDK

- `src/Cashfree/Checkout.php`  
  Checkout helper that prepares Cashfree order requests

- `catalog.php`  
  Shared product catalog used by both frontend rendering and backend validation

- `order_storage.php`  
  Helpers for saving and loading order snapshots

- `invoice_renderer.php`  
  Shared invoice renderer used for browser preview and PDF generation

- `storage/orders/`  
  Runtime order snapshot files

## Requirements

- PHP `>= 7.4`
- Composer

## Installed Packages

- `cashfree/cashfree-pg`
- `dompdf/dompdf`

## Setup

1. Install dependencies:

```bash
composer install
```

2. Update `config.php` with your Cashfree credentials:

```php
return [
    'app_id' => 'YOUR_APP_ID',
    'secret_key' => 'YOUR_SECRET_KEY',
    'environment' => 'test', // test or production
    'notify_url' => 'https://your-webhook-url.example.com',
];
```

3. Start the local PHP server:

```bash
php -S 127.0.0.1:8000 -t public
```

4. Open:

```text
http://127.0.0.1:8000
```

## Checkout Flow

1. The user selects one or more products and changes quantity using the stepper buttons.
2. The storefront updates the total amount live in the browser.
3. The form posts to `public/api/checkout.php`.
4. The backend recalculates the total from `catalog.php` and does not trust the frontend amount.
5. The backend creates the Cashfree order using the official PHP SDK.
6. The backend saves a snapshot in `storage/orders/` with customer data, product details, quantities, and total.
7. The redirect screen shows `Processing to Payment Page`.
8. Cashfree checkout opens using the returned `payment_session_id`.
9. After payment, Cashfree redirects to `public/success.php`.
10. The success page reads the saved snapshot, verifies the order, fetches payment details, and offers invoice preview and PDF download.

## Order Snapshot Storage

The project stores each successful order creation request in `storage/orders/<order_id>.json`.

That snapshot is used for:

- showing purchased products on the return URL page
- rendering the invoice preview
- generating the PDF invoice

If a snapshot file is missing for an older order, the return page may still show payment and order status from Cashfree, but it will not have the original product-level purchase breakdown.

## Invoice Notes

- Browser invoice preview and PDF invoice download both use `invoice_renderer.php`
- The preview uses a richer screen layout
- The downloaded PDF uses a compact print-focused invoice layout
- The PDF includes sample company branding, address, phone number, purchased items, payment ID, and formatted payment date/time

## Notes

- The backend is the source of truth for product pricing and total calculation
- `storage/orders/` contains runtime-generated files and should not be committed except for placeholder files you intentionally keep
- `public/api/payment_webhook.php` is intentionally minimal and should be extended if you want webhook signature verification and persistence
- `bootstrap.php` suppresses vendor deprecation notices so redirects and PDF downloads are not polluted by warnings

## Development Tips

- To change products, edit `catalog.php`
- To change invoice preview or PDF layout, edit `invoice_renderer.php`
- To change storefront behavior, edit `public/index.php`, `public/assets/app.js`, and `public/assets/style.css`
- To inspect saved order snapshots, check `storage/orders/`
