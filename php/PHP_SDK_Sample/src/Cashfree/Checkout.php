<?php

declare(strict_types=1);

namespace Cashfree;

use Cashfree\Model\CreateOrderRequest;
use Cashfree\Model\CustomerDetails;
use Cashfree\Model\OrderMeta;

class Checkout
{
    private Client $client;

    public function __construct(Client $client)
    {
        $this->client = $client;
    }

    public function createOrder(
        string $orderId,
        float $orderAmount,
        string $customerName,
        string $customerPhone,
        string $customerEmail,
        string $orderCurrency = 'INR',
        array $orderMeta = []
    ): array {
        $customerIdSource = $customerEmail !== '' ? $customerEmail : $customerPhone;
        $customerId = 'customer-' . trim((string) preg_replace('/[^a-zA-Z0-9_-]+/', '-', strtolower($customerIdSource)), '-');

        if ($customerId === 'customer-') {
            $customerId = 'customer-' . $orderId;
        }

        $customerDetails = new CustomerDetails();
        $customerDetails->setCustomerId($customerId);
        $customerDetails->setCustomerName($customerName);
        $customerDetails->setCustomerEmail($customerEmail);
        $customerDetails->setCustomerPhone($customerPhone);

        $request = new CreateOrderRequest();
        $request->setOrderId($orderId);
        $request->setOrderAmount(round($orderAmount, 2));
        $request->setOrderCurrency($orderCurrency);
        $request->setCustomerDetails($customerDetails);

        if (!empty($orderMeta)) {
            $meta = new OrderMeta();

            if (isset($orderMeta['return_url']) && is_string($orderMeta['return_url']) && $orderMeta['return_url'] !== '') {
                $meta->setReturnUrl($orderMeta['return_url']);
            }

            if (isset($orderMeta['notify_url']) && is_string($orderMeta['notify_url']) && $orderMeta['notify_url'] !== '') {
                $meta->setNotifyUrl($orderMeta['notify_url']);
            }

            if (isset($orderMeta['payment_methods'])) {
                $meta->setPaymentMethods($orderMeta['payment_methods']);
            }

            $request->setOrderMeta($meta);
        }

        return $this->client->createOrder($request);
    }

    public function createOrderToken(
        string $orderId,
        float $orderAmount,
        string $customerName,
        string $customerPhone,
        string $customerEmail,
        string $orderCurrency = 'INR',
        array $orderMeta = []
    ): array {
        return $this->createOrder(
            $orderId,
            $orderAmount,
            $customerName,
            $customerPhone,
            $customerEmail,
            $orderCurrency,
            $orderMeta
        );
    }

    public function getOrderStatus(string $orderId): array
    {
        return $this->client->getOrderStatus($orderId);
    }

    public function getOrderPayments(string $orderId): array
    {
        return $this->client->getOrderPayments($orderId);
    }
}
