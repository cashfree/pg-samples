<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$payload = file_get_contents('php://input');
if ($payload === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No data received']);
    exit;
}

// In a real integration, verify the webhook signature and process the event.

http_response_code(200);
echo json_encode(['success' => true, 'message' => 'Webhook received']);
