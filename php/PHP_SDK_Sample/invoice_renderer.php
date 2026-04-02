<?php

declare(strict_types=1);

function formatInvoiceCurrency(string $currency, float $amount): string
{
    return $currency . ' ' . number_format($amount, 2);
}

function escapeInvoice(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function formatInvoiceDateTime(?string $value): string
{
    if (!is_string($value) || trim($value) === '') {
        return 'Not available';
    }

    $timestamp = strtotime($value);
    if ($timestamp === false) {
        return $value;
    }

    return date('d M Y, h:i A', $timestamp);
}

function renderInvoiceHtml(array $snapshot, string $orderId, bool $isPdf = false): string
{
    $items = is_array($snapshot['items'] ?? null) ? $snapshot['items'] : [];
    $customer = is_array($snapshot['customer'] ?? null) ? $snapshot['customer'] : [];
    $payment = is_array($snapshot['payment'] ?? null) ? $snapshot['payment'] : [];
    $cashfreeOrder = is_array($snapshot['cashfree_order'] ?? null) ? $snapshot['cashfree_order'] : [];
    $currency = (string) ($snapshot['order_currency'] ?? 'INR');
    $orderAmount = (float) ($snapshot['order_amount'] ?? 0);
    $invoiceDate = (string) ($snapshot['created_at'] ?? date(DATE_ATOM));
    $paymentStatus = (string) ($payment['payment_status'] ?? ($cashfreeOrder['order_status'] ?? 'PENDING'));
    $pageBackground = $isPdf ? '#ffffff' : 'linear-gradient(180deg, #f7fbff 0%, #edf6f1 100%)';
    $pagePadding = $isPdf ? '8px' : '32px 18px';
    $cardRadius = $isPdf ? '8px' : '28px';
    $cardShadow = $isPdf ? 'none' : '0 28px 80px rgba(16, 48, 66, 0.12)';
    $headerPadding = $isPdf ? '18px 20px 16px' : '30px 34px 26px';
    $headerBackground = $isPdf ? '#143042' : 'linear-gradient(135deg, #0f766e 0%, #123f5a 100%)';
    $brandTitleSize = $isPdf ? '20px' : '28px';
    $brandCopySize = $isPdf ? '11px' : '13px';
    $companyMetaSize = $isPdf ? '10px' : '12px';
    $contentPadding = $isPdf ? '16px 20px 18px' : '26px 34px 34px';
    $metaSpacing = $isPdf ? '8px' : '14px';
    $metaPadding = $isPdf ? '12px 14px' : '18px 20px';
    $metaRadius = $isPdf ? '10px' : '18px';
    $metaLabelSize = $isPdf ? '10px' : '12px';
    $metaValueSize = $isPdf ? '11px' : '14px';
    $sectionMargin = $isPdf ? '16px' : '24px';
    $sectionTitleSize = $isPdf ? '13px' : '16px';
    $twoColSpacing = $isPdf ? '8px' : '18px';
    $twoColPadding = $isPdf ? '12px 14px' : '20px 22px';
    $detailPadding = $isPdf ? '6px 0' : '9px 0';
    $detailLabelSize = $isPdf ? '10px' : 'inherit';
    $detailValueSize = $isPdf ? '10px' : '13px';
    $tableHeadPadding = $isPdf ? '9px 10px' : '14px 16px';
    $tableHeadSize = $isPdf ? '9px' : '12px';
    $tableCellPadding = $isPdf ? '10px' : '16px';
    $tableCellSize = $isPdf ? '10px' : '14px';
    $itemCopySize = $isPdf ? '9px' : '12px';
    $footerMargin = $isPdf ? '14px' : '22px';
    $footerPadding = $isPdf ? '12px 14px' : '18px 22px';
    $footerRadius = $isPdf ? '10px' : '18px';
    $footerTotalSize = $isPdf ? '16px' : '24px';
    $footerNoteSize = $isPdf ? '9px' : '12px';
    $eyebrowPadding = $isPdf ? '5px 9px' : '7px 12px';
    $eyebrowSize = $isPdf ? '9px' : '11px';
    $headerMarginTop = $isPdf ? '10px' : '16px';
    $companyMetaMargin = $isPdf ? '8px' : '12px';
    $metaMarginBottom = $isPdf ? '10px' : '18px';
    $sectionTitleMargin = $isPdf ? '0 0 8px' : '0 0 14px';
    $footerNoteMargin = $isPdf ? '8px' : '14px';
    $showItemCopy = $isPdf ? 'none' : 'inline';
    $downloadVersion = (string) filemtime(__FILE__);
    $companyName = 'Northstar Retail Labs Pvt. Ltd.';
    $companyPhone = '+91 98765 43210';
    $companyAddress = '402 Meridian Towers, MG Road, Bengaluru, Karnataka 560001, India';
    $companyLogoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none">
        <rect width="120" height="120" rx="28" fill="#ffffff"/>
        <rect x="18" y="18" width="84" height="84" rx="24" fill="#D8FFF0"/>
        <path d="M35 77L54 40L63 59L72 48L85 77H35Z" fill="#0F766E"/>
        <circle cx="78" cy="40" r="8" fill="#D9A441"/>
    </svg>';
    $companyLogo = 'data:image/svg+xml;base64,' . base64_encode($companyLogoSvg);

    $css = <<<CSS
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
            color: #143042;
            background: {$pageBackground};
        }
        .page {
            max-width: 980px;
            margin: 0 auto;
            padding: {$pagePadding};
        }
        .invoice-card {
            background: #ffffff;
            border: 1px solid #dbe7ee;
            border-radius: {$cardRadius};
            overflow: hidden;
            box-shadow: {$cardShadow};
        }
        .invoice-header {
            padding: {$headerPadding};
            background: {$headerBackground};
            color: #ffffff;
        }
        .eyebrow {
            display: inline-block;
            padding: {$eyebrowPadding};
            border-radius: 999px;
            background: rgba(255,255,255,0.14);
            font-size: {$eyebrowSize};
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .header-grid {
            width: 100%;
            border-collapse: collapse;
            margin-top: {$headerMarginTop};
        }
        .header-grid td {
            vertical-align: top;
        }
        .brand-stack {
            width: 100%;
            border-collapse: collapse;
        }
        .brand-stack td {
            vertical-align: middle;
        }
        .logo-wrap {
            width: 72px;
        }
        .logo {
            width: 58px;
            height: 58px;
            display: block;
            border-radius: 18px;
            background: rgba(255,255,255,0.12);
            padding: 6px;
        }
        .brand-title {
            margin: 0 0 8px;
            font-size: {$brandTitleSize};
            font-weight: 700;
        }
        .brand-copy {
            margin: 0;
            font-size: {$brandCopySize};
            line-height: 1.6;
            color: rgba(255,255,255,0.82);
        }
        .company-meta {
            margin-top: {$companyMetaMargin};
            font-size: {$companyMetaSize};
            line-height: 1.6;
            color: rgba(255,255,255,0.82);
        }
        .status-badge {
            display: inline-block;
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(255,255,255,0.14);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .content {
            padding: {$contentPadding};
        }
        .meta-grid {
            width: 100%;
            border-collapse: separate;
            border-spacing: {$metaSpacing};
            margin: 0 -{$metaSpacing} {$metaMarginBottom};
        }
        .meta-grid td {
            width: 50%;
            padding: {$metaPadding};
            border: 1px solid #e0e8ed;
            border-radius: {$metaRadius};
            background: #f9fbfc;
        }
        .meta-label {
            display: block;
            margin-bottom: 8px;
            font-size: {$metaLabelSize};
            color: #6c7b88;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .meta-value {
            font-size: {$metaValueSize};
            font-weight: 700;
            color: #143042;
            line-height: 1.45;
            word-break: break-word;
        }
        .section {
            margin-top: {$sectionMargin};
        }
        .section-title {
            margin: {$sectionTitleMargin};
            font-size: {$sectionTitleSize};
            font-weight: 700;
            color: #143042;
        }
        .two-col {
            width: 100%;
            border-collapse: separate;
            border-spacing: {$twoColSpacing};
            margin: 0 -{$twoColSpacing};
        }
        .two-col td {
            width: 50%;
            vertical-align: top;
            padding: {$twoColPadding};
            border: 1px solid #e0e8ed;
            border-radius: {$metaRadius};
            background: #ffffff;
        }
        .detail-row {
            width: 100%;
            border-collapse: collapse;
        }
        .detail-row td {
            padding: {$detailPadding};
            border: none;
            background: transparent;
        }
        .detail-row td:first-child {
            color: #6c7b88;
            width: 42%;
            font-size: {$detailLabelSize};
        }
        .detail-row td:last-child {
            text-align: right;
            font-weight: 700;
            color: #143042;
            font-size: {$detailValueSize};
            line-height: 1.45;
            word-break: break-word;
        }
        .items-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e0e8ed;
            border-radius: 18px;
            overflow: hidden;
        }
        .items-table thead th {
            padding: {$tableHeadPadding};
            background: #eff6f4;
            font-size: {$tableHeadSize};
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #4e6473;
            text-align: left;
        }
        .items-table tbody td {
            padding: {$tableCellPadding};
            border-top: 1px solid #edf2f5;
            font-size: {$tableCellSize};
            vertical-align: top;
        }
        .items-table tbody tr:first-child td {
            border-top: none;
        }
        .item-name {
            display: block;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .item-copy {
            display: {$showItemCopy};
            color: #6c7b88;
            font-size: {$itemCopySize};
            line-height: 1.5;
        }
        .amount-cell {
            text-align: right;
            white-space: nowrap;
        }
        .footer-bar {
            margin-top: {$footerMargin};
            padding: {$footerPadding};
            border-radius: {$footerRadius};
            background: #143042;
            color: #ffffff;
        }
        .footer-bar table {
            width: 100%;
            border-collapse: collapse;
        }
        .footer-bar td:last-child {
            text-align: right;
            font-size: {$footerTotalSize};
            font-weight: 700;
        }
        .footer-note {
            margin-top: {$footerNoteMargin};
            font-size: {$footerNoteSize};
            color: #93a4b1;
            line-height: 1.6;
        }
        .actions {
            margin: 0 0 18px;
            text-align: right;
        }
        .button {
            display: inline-block;
            padding: 12px 16px;
            border-radius: 12px;
            background: #0f766e;
            color: #ffffff;
            text-decoration: none;
            font-weight: 700;
        }
    </style>
    CSS;

    ob_start();
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice <?= escapeInvoice($orderId) ?></title>
    <?= $css ?>
</head>
<body>
    <div class="page">
        <?php if (!$isPdf): ?>
            <div class="actions">
                <a class="button" href="invoice.php?order_id=<?= rawurlencode($orderId) ?>&download=1&v=<?= escapeInvoice($downloadVersion) ?>">Download PDF</a>
            </div>
        <?php endif; ?>
        <div class="invoice-card">
            <div class="invoice-header">
                <span class="eyebrow">Payment Invoice</span>
                <table class="header-grid">
                    <tr>
                        <td>
                            <table class="brand-stack">
                                <tr>
                                    <td class="logo-wrap">
                                        <img class="logo" src="<?= $companyLogo ?>" alt="Company logo" />
                                    </td>
                                    <td>
                                        <h1 class="brand-title"><?= escapeInvoice($companyName) ?></h1>
                                        <p class="brand-copy">Structured invoice generated from the backend checkout snapshot and Cashfree payment verification.</p>
                                        <div class="company-meta">
                                            <?= escapeInvoice($companyAddress) ?><br>
                                            <?= escapeInvoice($companyPhone) ?>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                        <td style="text-align:right; width: 220px;">
                            <span class="status-badge"><?= escapeInvoice($paymentStatus) ?></span>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="content">
                <table class="meta-grid">
                    <tr>
                        <td>
                            <span class="meta-label">Invoice Number</span>
                            <span class="meta-value"><?= escapeInvoice($orderId) ?></span>
                        </td>
                        <td>
                            <span class="meta-label">Invoice Date</span>
                            <span class="meta-value"><?= escapeInvoice(formatInvoiceDateTime($invoiceDate)) ?></span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <span class="meta-label">Payment ID</span>
                            <span class="meta-value"><?= escapeInvoice((string) ($payment['payment_id'] ?? 'Not available')) ?></span>
                        </td>
                        <td>
                            <span class="meta-label">Order Amount</span>
                            <span class="meta-value"><?= escapeInvoice(formatInvoiceCurrency($currency, $orderAmount)) ?></span>
                        </td>
                    </tr>
                </table>

                <table class="two-col section">
                    <tr>
                        <td>
                            <h2 class="section-title">Billed To</h2>
                            <table class="detail-row">
                                <tr><td>Name</td><td><?= escapeInvoice((string) ($customer['name'] ?? 'Not available')) ?></td></tr>
                                <tr><td>Email</td><td><?= escapeInvoice((string) ($customer['email'] ?? 'Not available')) ?></td></tr>
                                <tr><td>Phone</td><td><?= escapeInvoice((string) ($customer['phone'] ?? 'Not available')) ?></td></tr>
                            </table>
                        </td>
                        <td>
                            <h2 class="section-title">Payment Details</h2>
                            <table class="detail-row">
                                <tr><td>Status</td><td><?= escapeInvoice($paymentStatus) ?></td></tr>
                                <tr><td>Method</td><td><?= escapeInvoice((string) ($payment['payment_method'] ?? 'Not available')) ?></td></tr>
                                <tr><td>Paid At</td><td><?= escapeInvoice(formatInvoiceDateTime((string) ($payment['payment_time'] ?? ''))) ?></td></tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <div class="section">
                    <h2 class="section-title">Product Details</h2>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th style="width: 80px;">Qty</th>
                                <th style="width: 130px; text-align:right;">Unit Price</th>
                                <th style="width: 140px; text-align:right;">Line Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($items as $item): ?>
                                <tr>
                                    <td>
                                        <span class="item-name"><?= escapeInvoice((string) ($item['name'] ?? 'Product')) ?></span>
                                        <span class="item-copy"><?= escapeInvoice((string) ($item['description'] ?? '')) ?></span>
                                    </td>
                                    <td><?= (int) ($item['quantity'] ?? 0) ?></td>
                                    <td class="amount-cell"><?= escapeInvoice(formatInvoiceCurrency($currency, (float) ($item['unit_price'] ?? 0))) ?></td>
                                    <td class="amount-cell"><?= escapeInvoice(formatInvoiceCurrency($currency, (float) ($item['line_total'] ?? 0))) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <div class="footer-bar">
                    <table>
                        <tr>
                            <td>Total Payable</td>
                            <td><?= escapeInvoice(formatInvoiceCurrency($currency, $orderAmount)) ?></td>
                        </tr>
                    </table>
                    <div class="footer-note">
                        Payment reference: <?= escapeInvoice((string) ($payment['payment_id'] ?? 'Not available')) ?>.
                        This invoice is generated from your order record and verified Cashfree payment metadata.
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    <?php

    return (string) ob_get_clean();
}
