<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../order_storage.php';
require_once __DIR__ . '/../invoice_renderer.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$orderId = trim($_GET['order_id'] ?? ($_GET['orderId'] ?? ''));
$download = trim($_GET['download'] ?? '') === '1';
$snapshot = $orderId !== '' ? loadOrderSnapshot($orderId) : null;

if (!is_array($snapshot)) {
    http_response_code(404);
    echo 'Invoice not found.';
    exit;
}

$html = renderInvoiceHtml($snapshot, $orderId, false);

if ($download) {
    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $options->set('isRemoteEnabled', false);
    $options->setDefaultFont('DejaVu Sans');

    $pdf = new Dompdf($options);
    $pdf->loadHtml(renderInvoiceHtml($snapshot, $orderId, true));
    $pdf->setPaper('A4', 'portrait');
    $pdf->render();

    header('Content-Type: application/pdf');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Cache-Control: post-check=0, pre-check=0', false);
    header('Pragma: no-cache');
    header('Expires: 0');
    header('Content-Disposition: attachment; filename="invoice-' . preg_replace('/[^a-zA-Z0-9_-]+/', '-', $orderId) . '.pdf"');
    echo $pdf->output();
    exit;
}
?>
<?= $html ?>
