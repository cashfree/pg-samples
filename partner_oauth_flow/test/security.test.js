const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');

// Runtime-only fake credentials. No real Cashfree services or credentials are used.
process.env.APP_PASSWORD = crypto.randomBytes(32).toString('hex');
process.env.CASHFREE_OAUTH_CLIENT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.CASHFREE_OAUTH_CLIENT_ID = crypto.randomUUID();
process.env.CASHFREE_PARTNER_API_KEY = crypto.randomBytes(32).toString('hex');
const environment = process.env.OAUTH_TEST_ENV || 'sandbox';
const origin = environment === 'production' ? 'https://partner.example' : 'http://localhost:3000';
process.env.CASHFREE_ENV = environment;
process.env.APP_BASE_URL = origin;
process.env.CASHFREE_API_BASE_URL = '';
process.env.CASHFREE_PG_BASE_URL = '';
process.env.CASHFREE_PG_API_VERSION = '2023-08-01';
process.env.CASHFREE_RETURN_URL = environment === 'production' ? 'https://merchant.example/payments/return?order_id={order_id}' : '';
const apiBase = environment === 'production' ? 'https://api.cashfree.com' : 'https://api-sandbox.cashfree.com';
const pgBase = environment === 'production' ? 'https://cashfree.com' : 'https://sandbox.cashfree.com';
const server = require('../server');
const nativeFetch = global.fetch;
let calls = [];
let provider;
let cookie;
const secretAccess = crypto.randomBytes(32).toString('hex');
const secretRefresh = crypto.randomBytes(32).toString('hex');
const auth = `Basic ${Buffer.from(`operator:${process.env.APP_PASSWORD}`).toString('base64')}`;

function request(route, { method = 'GET', body, headers = {}, authenticated = true, session = cookie } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: route, method,
      headers: { host: new URL(origin).host, ...(authenticated ? { authorization: auth } : {}),
        ...(session ? { cookie: session } : {}), ...(method === 'POST' ? { origin, 'content-type': 'application/json' } : {}), ...headers }
    }, res => {
      let text = '';
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text, json: () => JSON.parse(text) }));
    });
    req.on('error', reject);
    req.end(body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body));
  });
}
function response(data, status = 200) { return new Response(JSON.stringify(data), { status }); }
function noSecrets(result) {
  for (const secret of [secretAccess, secretRefresh, process.env.CASHFREE_PARTNER_API_KEY, process.env.CASHFREE_OAUTH_CLIENT_ID, process.env.CASHFREE_OAUTH_CLIENT_SECRET]) {
    assert.ok(!result.text.includes(secret), 'Response must not expose credentials');
  }
  assert.doesNotMatch(result.text, /token_preview/);
}
async function link(merchant = 'demo_merchant') {
  provider = async url => response({ auth_link: 'https://auth.cashfree.com/auth/lookup?sessionId=example' });
  const result = await request('/api/oauth/auth-link', { method: 'POST', body: { merchant_id: merchant, state: 'attacker_selected' } });
  assert.equal(result.status, 200);
  const state = JSON.parse(calls.at(-1).options.body).state;
  assert.match(state, /^[a-f0-9]{64}$/);
  provider = async () => response({ merchant_id: merchant, access_token: secretAccess, refresh_token: secretRefresh, expires_in: 86400 });
  return state;
}

before(async () => {
  global.fetch = async (url, options) => {
    assert.ok(url.startsWith(`${apiBase}/`) || url.startsWith(`${pgBase}/`));
    assert.equal(options.redirect, 'error');
    if (url.includes('/partners/oauth/')) assert.equal(options.headers['oauth-client-secret'], process.env.CASHFREE_OAUTH_CLIENT_SECRET);
    calls.push({ url, options });
    return provider(url, options);
  };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const result = await request('/');
  cookie = result.headers['set-cookie'][0].split(';')[0];
});
after(async () => { global.fetch = nativeFetch; await new Promise(resolve => server.close(resolve)); });

test('operator authentication, session, host and cross-origin protections', async () => {
  assert.equal((await request('/api/merchants', { authenticated: false })).status, 401);
  assert.equal((await request('/api/config', { session: '' })).status, 401);
  assert.equal((await request('/', { headers: { host: 'evil.example' } })).status, 403);
  assert.equal((await request('/api/oauth/auth-link', { method: 'POST', headers: { origin: 'https://evil.example' }, body: {} })).status, 403);
  assert.equal((await request('/api/oauth/auth-link', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 403);
  const config = await request('/api/config');
  assert.equal(config.status, 200);
  assert.equal(config.json().env, environment);
  assert.deepEqual(config.json().endpoints, { apiBase, pgBase });
  assert.equal(config.json().returnUrl, process.env.CASHFREE_RETURN_URL || `${origin}/?order_id={order_id}`);
  assert.equal(config.headers['cache-control'], 'no-store');
  assert.equal(config.headers['referrer-policy'], 'no-referrer');
  assert.match(config.headers['content-security-policy'], /frame-ancestors 'none'/);
  noSecrets(config);
  const home = await request('/', { session: '' });
  assert.match(home.headers['set-cookie'][0], /HttpOnly; SameSite=Lax/);
  assert.equal(home.headers['set-cookie'][0].includes('; Secure'), environment === 'production');
});

test('only public assets can be downloaded', async () => {
  for (const route of ['/public/../.env', '/public/%2e%2e%2f.env', '/public/server.js', '/data/merchants.json', '/.env']) {
    assert.equal((await request(route)).status, 404);
  }
  assert.equal((await request('/public/app.js')).status, 200);
});

test('callback state is session-bound, single-use and never bypassed by manual exchange', async () => {
  const state = await link();
  const callback = `/oauth/callback?code=example&state=${state}&merchant_id=demo_merchant`;
  const other = await request('/', { session: '' });
  assert.equal((await request(callback, { session: other.headers['set-cookie'][0].split(';')[0] })).status, 400);
  const count = calls.length;
  const result = await request(callback);
  assert.equal(result.status, 302);
  assert.equal(calls.length, count + 1);
  noSecrets(result);
  assert.equal((await request(callback)).status, 400);
  assert.equal(calls.length, count + 1);
  assert.equal((await request('/api/oauth/exchange', { method: 'POST', body: { code: 'example' } })).status, 404);
  noSecrets(await request('/api/merchants'));
});

test('expired state and mismatching merchant are rejected before token exchange', async () => {
  let state = await link('mismatch');
  const count = calls.length;
  assert.equal((await request(`/oauth/callback?code=example&state=${state}&merchant_id=other`)).status, 400);
  assert.equal(calls.length, count);
  state = await link('expired');
  const now = Date.now;
  try {
    Date.now = () => now() + 11 * 60 * 1000;
    assert.equal((await request(`/oauth/callback?code=example&state=${state}`)).status, 400);
  } finally { Date.now = now; }
});

test('rejects provider merchant mismatch and malicious consent links', async () => {
  const state = await link('expected');
  provider = async () => response({ merchant_id: 'different', access_token: secretAccess });
  assert.equal((await request(`/oauth/callback?code=example&state=${state}`)).status, 400);
  provider = async () => response({ auth_link: 'javascript:alert(1)' });
  assert.equal((await request('/api/oauth/auth-link', { method: 'POST', body: { merchant_id: 'new' } })).status, 502);
});

test('token refresh is deduplicated and refresh rotation is used', async () => {
  const rotated = crypto.randomBytes(32).toString('hex');
  provider = async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    return response({ merchant_id: 'demo_merchant', access_token: secretAccess, refresh_token: rotated, expires_in: 86400 });
  };
  const count = calls.length;
  const results = await Promise.all([1, 2].map(() => request('/api/merchants/demo_merchant/refresh', { method: 'POST', body: {} })));
  assert.equal(calls.length, count + 1);
  for (const result of results) { assert.equal(result.status, 200); noSecrets(result); assert.ok(!result.text.includes(rotated)); }
  await request('/api/merchants/demo_merchant/refresh', { method: 'POST', body: {} });
  assert.equal(JSON.parse(calls.at(-1).options.body).refresh_token, rotated);
});

test('order uses server-side bearer token and only returns checkout fields', async () => {
  provider = async (url, options) => {
    assert.equal(options.headers.authorization, `Bearer ${secretAccess}`);
    assert.equal(options.headers['x-partner-apikey'], undefined);
    assert.equal(options.headers['x-api-version'], '2023-08-01');
    assert.equal(JSON.parse(options.body).order_meta.return_url, process.env.CASHFREE_RETURN_URL || `${origin}/?order_id={order_id}`);
    return response({ order_id: 'order_demo', order_status: 'ACTIVE', payment_session_id: 'example_session', customer_details: { private: true }, access_token: secretAccess });
  };
  const result = await request('/api/orders', { method: 'POST', body: { merchant_id: 'demo_merchant', order_amount: 10 } });
  assert.equal(result.status, 200);
  assert.equal(result.json().payment_session_id, 'example_session');
  assert.equal(result.json().customer_details, undefined);
  noSecrets(result);
  const count = calls.length;
  for (const amount of [-1, 'NaN', 10001]) assert.equal((await request('/api/orders', { method: 'POST', body: { merchant_id: 'demo_merchant', order_amount: amount } })).status, 400);
  assert.equal(calls.length, count);
});

test('expiring access tokens refresh automatically before an order', async () => {
  const state = await link('expiring');
  provider = async () => response({ merchant_id: 'expiring', access_token: secretAccess, refresh_token: secretRefresh, expires_in: 1 });
  assert.equal((await request(`/oauth/callback?code=example&state=${state}`)).status, 302);
  const count = calls.length;
  provider = async url => response(url.endsWith('/token') ?
    { merchant_id: 'expiring', access_token: secretAccess, refresh_token: secretRefresh, expires_in: 86400 } :
    { order_id: 'auto_order', payment_session_id: 'example_session' });
  assert.equal((await request('/api/orders', { method: 'POST', body: { merchant_id: 'expiring', order_amount: 10 } })).status, 200);
  assert.equal(calls.length, count + 2);
  assert.equal(JSON.parse(calls[count].options.body).grant_type, 'refresh_token');
  provider = async () => response({});
  assert.equal((await request('/api/merchants/expiring/revoke', { method: 'POST', body: {} })).status, 200);
});

test('oversized requests are disconnected and the server remains available', async () => {
  await assert.rejects(request('/api/orders', { method: 'POST', body: 'x'.repeat(17000) }), { code: 'ECONNRESET' });
  assert.equal((await request('/api/config')).status, 200);
});

test('payment status and merchant status exclude private upstream fields', async () => {
  provider = async url => response(url.includes('/payments') ? [{ cf_payment_id: 123, payment_status: 'SUCCESS', customer_details: { private: true }, access_token: secretAccess }] : { connection_status: 'ACTIVE', refresh_token: secretRefresh });
  for (const route of ['/api/orders/order_demo/payments?merchant_id=demo_merchant', '/api/merchants/demo_merchant/status']) {
    const result = await request(route);
    assert.equal(result.status, 200); noSecrets(result);
    assert.ok(!result.text.includes('customer_details'));
  }
});

test('upstream errors and invalid JSON do not leak sensitive response data', async () => {
  provider = async () => response({ message: secretAccess, refresh_token: secretRefresh }, 400);
  const result = await request('/api/merchants/demo_merchant/refresh', { method: 'POST', body: {} });
  assert.equal(result.status, 502); noSecrets(result);
  for (const body of ['{invalid', 'null', '[]']) assert.equal((await request('/api/orders', { method: 'POST', body })).status, 400);
});

test('webhook authentication rejects bad signatures, changed payloads and stale timestamps', async () => {
  const payload = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: {} });
  function signed(timestamp, body = payload) {
    return { 'x-webhook-timestamp': String(timestamp), 'x-webhook-signature': crypto.createHmac('sha256', process.env.CASHFREE_PARTNER_API_KEY).update(`${timestamp}${body}`).digest('base64') };
  }
  const timestamp = Date.now();
  for (const headers of [{}, signed(timestamp, '{}'), signed(timestamp - 600000)]) {
    assert.equal((await request('/webhooks/cashfree', { method: 'POST', body: payload, headers, authenticated: false })).status, 401);
  }
  assert.equal((await request('/webhooks/cashfree', { method: 'POST', body: payload, headers: signed(timestamp), authenticated: false })).status, 200);
});

test('revocation clears tokens and prevents further orders', async () => {
  provider = async () => response({ access_token: secretAccess, refresh_token: secretRefresh });
  const result = await request('/api/merchants/demo_merchant/revoke', { method: 'POST', body: {} });
  assert.equal(result.status, 200); noSecrets(result);
  assert.deepEqual((await request('/api/merchants')).json(), []);
  assert.equal((await request('/api/orders', { method: 'POST', body: { merchant_id: 'demo_merchant', order_amount: 10 } })).status, 404);
});
