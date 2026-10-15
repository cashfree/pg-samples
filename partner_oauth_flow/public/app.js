const output = document.querySelector("#output");
const authLink = document.querySelector("#authLink");
const checkoutButton = document.querySelector("#checkoutButton");
let lastPaymentSessionId = "";
let checkoutMode;

document.querySelector("#generateMerchantId").addEventListener("click", () => {
  const input = document.querySelector("#merchantReference");
  input.value = `m_${crypto.randomUUID().replaceAll("-", "")}`;
  authLink.removeAttribute("href");
  authLink.textContent = "";
  input.focus();
});

document.querySelector("#linkForm").addEventListener("submit", async event => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget));
  const result = await request("/api/oauth/auth-link", { method: "POST", body: payload });
  if (result.auth_link) {
    authLink.href = result.auth_link;
    authLink.textContent = "Open Cashfree consent screen";
  }
});

document.querySelector("#orderForm").addEventListener("submit", async event => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget));
  lastPaymentSessionId = "";
  checkoutButton.disabled = true;
  const result = await request("/api/orders", { method: "POST", body: payload });
  lastPaymentSessionId = result.payment_session_id || "";
  checkoutButton.disabled = !lastPaymentSessionId;
});

checkoutButton.addEventListener("click", () => {
  if (!lastPaymentSessionId || !checkoutMode || !window.Cashfree) return;
  const cashfree = Cashfree({ mode: checkoutMode });
  cashfree.checkout({ paymentSessionId: lastPaymentSessionId, redirectTarget: "_self" });
});

document.querySelector("#refreshMerchants").addEventListener("click", loadMerchants);

async function loadConfig() {
  const config = await request("/api/config", { quiet: true });
  checkoutMode = config.env;
  document.querySelector("#configLine").textContent =
    `${config.env} | return: ${config.returnUrl} | redirect: ${config.redirectUrl} | partner key: ${config.hasPartnerApiKey ? "set" : "missing"} | oauth client: ${config.hasOAuthClientId ? "set" : "missing"}`;
}

async function loadMerchants() {
  const merchants = await request("/api/merchants", { quiet: true });
  const list = document.querySelector("#merchantList");
  if (!merchants.length) {
    list.innerHTML = "<p>No linked merchants yet.</p>";
    return;
  }
  list.innerHTML = "";
  for (const merchant of merchants) {
    const row = document.createElement("div");
    row.className = "merchant";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(merchant.merchant_id)}</strong>
        <span>${escapeHtml(merchant.connection_status || "Linked")} | expires ${escapeHtml(merchant.expires_at || "unknown")}</span>
      </div>
      <div class="actions">
        <button type="button" data-action="status">Status</button>
        <button type="button" data-action="refresh">Refresh token</button>
        <button type="button" data-action="revoke">Revoke</button>
      </div>
    `;
    row.querySelector('[data-action="status"]').addEventListener("click", () => request(`/api/merchants/${encodeURIComponent(merchant.merchant_id)}/status`));
    row.querySelector('[data-action="refresh"]').addEventListener("click", () => request(`/api/merchants/${encodeURIComponent(merchant.merchant_id)}/refresh`, { method: "POST" }));
    row.querySelector('[data-action="revoke"]').addEventListener("click", async () => {
      await request(`/api/merchants/${encodeURIComponent(merchant.merchant_id)}/revoke`, { method: "POST" });
      await loadMerchants();
    });
    list.append(row);
  }
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!options.quiet) output.textContent = JSON.stringify(data, null, 2);
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

loadConfig().then(loadMerchants).catch(error => {
  output.textContent = JSON.stringify({ error: error.message }, null, 2);
});

// Keep asynchronous form and button failures visible without logging API payloads.
window.addEventListener("unhandledrejection", event => {
  event.preventDefault();
  output.textContent = JSON.stringify({ error: event.reason?.message || "Request failed" }, null, 2);
});

document.querySelector("#paymentsForm").addEventListener("submit", async event => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  await request(`/api/orders/${encodeURIComponent(fields.get("order_id"))}/payments?merchant_id=${encodeURIComponent(fields.get("merchant_id"))}`);
});
