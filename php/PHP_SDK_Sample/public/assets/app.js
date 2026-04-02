function setStatus(message, type = '') {
    const statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) {
        return;
    }

    statusMessage.textContent = message;
    statusMessage.className = `status-message${type ? ` ${type}` : ''}`;
}

function formatMoney(value, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(value);
}

function clampQuantity(input, nextValue) {
    const min = parseInt(input.min || '0', 10);
    const max = parseInt(input.max || '10', 10);
    return Math.min(max, Math.max(min, nextValue));
}

function updateCartSummary() {
    const qtyInputs = Array.from(document.querySelectorAll('.product-qty'));
    const totalNode = document.getElementById('grandTotal');
    const countNode = document.getElementById('selectedItemsCount');
    const previewNode = document.getElementById('cartPreview');
    const amountField = document.getElementById('computedAmount');

    if (!totalNode || !countNode || !previewNode || !amountField || qtyInputs.length === 0) {
        return;
    }

    const currency = totalNode.dataset.currency || 'INR';
    let selectedItems = 0;
    let grandTotal = 0;
    const preview = [];

    qtyInputs.forEach((input) => {
        const quantity = Math.max(0, parseInt(input.value || '0', 10) || 0);
        const unitPrice = parseFloat(input.dataset.productPrice || '0');
        const name = input.dataset.productName || 'Product';

        if (quantity > 0) {
            selectedItems += quantity;
            grandTotal += unitPrice * quantity;
            preview.push(`${name} x ${quantity}`);
        }
    });

    amountField.value = grandTotal.toFixed(2);
    countNode.textContent = String(selectedItems);
    totalNode.textContent = formatMoney(grandTotal, currency);

    if (preview.length === 0) {
        previewNode.innerHTML = '<div class="empty-cart">Select one or more products to continue.</div>';
        return;
    }

    previewNode.innerHTML = preview
        .map((item) => `<div class="cart-pill">${item}</div>`)
        .join('');
}

async function launchCashfreeCheckout(mountNode) {
    const paymentSessionId = mountNode.dataset.paymentSessionId || '';
    const mode = mountNode.dataset.cashfreeMode || 'sandbox';
    const failureUrl = mountNode.dataset.failureUrl || '';

    if (!paymentSessionId) {
        throw new Error('Payment session ID is missing.');
    }

    if (typeof window.Cashfree !== 'function') {
        throw new Error('Cashfree JS SDK did not load.');
    }

    const cashfree = window.Cashfree({
        mode,
    });

    setStatus('Processing to payment page...', 'loading');

    try {
        await cashfree.checkout({
            paymentSessionId,
            redirectTarget: '_self',
        });
    } catch (error) {
        if (failureUrl) {
            const separator = failureUrl.includes('?') ? '&' : '?';
            const message = error instanceof Error ? error.message : 'checkout_failed';
            window.location.href = `${failureUrl}${separator}reason=${encodeURIComponent(message)}`;
            return;
        }

        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkoutForm');
    const buyButton = document.getElementById('buyButton');
    const mountNode = document.getElementById('cashfreeCheckoutMount');
    const qtyInputs = Array.from(document.querySelectorAll('.product-qty'));

    qtyInputs.forEach((input) => {
        input.addEventListener('input', () => {
            input.value = String(clampQuantity(input, parseInt(input.value || '0', 10) || 0));
            updateCartSummary();
        });
    });

    document.addEventListener('click', (event) => {
        const button = event.target instanceof Element ? event.target.closest('.qty-button') : null;
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        event.preventDefault();

        const stepper = button.closest('.qty-stepper');
        const input = stepper ? stepper.querySelector('.product-qty') : null;
        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        const currentValue = parseInt(input.value || '0', 10) || 0;
        const delta = button.dataset.qtyAction === 'increase' ? 1 : -1;
        input.value = String(clampQuantity(input, currentValue + delta));
        updateCartSummary();
    });

    if (qtyInputs.length > 0) {
        updateCartSummary();
    }

    if (checkoutForm && buyButton) {
        checkoutForm.addEventListener('submit', (event) => {
            updateCartSummary();

            const amountField = document.getElementById('computedAmount');
            if (amountField && parseFloat(amountField.value || '0') <= 0) {
                event.preventDefault();
                setStatus('Please select at least one product before checkout.', 'error');
                return;
            }

            buyButton.disabled = true;
            setStatus('Creating your order securely on the server...', 'loading');
        });
    }

    if (mountNode) {
        launchCashfreeCheckout(mountNode).catch((error) => {
            setStatus(`Error: ${error.message}`, 'error');
        });
    }
});
