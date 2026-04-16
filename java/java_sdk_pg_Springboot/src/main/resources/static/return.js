(function () {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id') || params.get('orderId');
    const orderIdBox = document.querySelector('#orderId');
    const statusBox = document.querySelector('#orderStatus');
    const detailsBox = document.querySelector('#details');
    const paymentDetailsBox = document.querySelector('#paymentDetails');
    const failedReasonCard = document.querySelector('#failedReasonCard');
    let attempts = 0;

    const terminalStatuses = new Set(['EXPIRED', 'CANCELLED', 'TERMINATED']);

    const render = (message, tone) => {
        detailsBox.textContent = message;
        detailsBox.dataset.tone = tone || 'neutral';
    };

    const valueOrDash = (value) => value || '-';

    const hasTransactionDetails = (payment) => Boolean(
        payment && (
            payment.cfPaymentId ||
            payment.bankReference ||
            payment.paymentGroup ||
            payment.paymentTime ||
            payment.paymentMessage
        )
    );

    const renderPaymentDetails = (payment) => {
        if (!payment) {
            paymentDetailsBox.hidden = true;
            return;
        }

        paymentDetailsBox.hidden = false;
        document.querySelector('#cfPaymentId').textContent = valueOrDash(payment.cfPaymentId);
        document.querySelector('#bankReference').textContent = valueOrDash(payment.bankReference);
        document.querySelector('#paymentGroup').textContent = valueOrDash(payment.paymentGroup);
        document.querySelector('#paymentTime').textContent = valueOrDash(payment.paymentTime);

        const failed = payment.paymentStatus === 'FAILED';
        failedReasonCard.hidden = !failed;
        document.querySelector('#paymentMessage').textContent = failed ? valueOrDash(payment.paymentMessage) : '-';
    };

    const pollStatus = async () => {
        attempts += 1;
        try {
            const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
                credentials: 'same-origin',
                cache: 'no-store'
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message || 'Unable to fetch order status.');
            }

            statusBox.textContent = body.orderStatus || 'UNKNOWN';
            renderPaymentDetails(body.payment);
            const waitingForTransaction = body.orderStatus === 'PAID' && !hasTransactionDetails(body.payment);
            const message = waitingForTransaction
                ? `Amount: ${body.orderCurrency || 'INR'} ${body.orderAmount || '-'} | Cashfree order: ${body.cfOrderId || '-'} | Waiting for transaction details...`
                : `Amount: ${body.orderCurrency || 'INR'} ${body.orderAmount || '-'} | Cashfree order: ${body.cfOrderId || '-'}`;
            render(message, waitingForTransaction ? 'warn' : 'success');

            if ((!terminalStatuses.has(body.orderStatus) || waitingForTransaction) && attempts < 30) {
                window.setTimeout(pollStatus, 3000);
            }
        } catch (error) {
            statusBox.textContent = 'Unable to check';
            render(error.message, 'error');
            if (attempts < 5) {
                window.setTimeout(pollStatus, 3000);
            }
        }
    };

    if (!orderId || !/^[A-Za-z0-9_-]{3,50}$/.test(orderId)) {
        orderIdBox.textContent = '-';
        statusBox.textContent = 'Missing order ID';
        render('The return URL did not include a valid order_id parameter.', 'error');
        return;
    }

    orderIdBox.textContent = orderId;
    pollStatus();
})();
