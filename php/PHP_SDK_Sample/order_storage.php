<?php

declare(strict_types=1);

function orderStorageDirectory(): string
{
    return __DIR__ . '/storage/orders';
}

function ensureOrderStorageDirectory(): void
{
    $directory = orderStorageDirectory();
    if (!is_dir($directory)) {
        mkdir($directory, 0775, true);
    }
}

function orderStoragePath(string $orderId): string
{
    $safeOrderId = preg_replace('/[^a-zA-Z0-9_-]+/', '-', $orderId);
    return orderStorageDirectory() . '/' . $safeOrderId . '.json';
}

function saveOrderSnapshot(string $orderId, array $payload): void
{
    ensureOrderStorageDirectory();
    file_put_contents(
        orderStoragePath($orderId),
        json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
    );
}

function loadOrderSnapshot(string $orderId): ?array
{
    $path = orderStoragePath($orderId);
    if (!is_file($path)) {
        return null;
    }

    $content = file_get_contents($path);
    if (!is_string($content) || $content === '') {
        return null;
    }

    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : null;
}
