<?php

namespace App\Controllers;
use CodeIgniter\Controller;

class CashfreeController extends Controller
{
    public function index()
    {
        return view('cashfree_view');
    }

    public function confirm()
    {
        $order_id = uniqid("Order_1");
        $order_amount = "1.00";
        $order_currency = "INR";
        $customer_details = [
            "customer_id" => "7112",
            "customer_email" => "johndoe@gmail.com",
            "customer_phone" => "9876543210"
        ];

        $data = [
            'order_id' => $order_id,
            'order_amount' => $order_amount,
            'order_currency' => $order_currency,
            'customer_details' => $customer_details,
            "order_meta" => [
                "return_url" => site_url('/thankyou'),
                "notify_url" => site_url('cashfree/notify')
            ],
        ];
        $clientId = env('CF_CLIENT_ID');
        $clientSecret = env('CF_CLIENT_SECRET');

        $headers = [
            'Content-Type: application/json',
            'x-api-version: 2025-01-01',
            "x-client-id: $clientId",
            "x-client-secret: $clientSecret"
        ];

        $environment = 'sandbox';
        $url = $environment === 'sandbox' 
            ? 'https://sandbox.cashfree.com/pg/orders' 
            : 'https://api.cashfree.com/pg/orders';

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => $headers
        ]);

        $response = curl_exec($curl);
        $err = curl_error($curl);
        curl_close($curl);

        if ($err) {
            return $this->response->setJSON([
                'status' => 0,
                'message' => 'cURL Error: ' . $err
            ]);
        } else {
            $res = json_decode($response, true);
            return $this->response->setJSON([
                'status' => 1,
                'payment_session_id' => $res['payment_session_id'],
                'environment' => $environment,
                'order_id' => $res['order_id']
            ]);
        }
    }

    public function thankyou()
    {
        $status = $this->request->getGet('status') ?? 'unknown';
        return view('cashfree_thankyou', ['status' => $status]);
    }

    public function notify()
    {
        log_message('info', 'Cashfree Notify Payload: ' . json_encode($this->request->getPost()));
        return $this->response->setStatusCode(200);
    }

    public function checkOrder()
    {
        $orderId = $this->request->getGet('order_id');
        if (!$orderId) {
            return $this->response->setJSON(['payment_status' => "FAILED"]);
        }

        $clientId = env('CF_CLIENT_ID');
        $clientSecret = env('CF_CLIENT_SECRET');

        $headers = [
            'Accept: application/json',
            'x-api-version: 2025-01-01',
            "x-client-id: $clientId",
            "x-client-secret: $clientSecret"
        ];

        $url = "https://sandbox.cashfree.com/pg/orders/{$orderId}/payments";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers
        ]);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            return $this->response->setJSON(['payment_status' => "FAILED"]);
        }

        $payments = json_decode($response, true);

        if (!is_array($payments) || empty($payments)) {
            return $this->response->setJSON(['payment_status' => "FAILED"]);
        }

        $status = $payments[0]['payment_status'] == 'SUCCESS' ? 'SUCCESS' : 'FAILED';

        return $this->response->setJSON(['payment_status' => $status]);
    }
}
