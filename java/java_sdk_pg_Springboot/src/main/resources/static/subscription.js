(function () {
    const params = new URLSearchParams(window.location.search);

    const $ = (sel) => document.querySelector(sel);

    const createSection = $('#createSection');
    const manageSection = $('#manageSection');
    const subscriptionForm = $('#subscriptionForm');
    const subscriptionIdInput = $('#subscriptionId');
    const maxAmountInput = $('#maxAmount');
    const generateSubIdBtn = $('#generateSubId');
    const createButton = $('#createButton');
    const createStatus = $('#createStatus');

    const subIdEl = $('#subId');
    const cfSubIdEl = $('#cfSubId');
    const subStatusEl = $('#subStatus');
    const manageStatus = $('#manageStatus');
    const paymentsContainer = $('#paymentsContainer');

    const btnActivate = $('#btnActivate');
    const btnPause = $('#btnPause');
    const btnCancel = $('#btnCancel');
    const startOverBtn = $('#startOver');
    const refreshPaymentsBtn = $('#refreshPayments');

    const authBanner = $('#authBanner');
    const authBannerIcon = $('#authBannerIcon');
    const authBannerTitle = $('#authBannerTitle');
    const authBannerSub = $('#authBannerSub');

    let checkoutMode = 'sandbox';
    let activeSubscriptionId = null;

    const setStatus = (el, message, tone) => {
        el.textContent = message;
        el.dataset.tone = tone || 'neutral';
    };

    const api = async (url, options) => {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            ...options
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || 'Request failed.');
        return body;
    };

    const loadConfig = async () => {
        try {
            const config = await api('/api/config');
            $('#sdkType').textContent = config.sdkType;
            $('#sdkVersion').textContent = config.sdkVersion;
            $('#environment').textContent = config.environment;
            checkoutMode = config.environment === 'PRODUCTION' ? 'production' : 'sandbox';
            if (!config.credentialsConfigured) {
                setStatus(createStatus,
                    'Server credentials are not configured. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET.',
                    'warn');
            }
        } catch (e) {
            setStatus(createStatus, e.message, 'error');
        }
    };

    const AUTH_BANNER_CONFIG = {
        ACTIVE:      { tone: 'success', icon: '✓', title: 'Authorization Successful', sub: 'Your subscription is now active. Charges will be initiated as per the plan.' },
        INITIALIZED: { tone: 'warn',    icon: '○', title: 'Authorization Pending',    sub: 'The mandate was not completed. Please authorize the subscription to activate it.' },
        PAUSED:      { tone: 'warn',    icon: '⏸', title: 'Subscription Paused',      sub: 'Your subscription is paused. Use Activate below to resume it.' },
        CANCELLED:   { tone: 'error',   icon: '✕', title: 'Subscription Cancelled',   sub: 'This subscription has been cancelled and cannot be reactivated.' },
    };

    const showAuthBanner = (status) => {
        const cfg = AUTH_BANNER_CONFIG[(status || '').toUpperCase()];
        if (!cfg) { authBanner.hidden = true; return; }
        authBannerIcon.textContent = cfg.icon;
        authBannerTitle.textContent = cfg.title;
        authBannerSub.textContent = cfg.sub;
        authBanner.dataset.tone = cfg.tone;
        authBanner.hidden = false;
    };

    const showManagePhase = (sub, fromReturn = false) => {
        activeSubscriptionId = sub.subscriptionId;
        subIdEl.textContent = sub.subscriptionId || '-';
        cfSubIdEl.textContent = sub.cfSubscriptionId || '-';
        subStatusEl.textContent = sub.subscriptionStatus || '-';
        subStatusEl.dataset.status = (sub.subscriptionStatus || '').toUpperCase();
        updateManageButtons(sub.subscriptionStatus);
        if (fromReturn) {
            showAuthBanner(sub.subscriptionStatus);
        } else {
            authBanner.hidden = true;
        }
        createSection.hidden = true;
        manageSection.hidden = false;
    };

    const updateManageButtons = (status) => {
        const s = (status || '').toUpperCase();
        btnActivate.disabled = s === 'ACTIVE' || s === 'CANCELLED';
        btnPause.disabled = s !== 'ACTIVE';
        btnCancel.disabled = s === 'CANCELLED';
    };

    const renderPayments = (payments) => {
        if (!payments || payments.length === 0) {
            paymentsContainer.innerHTML = '<p class="empty-state">No payments yet.</p>';
            return;
        }
        const rows = payments.map(p => `
            <tr>
                <td>${p.cfPaymentId || '-'}</td>
                <td>${p.paymentId || '-'}</td>
                <td class="amount">INR ${p.paymentAmount != null ? Number(p.paymentAmount).toFixed(2) : '-'}</td>
                <td><span class="pill pill--${(p.paymentStatus || '').toLowerCase()}">${p.paymentStatus || '-'}</span></td>
                <td>${p.paymentScheduleDate || '-'}</td>
            </tr>`).join('');
        paymentsContainer.innerHTML = `
            <table class="payments-table">
                <thead>
                    <tr>
                        <th>CF Payment ID</th>
                        <th>Payment ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Scheduled</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    };

    const fetchAndShowSubscription = async (subscriptionId, fromReturn = false) => {
        setStatus(manageStatus, 'Loading subscription...', 'neutral');
        try {
            const sub = await api(`/api/subscriptions/${encodeURIComponent(subscriptionId)}`);
            showManagePhase(sub, fromReturn);
            setStatus(manageStatus, '', 'neutral');
            await loadPayments(subscriptionId);
        } catch (e) {
            setStatus(createStatus, e.message, 'error');
        }
    };

    const loadPayments = async (subscriptionId) => {
        try {
            const payments = await api(`/api/subscriptions/${encodeURIComponent(subscriptionId)}/payments`);
            renderPayments(payments);
        } catch (e) {
            paymentsContainer.innerHTML = `<p class="empty-state" style="color:var(--danger)">${e.message}</p>`;
        }
    };

    generateSubIdBtn.addEventListener('click', async () => {
        try {
            const result = await api('/api/subscriptions/generate-id');
            subscriptionIdInput.value = result.subscriptionId;
            subscriptionIdInput.focus();
        } catch (e) {
            setStatus(createStatus, e.message, 'error');
        }
    });

    subscriptionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        createButton.disabled = true;
        setStatus(createStatus, 'Creating subscription...', 'neutral');

        try {
            const sub = await api('/api/subscriptions', {
                method: 'POST',
                body: JSON.stringify({
                    subscriptionId: subscriptionIdInput.value.trim(),
                    maxAmount: maxAmountInput.value
                })
            });

            if (!sub.subscriptionSessionId) {
                throw new Error('No subscription session ID returned. Authorization may already be complete.');
            }

            setStatus(createStatus,
                `Subscription ${sub.subscriptionId} created. Opening authorization...`, 'success');

            const cashfree = Cashfree({ mode: checkoutMode });
            await cashfree.subscriptionsCheckout({
                subsSessionId: sub.subscriptionSessionId,
                redirectTarget: '_self'
            });
        } catch (e) {
            setStatus(createStatus, e.message, 'error');
            createButton.disabled = false;
        }
    });

    [btnActivate, btnPause, btnCancel].forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.action;
            [btnActivate, btnPause, btnCancel].forEach(b => b.disabled = true);
            setStatus(manageStatus, `Sending ${action}...`, 'neutral');
            try {
                const sub = await api(
                    `/api/subscriptions/${encodeURIComponent(activeSubscriptionId)}/manage`,
                    { method: 'POST', body: JSON.stringify({ action }) }
                );
                showManagePhase(sub);
                setStatus(manageStatus, `Action ${action} applied. Status: ${sub.subscriptionStatus}`, 'success');
                await loadPayments(activeSubscriptionId);
            } catch (e) {
                setStatus(manageStatus, e.message, 'error');
                updateManageButtons(subStatusEl.textContent);
            }
        });
    });

    refreshPaymentsBtn.addEventListener('click', () => {
        if (activeSubscriptionId) loadPayments(activeSubscriptionId);
    });

    startOverBtn.addEventListener('click', () => {
        activeSubscriptionId = null;
        manageSection.hidden = true;
        createSection.hidden = false;
        subscriptionIdInput.value = '';
        setStatus(createStatus, '', 'neutral');
        history.replaceState(null, '', '/subscription.html');
    });

    // Auto-load if returning from Cashfree checkout
    const returnedSubId = params.get('subscription_id');
    if (returnedSubId) {
        loadConfig().then(() => fetchAndShowSubscription(returnedSubId, true));
    } else {
        loadConfig();
    }
})();
