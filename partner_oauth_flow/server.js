const crypto = require("crypto");
const fs = require("fs/promises");
const http = require("http");
const path = require("path");
const { URL } = require("url");

loadEnv();

const PORT = Number(process.env.PORT || 3000);
const ENV = "sandbox";
if (process.env.CASHFREE_ENV && process.env.CASHFREE_ENV !== ENV) {
  throw new Error("This sample only supports sandbox credentials and endpoints");
}
const APP_PASSWORD = process.env.APP_PASSWORD || "";
if (APP_PASSWORD.length < 24 || APP_PASSWORD.includes(":")) {
  throw new Error("Set APP_PASSWORD to a random password of at least 24 characters without colons");
}
const APP_BASE_URL = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const OAUTH_CLIENT_ID = process.env.CASHFREE_OAUTH_CLIENT_ID || "";
const OAUTH_CLIENT_SECRET = process.env.CASHFREE_OAUTH_CLIENT_SECRET || "";
const PARTNER_API_KEY = process.env.CASHFREE_PARTNER_API_KEY || "";
const API_BASE = "https://api-sandbox.cashfree.com";
const PG_BASE = "https://sandbox.cashfree.com";
const ROOT = __dirname;
const base = new URL(APP_BASE_URL);
if (base.origin !== APP_BASE_URL || base.username || base.password ||
    !(base.protocol === "https:" || (base.protocol === "http:" && base.hostname === "localhost"))) {
  throw new Error("APP_BASE_URL must be an HTTPS origin or http://localhost:PORT, without a path");
}
const merchants = new Map();
const states = new Map();
const sessions = new Map();
const refreshes = new Map();
const SESSION_TTL = 8 * 60 * 60 * 1000;
const STATE_TTL = 10 * 60 * 1000;

const server = http.createServer(async (req, res) => {
  try {
    securityHeaders(res);
    const url = new URL(req.url, APP_BASE_URL);
    if (url.origin !== base.origin || req.headers.host !== base.host) {
      return json(res, 403, { error: "Unexpected request host" });
    }
    // Webhooks authenticate using the signature below; all operator routes require login.
    if (url.pathname !== "/webhooks/cashfree" && !authenticate(req)) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Sandbox operator", charset="UTF-8"');
      return json(res, 401, { error: "Operator authentication required" });
    }
    const now = Date.now();
    for (const [key, entry] of sessions) if (entry < now) sessions.delete(key);
    for (const [key, entry] of states) if (entry.expires_at < now) states.delete(key);
    let session = /(?:^|; )partner_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || "")?.[1];
    if (!sessions.has(session)) session = undefined;
    if (req.method === "GET" && url.pathname === "/" && !session) {
      if (sessions.size >= 100) return json(res, 429, { error: "Too many sessions; restart the demo" });
      session = crypto.randomBytes(32).toString("hex");
      sessions.set(session, now + SESSION_TTL);
      res.setHeader("Set-Cookie", `partner_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL / 1000}${base.protocol === "https:" ? "; Secure" : ""}`);
    }
    if (url.pathname.startsWith("/api/") || url.pathname === "/oauth/callback") {
      if (!session) return json(res, 401, { error: "Open the app in this browser first" });
      if (req.method === "POST" &&
          (req.headers.origin !== base.origin || req.headers["content-type"]?.split(";")[0] !== "application/json")) {
        return json(res, 403, { error: "Same-origin JSON requests are required" });
      }
    }

    if (req.method === "GET" && url.pathname === "/") {
      return serveFile(res, "public/index.html", "text/html; charset=utf-8");
    }

    if (req.method === "GET" && url.pathname.startsWith("/public/")) {
      return serveFile(res, url.pathname.slice(1), contentType(url.pathname));
    }

    if (req.method === "GET" && url.pathname === "/api/config") {
      return json(res, 200, {
        env: ENV,
        appBaseUrl: APP_BASE_URL,
        redirectUrl: `${APP_BASE_URL}/oauth/callback`,
        hasPartnerApiKey: Boolean(PARTNER_API_KEY),
        hasOAuthClientId: Boolean(OAUTH_CLIENT_ID),
        endpoints: { apiBase: API_BASE, pgBase: PG_BASE }
      });
    }

    if (req.method === "POST" && url.pathname === "/api/oauth/auth-link") {
      requireConfig();
      const body = await readJson(req);
      const merchantId = String(body.merchant_id || "").trim();
      const state = crypto.randomBytes(32).toString("hex");
      if (!merchantId) return json(res, 400, { error: "merchant_id is required" });
      if (merchantId.length > 40) return json(res, 400, { error: "Merchant reference ID must be 40 characters or fewer. Generate a new ID." });
      if (!/^[A-Za-z0-9_-]+$/.test(merchantId)) return json(res, 400, { error: "Use letters, numbers, underscores or hyphens for merchant_id" });
      if (states.size >= 100) return json(res, 429, { error: "Too many pending authorisations" });

      const result = await cashfree(`${API_BASE}/partners/oauth/auth_link`, {
        method: "POST",
        body: {
          response_type: "code",
          scope: "read_write",
          state,
          merchant_id: merchantId
        }
      });

      const authUrl = new URL(result.auth_link);
      if (authUrl.protocol !== "https:" || authUrl.hostname !== "auth.cashfree.com" || authUrl.username || authUrl.password || authUrl.port) {
        throw httpError(502, "Unexpected authorisation URL from provider");
      }
      await saveState(state, merchantId, session);
      return json(res, 200, { auth_link: authUrl.href, merchant_id: merchantId });
    }

    if (req.method === "GET" && url.pathname === "/oauth/callback") {
      requireConfig();
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const merchantId = url.searchParams.get("merchant_id");
      if (!code || !state) return html(res, 400, "Missing code or state in OAuth callback.");
      const expectedMerchantId = await consumeState(state, session);
      if (!expectedMerchantId) return html(res, 400, "OAuth state is missing or expired. Start linking again.");
      if (merchantId && expectedMerchantId !== merchantId) return html(res, 400, "OAuth state merchant mismatch.");

      const token = await exchangeToken({ grant_type: "authorization_code", code });
      if (token.merchant_id && token.merchant_id !== expectedMerchantId) throw httpError(400, "Token merchant mismatch");
      await upsertMerchant(expectedMerchantId, token);
      res.writeHead(302, { Location: `/?linked=${encodeURIComponent(token.merchant_id || expectedMerchantId)}` });
      return res.end();
    }

    if (req.method === "GET" && url.pathname === "/api/merchants") {
      return json(res, 200, await listMerchants());
    }

    const merchantStatusMatch = url.pathname.match(/^\/api\/merchants\/([^/]+)\/status$/);
    if (req.method === "GET" && merchantStatusMatch) {
      requireConfig();
      const merchantId = decodeURIComponent(merchantStatusMatch[1]);
      if (!merchants.has(merchantId)) throw httpError(404, "Merchant is not linked");
      const result = await cashfree(`${API_BASE}/partners/merchants/${encodeURIComponent(merchantId)}`, {
        method: "GET",
        headers: { "x-api-version": "2023-01-01" }
      });
      return json(res, 200, { merchant_id: merchantId, connection_status: result.connection_status });
    }

    const refreshMatch = url.pathname.match(/^\/api\/merchants\/([^/]+)\/refresh$/);
    if (req.method === "POST" && refreshMatch) {
      requireConfig();
      const merchantId = decodeURIComponent(refreshMatch[1]);
      const token = await refreshMerchant(merchantId);
      return json(res, 200, redactTokenResponse(token));
    }

    const revokeMatch = url.pathname.match(/^\/api\/merchants\/([^/]+)\/revoke$/);
    if (req.method === "POST" && revokeMatch) {
      requireConfig();
      const merchantId = decodeURIComponent(revokeMatch[1]);
      if (!merchants.has(merchantId)) throw httpError(404, "Merchant is not linked");
      await cashfree(`${API_BASE}/partners/oauth/${encodeURIComponent(merchantId)}/revoke`, {
        method: "POST"
      });
      merchants.delete(merchantId);
      return json(res, 200, { merchant_id: merchantId, revoked: true });
    }

    if (req.method === "POST" && url.pathname === "/api/orders") {
      const body = await readJson(req);
      const merchantId = String(body.merchant_id || "").trim();
      if (!merchantId) return json(res, 400, { error: "merchant_id is required" });
      const amount = Number(body.order_amount);
      if (!Number.isFinite(amount) || amount < 1 || amount > 10000) throw httpError(400, "order_amount must be between 1 and 10000 INR");
      if (body.order_currency && body.order_currency !== "INR") throw httpError(400, "This demo uses INR only");
      if (body.order_id && !/^[A-Za-z0-9_-]{3,45}$/.test(body.order_id)) throw httpError(400, "Invalid order_id");
      const merchant = await ensureFreshMerchantToken(merchantId);
      const orderId = body.order_id || `order_${Date.now()}`;
      const order = await pgFetch("/pg/orders", merchant.access_token, {
        method: "POST",
        body: {
          order_id: orderId,
          order_amount: amount,
          order_currency: "INR",
          customer_details: {
            customer_id: body.customer_id || `cust_${Date.now()}`,
            customer_name: body.customer_name || "Sandbox Customer",
            customer_email: body.customer_email || "customer@example.com",
            customer_phone: body.customer_phone || "9999999999"
          },
          order_meta: {
            return_url: `${APP_BASE_URL}/?order_id={order_id}`
          }
        }
      });
      return json(res, 200, { order_id: order.order_id, order_status: order.order_status, payment_session_id: order.payment_session_id });
    }

    const paymentsMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/payments$/);
    if (req.method === "GET" && paymentsMatch) {
      const merchantId = url.searchParams.get("merchant_id");
      if (!merchantId) return json(res, 400, { error: "merchant_id query param is required" });
      const merchant = await ensureFreshMerchantToken(merchantId);
      const orderId = decodeURIComponent(paymentsMatch[1]);
      const payments = await pgFetch(`/pg/orders/${encodeURIComponent(orderId)}/payments`, merchant.access_token);
      return json(res, 200, payments.map(payment => ({
        cf_payment_id: payment.cf_payment_id, payment_status: payment.payment_status,
        payment_amount: payment.payment_amount, payment_currency: payment.payment_currency
      })));
    }

    if (req.method === "POST" && url.pathname === "/webhooks/cashfree") {
      const rawBody = await readRaw(req);
      if (!verifyWebhook(req.headers, rawBody)) {
        return json(res, 401, { error: "Invalid webhook signature" });
      }
      JSON.parse(rawBody || "{}");
      // Acknowledge only. Never log customer data, tokens, or the raw payload.
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : (error.status || 500);
    return json(res, status, { error: status >= 500 ? "Request failed; check configuration and retry" : (error instanceof SyntaxError ? "Invalid JSON" : error.message) });
  }
});

if (require.main === module) server.listen(PORT, "127.0.0.1", () => {
  console.log(`Cashfree sandbox app running at http://localhost:${PORT}`);
  console.log(`OAuth redirect URL: ${APP_BASE_URL}/oauth/callback`);
});
module.exports = server;

function loadEnv() {
  try {
    const env = require("fs").readFileSync(path.join(__dirname, ".env"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

function requireConfig() {
  if (!OAUTH_CLIENT_ID) throw httpError(500, "CASHFREE_OAUTH_CLIENT_ID is not configured");
  if (!OAUTH_CLIENT_SECRET) throw httpError(500, "CASHFREE_OAUTH_CLIENT_SECRET is not configured");
  if (!PARTNER_API_KEY) throw httpError(500, "CASHFREE_PARTNER_API_KEY is not configured");
}

async function exchangeToken(body) {
  return cashfree(`${API_BASE}/partners/oauth/token`, { method: "POST", body });
}

async function cashfree(url, options = {}) {
  const headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "x-partner-apikey": PARTNER_API_KEY,
    "oauth-client-id": OAUTH_CLIENT_ID,
    ...(url.includes("/partners/oauth/") ? { "oauth-client-secret": OAUTH_CLIENT_SECRET } : {}),
    ...(options.headers || {})
  };
  return fetchJson(url, { ...options, headers });
}

async function pgFetch(route, accessToken, options = {}) {
  const headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "x-api-version": "2023-08-01",
    "authorization": `Bearer ${accessToken}`,
    ...(options.headers || {})
  };
  return fetchJson(`${PG_BASE}${route}`, { ...options, headers });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15000),
    redirect: "error"
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw httpError(502, "Cashfree request failed");
  }
  return data;
}

async function ensureFreshMerchantToken(merchantId) {
  requireConfig();
  let merchant = await getMerchant(merchantId);
  if (!merchant?.access_token) throw httpError(404, "Merchant is not linked");
  if (new Date(merchant.expires_at).getTime() < Date.now() + 5 * 60 * 1000) {
    await refreshMerchant(merchantId);
    merchant = await getMerchant(merchantId);
  }
  return merchant;
}

async function refreshMerchant(merchantId) {
  if (refreshes.has(merchantId)) return refreshes.get(merchantId);
  const pending = (async () => {
    const merchant = await getMerchant(merchantId);
    if (!merchant?.refresh_token) throw httpError(404, "No refresh token stored for merchant");
    const token = await exchangeToken({ grant_type: "refresh_token", refresh_token: merchant.refresh_token });
    // Revocation may have completed while the refresh was in flight.
    if (!merchants.has(merchantId)) throw httpError(409, "Merchant was unlinked");
    await upsertMerchant(merchantId, token);
    return token;
  })();
  refreshes.set(merchantId, pending);
  try { return await pending; } finally { refreshes.delete(merchantId); }
}

async function upsertMerchant(merchantId, token) {
  if (!merchantId || (token.merchant_id && token.merchant_id !== merchantId)) throw httpError(400, "Token merchant mismatch");
  const lifetime = Number(token.expires_in || 86400);
  if (!token.access_token || !Number.isFinite(lifetime) || lifetime <= 0) throw httpError(502, "Invalid token response");
  merchants.set(merchantId, {
    ...merchants.get(merchantId),
    access_token: token.access_token,
    ...(token.refresh_token ? { refresh_token: token.refresh_token } : {}),
    connection_status: token.connection_status,
    token_type: token.token_type,
    expires_at: new Date(Date.now() + lifetime * 1000).toISOString(),
    updated_at: new Date().toISOString()
  });
}

async function getMerchant(merchantId) {
  return merchants.get(merchantId);
}

async function listMerchants() {
  return [...merchants].map(([merchant_id, merchant]) => ({
    merchant_id,
    connection_status: merchant.connection_status,
    token_type: merchant.token_type,
    expires_at: merchant.expires_at,
    updated_at: merchant.updated_at,
    has_refresh_token: Boolean(merchant.refresh_token)
  }));
}

async function saveState(state, merchantId, session) {
  states.set(state, { merchant_id: merchantId, session, expires_at: Date.now() + STATE_TTL });
}

async function consumeState(state, session) {
  const entry = states.get(state);
  if (!entry || entry.session !== session || entry.expires_at < Date.now()) return null;
  states.delete(state);
  return entry.merchant_id;
}

function verifyWebhook(headers, rawBody) {
  if (!PARTNER_API_KEY) return false;
  const timestamp = headers["x-webhook-timestamp"];
  const signature = headers["x-webhook-signature"];
  if (!timestamp || !signature || !/^\d{13}$/.test(timestamp)) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) return false;
  const expected = crypto
    .createHmac("sha256", PARTNER_API_KEY)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

async function readJson(req) {
  const raw = await readRaw(req);
  const value = raw ? JSON.parse(raw) : {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw httpError(400, "Expected a JSON object");
  return value;
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", chunk => {
      size += chunk.length;
      if (size > 16_384) {
        req.destroy();
        reject(httpError(413, "Request body too large"));
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function serveFile(res, relativePath, type) {
  const allowed = new Set(["public/index.html", "public/app.js", "public/styles.css"]);
  if (!allowed.has(relativePath)) return json(res, 404, { error: "Not found" });
  const fullPath = path.join(ROOT, relativePath);
  try {
    const file = await fs.readFile(fullPath);
    res.writeHead(200, { "content-type": type });
    res.end(file);
  } catch {
    json(res, 404, { error: "Not found" });
  }
}

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

function html(res, status, message) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(`<p>${escapeHtml(message)}</p><p><a href="/">Back</a></p>`);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function contentType(file) {
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "application/javascript; charset=utf-8";
  return "text/plain; charset=utf-8";
}

function redactTokenResponse(token) {
  return {
    merchant_id: token.merchant_id,
    connection_status: token.connection_status,
    token_type: token.token_type,
    expires_in: token.expires_in
  };
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

function authenticate(req) {
  if (!/^Basic [A-Za-z0-9+/]+=*$/i.test(req.headers.authorization || "")) return false;
  const expected = Buffer.from(`operator:${APP_PASSWORD}`);
  const supplied = Buffer.from((req.headers.authorization || "").replace(/^Basic /i, ""), "base64");
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function securityHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' https://sdk.cashfree.com; style-src 'self'; img-src 'self' data:; connect-src 'self' https://*.cashfree.com; frame-src https://*.cashfree.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
  if (base.protocol === "https:") res.setHeader("Strict-Transport-Security", "max-age=31536000");
}
