<?php

declare(strict_types=1);

namespace Cashfree;

use Cashfree\ApiException;
use Cashfree\Cashfree as CashfreeSdk;
use RuntimeException;

class Client
{
    private const API_VERSION = '2025-01-01';

    private CashfreeSdk $sdk;

    public function __construct(string $appId, string $secretKey, string $environment = 'test')
    {
        $sdkEnvironment = $environment === 'production'
            ? (new CashfreeSdk(0, '', '', '', '', '', false))->PRODUCTION
            : (new CashfreeSdk(0, '', '', '', '', '', false))->SANDBOX;

        $this->sdk = new CashfreeSdk(
            $sdkEnvironment,
            $appId,
            $secretKey,
            '',
            '',
            '',
            false
        );
    }

    public function createOrder($payload): array
    {
        try {
            $response = $this->sdk->PGCreateOrder($payload);
        } catch (ApiException $exception) {
            throw $this->toRuntimeException($exception);
        } catch (\Throwable $exception) {
            throw new RuntimeException('Cashfree SDK create order failed: ' . $exception->getMessage(), 0, $exception);
        }

        return $this->normalizeSdkResponse($response);
    }

    public function createOrderToken($payload): array
    {
        return $this->createOrder($payload);
    }

    public function getOrderStatus(string $orderId): array
    {
        try {
            $response = $this->sdk->PGFetchOrder($orderId);
        } catch (ApiException $exception) {
            throw $this->toRuntimeException($exception);
        } catch (\Throwable $exception) {
            throw new RuntimeException('Cashfree SDK fetch order failed: ' . $exception->getMessage(), 0, $exception);
        }

        return $this->normalizeSdkResponse($response);
    }

    public function getOrderPayments(string $orderId): array
    {
        try {
            $response = $this->sdk->PGOrderFetchPayments($orderId);
        } catch (ApiException $exception) {
            throw $this->toRuntimeException($exception);
        } catch (\Throwable $exception) {
            throw new RuntimeException('Cashfree SDK fetch order payments failed: ' . $exception->getMessage(), 0, $exception);
        }

        return $this->normalizeSdkResponse($response);
    }

    private function normalizeSdkResponse(array $response): array
    {
        $body = $response[0] ?? null;
        if (!is_object($body) && !is_array($body)) {
            throw new RuntimeException('Cashfree SDK returned an unexpected response shape.');
        }

        $decoded = json_decode(json_encode($body), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException('Unable to parse Cashfree SDK response: ' . json_last_error_msg());
        }

        return $decoded;
    }

    private function toRuntimeException(ApiException $exception): RuntimeException
    {
        $details = $exception->getResponseBody();
        if (is_object($details) || is_array($details)) {
            $encoded = json_encode($details);
            if (is_string($encoded) && $encoded !== '') {
                return new RuntimeException('Cashfree SDK error: ' . $encoded, 0, $exception);
            }
        }

        if (is_string($details) && $details !== '') {
            return new RuntimeException('Cashfree SDK error: ' . $details, 0, $exception);
        }

        return new RuntimeException('Cashfree SDK error: ' . $exception->getMessage(), 0, $exception);
    }
}
