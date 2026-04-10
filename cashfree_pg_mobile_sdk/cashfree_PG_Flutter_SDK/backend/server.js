const express = require('express');
const axios = require('axios');
const config = require('./config.json');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Load config
const { cashfree } = config;
const baseUrl = cashfree.environment === 'sandbox'
  ? 'https://sandbox.cashfree.com'
  : 'https://api.cashfree.com';

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Create order endpoint
app.post('/create-order', async (req, res) => {
  try {
    console.log('Received request:', JSON.stringify(req.body));
    const { order_id } = req.body;

    // Generate order_id if not provided
    const finalOrderId = order_id || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Creating order with ID:', finalOrderId);

    const payload = {
      customer_details: {
        customer_email: '',
        customer_phone: '8971520311',
        customer_name: 'Rahul Raman',
        customer_id: 'customerrahul_1',
      },
      order_amount: 10,
      order_currency: 'INR',
      order_note: 'Flutter SDK Test Order',
      order_meta: {
        return_url: '',
        notify_url: '',
      },
    };

    console.log('Calling Cashfree API with payload:', JSON.stringify(payload));

    const response = await axios.post(`${baseUrl}/pg/orders`, payload, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-version': cashfree.apiVersion,
        'x-client-id': cashfree.clientId,
        'x-client-secret': cashfree.clientSecret,
      },
    });

    console.log('Cashfree response:', response.status, response.data);

    // Return order_id and payment_session_id
    res.json({
      order_id: response.data.order_id || finalOrderId,
      payment_session_id: response.data.payment_session_id,
    });
  } catch (error) {
    console.error('Error creating order:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data || 'Failed to create order' });
  }
});

// Verify order status endpoint
app.get('/verify-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('\n📍 Verifying order:', orderId);

    let response = await axios.get(`${baseUrl}/pg/orders/${orderId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-version': cashfree.apiVersion,
        'x-client-id': cashfree.clientId,
        'x-client-secret': cashfree.clientSecret,
      },
    });

    console.log('✅ Cashfree API Response received:');
    console.log('   Status:', response.status);
    console.log('   Full Response:', JSON.stringify(response.data, null, 2));

    let { order_id, order_status, order_amount, cf_payment_id, payment_completion_time, payments } = response.data;
    
    // If payment details not available in main fields, check the payments array
    if (payments && payments.length > 0 && !cf_payment_id) {
      const lastPayment = payments[payments.length - 1];
      cf_payment_id = lastPayment.cf_payment_id || cf_payment_id;
      payment_completion_time = lastPayment.payment_time || payment_completion_time;
      console.log('\n📊 Extracted from payments array:');
      console.log('   cf_payment_id:', cf_payment_id);
      console.log('   payment_time:', payment_completion_time);
    }

    // If payments array was not present on the order response, try the dedicated payments endpoint
    if ((!payments || payments.length === 0) && !cf_payment_id) {
      try {
        console.log('\n🔎 Payments not present on order response — querying /pg/orders/:orderId/payments');
        const paymentsResp = await axios.get(`${baseUrl}/pg/orders/${orderId}/payments`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-api-version': cashfree.apiVersion,
            'x-client-id': cashfree.clientId,
            'x-client-secret': cashfree.clientSecret,
          },
        });

        const paymentsData = paymentsResp.data;
        if (Array.isArray(paymentsData) && paymentsData.length > 0) {
          const lastPayment = paymentsData[paymentsData.length - 1];
          cf_payment_id = lastPayment.cf_payment_id || cf_payment_id;
          payment_completion_time = lastPayment.payment_completion_time || lastPayment.payment_time || payment_completion_time;
          console.log('\n📥 Extracted from /payments endpoint:');
          console.log('   cf_payment_id:', cf_payment_id);
          console.log('   payment_completion_time:', payment_completion_time);
        }
      } catch (err) {
        console.warn('\n⚠️ Failed to fetch payments endpoint:', err.message || err);
      }
    }
    
    // If still no cf_payment_id but order is PAID, retry after 500ms
    if (!cf_payment_id && order_status === 'PAID') {
      console.log('\n⏳ Payment details not yet available, retrying...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      response = await axios.get(`${baseUrl}/pg/orders/${orderId}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-version': cashfree.apiVersion,
          'x-client-id': cashfree.clientId,
          'x-client-secret': cashfree.clientSecret,
        },
      });
      
      const retryData = response.data;
      cf_payment_id = retryData.cf_payment_id || cf_payment_id;
      payment_completion_time = retryData.payment_completion_time || payment_completion_time;
      
      if (retryData.payments && retryData.payments.length > 0 && !cf_payment_id) {
        const lastPayment = retryData.payments[retryData.payments.length - 1];
        cf_payment_id = lastPayment.cf_payment_id || cf_payment_id;
        payment_completion_time = lastPayment.payment_time || payment_completion_time;
      }
      
      console.log('✅ Retry successful:');
      console.log('   cf_payment_id:', cf_payment_id);
      console.log('   payment_completion_time:', payment_completion_time);
    }
    
    console.log('\n📦 Final Extracted Fields:');
    console.log('   order_id:', order_id);
    console.log('   order_status:', order_status);
    console.log('   order_amount:', order_amount);
    console.log('   cf_payment_id:', cf_payment_id || 'NOT_AVAILABLE');
    console.log('   payment_completion_time:', payment_completion_time || 'NOT_AVAILABLE');

    // Only return the essential fields needed by the app
    res.json({
      order_id,
      order_status,
      order_amount,
      cf_payment_id: cf_payment_id || null,
      payment_completion_time: payment_completion_time || null,
    });
  } catch (error) {
    console.error('\n❌ Error verifying order:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data || 'Failed to verify order' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
