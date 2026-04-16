(function () {
    const form = document.querySelector('#orderForm');
    const orderIdInput = document.querySelector('#orderId');
    const amountInput = document.querySelector('#amount');
    const generateButton = document.querySelector('#generateOrderId');
    const payButton = document.querySelector('#payButton');
    const statusBox = document.querySelector('#status');
    let checkoutMode = 'sandbox';

    const setStatus = (message, tone) => {
        statusBox.textContent = message;
        statusBox.dataset.tone = tone || 'neutral';
    };

    const api = async (url, options) => {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            ...options
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || 'Request failed.');
        }
        return body;
    };

    const loadConfig = async () => {
        try {
            const config = await api('/api/config');
            document.querySelector('#sdkType').textContent = config.sdkType;
            document.querySelector('#sdkVersion').textContent = config.sdkVersion;
            document.querySelector('#environment').textContent = config.environment;
            checkoutMode = config.environment === 'PRODUCTION' ? 'production' : 'sandbox';
            if (!config.credentialsConfigured) {
                setStatus('Server credentials are not configured. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET before creating an order.', 'warn');
            }
        } catch (error) {
            setStatus(error.message, 'error');
        }
    };

    generateButton.addEventListener('click', async () => {
        try {
            const result = await api('/api/orders/generate-id');
            orderIdInput.value = result.orderId;
            orderIdInput.focus();
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        payButton.disabled = true;
        setStatus('Creating Cashfree order...', 'neutral');

        try {
            const order = await api('/api/orders', {
                method: 'POST',
                body: JSON.stringify({
                    orderId: orderIdInput.value.trim(),
                    amount: amountInput.value
                })
            });

            if (!order.paymentSessionId) {
                throw new Error('Cashfree did not return a payment session id.');
            }

            setStatus(`Order ${order.orderId} created. Opening Cashfree checkout...`, 'success');
            const cashfree = Cashfree({ mode: checkoutMode });
            await cashfree.checkout({
                paymentSessionId: order.paymentSessionId,
                redirectTarget: '_self'
            });
        } catch (error) {
            setStatus(error.message, 'error');
            payButton.disabled = false;
        }
    });

    loadConfig();
})();
