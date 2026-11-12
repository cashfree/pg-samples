const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const logDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'subscription-returns-'));
process.env.RETURN_LOG_PATH = path.join(logDirectory, 'returns.jsonl');
process.env.CASHFREE_ENV = 'sandbox';
process.env.CASHFREE_APP_ID = 'fake-sandbox-id';
process.env.CASHFREE_SECRET = 'fake-sandbox-secret';
process.env.APP_BASE_URL = 'http://localhost:4000';
const app = require('../server');
let server;
let baseUrl;
const originalGet = axios.get;
const originalPost = axios.post;
before(async () => {
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve(listener));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => { axios.get = originalGet; axios.post = originalPost; server?.close(); fs.rmSync(logDirectory, { recursive: true, force: true }); });

test('home and direct return URL are accessible', async () => {
  assert.equal((await fetch(baseUrl)).status, 200);
  const response = await fetch(`${baseUrl}/return`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /return URL is ready/);
});

test('GET and form POST fetch authoritative status for all return ID formats', async () => {
  let calls = 0;
  axios.get = async (url, options) => {
    calls++;
    assert.equal(url, 'https://sandbox.cashfree.com/pg/subscriptions/Sub_test');
    assert.equal(options.headers['x-api-version'], '2025-01-01');
    assert.equal(options.timeout, 15000);
    return { data: { subscription_id: 'Sub_test', subscription_status: 'ACTIVE', authorization_details: { authorization_status: 'SUCCESS' } } };
  };
  const requests = [
    ['/return?subscription_id=Sub_test', {}],
    ...['subscriptionId', 'subscription_id', 'cf_subscriptionId'].map(key => ['/return', {
      method: 'POST', body: new URLSearchParams({ [key]: 'Sub_test', cf_status: 'FAKE_STATUS' })
    }]),
    ['/return?subscription_id=Sub_test', { method: 'POST' }]
  ];
  for (const [path, options] of requests) {
    const response = await fetch(baseUrl + path, options);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /ACTIVE/);
    assert.match(html, /SUCCESS/);
    assert.doesNotMatch(html.split('<h2>Received return parameters</h2>')[0], /FAKE_STATUS/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(calls, requests.length);
});

test('pending and failed authorizations do not display success', async () => {
  for (const status of ['PENDING', 'FAILED']) {
    axios.get = async () => ({ data: { subscription_status: 'INITIALIZED', authorization_details: { authorization_status: status } } });
    const response = await fetch(`${baseUrl}/return?subscription_id=Sub_test`);
    const html = await response.text();
    assert.match(html, new RegExp(status));
    assert.doesNotMatch(html, /SUCCESS/);
  }
});

test('malformed IDs are rejected before contacting Cashfree', async () => {
  axios.get = async () => { assert.fail('unexpected API request'); };
  for (const query of ['subscription_id=%3Cscript%3E', 'subscription_id=a&subscription_id=b']) {
    const response = await fetch(`${baseUrl}/return?${query}`);
    assert.equal(response.status, 400);
    assert.doesNotMatch(await response.text(), /<script>/);
  }
});

test('upstream failures show a useful error without claiming verification', async () => {
  for (const [upstream, expected] of [[404, 404], [401, 502], [500, 502], [undefined, 502]]) {
    axios.get = async () => { const error = new Error('private upstream detail'); error.response = { status: upstream }; throw error; };
    const response = await fetch(`${baseUrl}/return?subscription_id=Sub_test`);
    assert.equal(response.status, expected);
    assert.doesNotMatch(await response.text(), /private upstream detail|Verified subscription details/);
  }
});

test('Cashfree response content is escaped', async () => {
  axios.get = async () => ({ data: { subscription_status: '<script>alert(1)</script>' } });
  const html = await (await fetch(`${baseUrl}/return?subscription_id=Sub_test`)).text();
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('subscription creation includes a local return URL with a fallback ID', async () => {
  axios.post = async (url, body) => {
    const returnUrl = new URL(body.subscription_meta.return_url);
    assert.equal(returnUrl.origin, 'http://localhost:4000');
    assert.equal(returnUrl.pathname, '/return');
    assert.equal(returnUrl.searchParams.get('subscription_id'), body.subscription_id);
    return { data: { subscription_session_id: 'test-session' } };
  };
  const response = await fetch(`${baseUrl}/api/subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'basic' })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.subscription_session_id, 'test-session');
});


test('all posted fields and query parameters remain visible without a subscription ID', async () => {
  axios.get = async () => { assert.fail('unexpected API request'); };
  const body = new URLSearchParams();
  body.append('signature', 'a+b/c=');
  body.append('custom_field', '<script>alert(1)</script>');
  body.append('repeated', 'first');
  body.append('repeated', 'second');
  const response = await fetch(`${baseUrl}/return?tracking=value`, { method: 'POST', body });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const value of ['POST body', 'URL query parameters', 'signature', 'a+b/c=', 'custom_field', 'repeated', 'first', 'second', 'tracking', 'value']) {
    assert.ok(html.includes(value), `Missing ${value}`);
  }
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('posted JSON fields remain visible when status verification fails', async () => {
  axios.get = async () => { throw new Error('unavailable'); };
  const response = await fetch(`${baseUrl}/return`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId: 'Sub_test', unknown: { nested: ['one', 'two'] }, amount: 0 })
  });
  assert.equal(response.status, 502);
  const html = await response.text();
  for (const value of ['Sub_test', 'unknown', 'nested', 'one', 'two', 'amount']) assert.ok(html.includes(value));
});


test('return POST is saved with raw bytes, fields and query even without an ID', async () => {
  const raw = 'signature=a%2Bb%2Fc%3D&field=one&field=two';
  const response = await fetch(`${baseUrl}/return?source=log_test`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: raw
  });
  assert.equal(response.status, 200);
  const record = JSON.parse(fs.readFileSync(process.env.RETURN_LOG_PATH, 'utf8').trim().split('\n').at(-1));
  assert.equal(record.raw_body, raw);
  assert.equal(record.body.signature, 'a+b/c=');
  assert.deepEqual(record.body.field, ['one', 'two']);
  assert.equal(record.query.source, 'log_test');
  assert.ok(Date.parse(record.received_at));
});

test('return-only listener does not expose subscription creation or logs', async () => {
  const returns = require('../return-server');
  const listener = await new Promise((resolve, reject) => {
    const running = returns.listen(0, '127.0.0.1', error => error ? reject(error) : resolve(running));
  });
  try {
    const origin = `http://127.0.0.1:${listener.address().port}`;
    assert.equal((await fetch(`${origin}/return`)).status, 200);
    for (const endpoint of ['/', '/api/config', '/api/subscribe', '/logs/return-events.jsonl']) {
      assert.equal((await fetch(origin + endpoint, { method: 'POST' })).status, 404);
    }
  } finally { listener.close(); }
});

test('production configuration selects live API and checkout together', () => {
  const { spawnSync } = require('node:child_process');
  const script = `
    const assert = require('node:assert/strict');
    const axios = require('axios');
    const app = require('./server');
    const route = app.router.stack.find(layer => layer.route?.path === '/api/config').route.stack[0].handle;
    route({}, { set() { return this; }, json(config) { assert.equal(config.mode, 'production'); } });
    axios.post = async (url, body) => {
      assert.equal(url, 'https://api.cashfree.com/pg/subscriptions');
      assert.ok(body.subscription_meta.return_url.startsWith('https://returns.example.com/return?'));
      return { data: {} };
    };
    const subscribe = app.router.stack.find(layer => layer.route?.path === '/api/subscribe').route.stack[0].handle;
    (async () => {
      await subscribe({ body: { plan: 'basic' } }, { json() {}, status() { throw new Error('unexpected status'); } });
      axios.post = async (url, body, options) => {
        assert.equal(url, 'https://api.cashfree.com/pg/subscriptions');
        assert.equal(options.headers['x-client-id'], 'fake-live-id');
        assert.equal(body.plan_details.plan_max_cycles, 1);
        assert.equal(body.plan_details.plan_amount, 1);
        assert.equal(body.plan_details.plan_max_amount, 1);
        assert.equal(body.plan_details.plan_id, undefined);
        assert.equal(body.authorization_details.authorization_amount, 1);
        const first = Date.parse(body.subscription_first_charge_time);
        const expiry = Date.parse(body.subscription_expiry_time);
        assert.ok(Math.abs(first - Date.now() - 86400000) < 2000);
        assert.equal(expiry - first, 86400000);
        return { data: { subscription_session_id: 'fake-session' } };
      };
      await subscribe({ body: { plan: 'production_test' } }, { json() {}, status() { throw new Error('unexpected status'); } });
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const env = { ...process.env, CASHFREE_ENV: 'production', CASHFREE_APP_ID: 'fake-live-id', CASHFREE_SECRET: 'fake-live-secret', APP_BASE_URL: 'https://returns.example.com' };
  const result = spawnSync(process.execPath, ['-e', script], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const rejected = spawnSync(process.execPath, ['-e', "require('./server')"], { env: { ...env, APP_BASE_URL: 'http://localhost:4000' }, encoding: 'utf8' });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Production requires/);
});


test('production test product cannot be created in sandbox', async () => {
  axios.post = async () => { assert.fail('unexpected external request'); };
  const response = await fetch(`${baseUrl}/api/subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'production_test' })
  });
  assert.equal(response.status, 400);
  const config = await (await fetch(`${baseUrl}/api/config`)).json();
  assert.equal(config.productionTest, null);
});

test('one-cycle dates roll over in IST across months and years', () => {
  const product = require('../production-test-product');
  for (const timestamp of ['2026-11-02T13:30:00+05:30', '2026-12-31T23:45:00+05:30']) {
    const now = new Date(timestamp);
    const payload = product(now);
    assert.equal(Date.parse(payload.subscription_first_charge_time) - now.getTime(), 86400000);
    assert.equal(Date.parse(payload.subscription_expiry_time) - now.getTime(), 172800000);
    assert.equal(payload.plan_details.plan_max_cycles, 1);
    assert.equal(payload.plan_details.plan_amount, 1);
    assert.equal(payload.authorization_details.authorization_amount, 1);
  }
});
