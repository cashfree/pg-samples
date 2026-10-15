const { test } = require('node:test');
const assert = require('node:assert/strict');
const { configure } = require('../config');

test('sandbox defaults and production endpoints are selected consistently', () => {
  const sandbox = configure({});
  assert.equal(sandbox.environment, 'sandbox');
  assert.equal(sandbox.apiBase, 'https://api-sandbox.cashfree.com');
  assert.equal(sandbox.pgBase, 'https://sandbox.cashfree.com');
  assert.equal(sandbox.returnUrl, 'http://localhost:3000/?order_id={order_id}');
  const production = configure({ CASHFREE_ENV: 'production', APP_BASE_URL: 'https://partner.example', CASHFREE_RETURN_URL: 'https://merchant.example/return?order_id={order_id}' });
  assert.equal(production.apiBase, 'https://api.cashfree.com');
  assert.equal(production.pgBase, 'https://cashfree.com');
  assert.equal(production.returnUrl, 'https://merchant.example/return?order_id={order_id}');
});

test('explicit official endpoints and API version are configurable', () => {
  const config = configure({ CASHFREE_ENV: 'production', APP_BASE_URL: 'https://partner.example', CASHFREE_API_BASE_URL: 'https://api.cashfree.com/', CASHFREE_PG_BASE_URL: 'https://cashfree.com', CASHFREE_PG_API_VERSION: '2025-01-01' });
  assert.equal(config.apiBase, 'https://api.cashfree.com');
  assert.equal(config.pgApiVersion, '2025-01-01');
});

test('invalid environments and untrusted or mismatched endpoints fail before sending credentials', () => {
  for (const env of [{ CASHFREE_ENV: 'typo' }, { CASHFREE_API_BASE_URL: 'https://evil.example' }, { CASHFREE_PG_BASE_URL: 'https://cashfree.com' }, { CASHFREE_API_BASE_URL: 'https://api-sandbox.cashfree.com@evil.example' }, { CASHFREE_PG_API_VERSION: 'bad\r\nheader' }]) {
    assert.throws(() => configure(env));
  }
});

test('production requires valid HTTPS application and return URLs', () => {
  const env = { CASHFREE_ENV: 'production', APP_BASE_URL: 'https://partner.example' };
  assert.throws(() => configure({ CASHFREE_ENV: 'production' }), /HTTPS/);
  for (const returnUrl of ['http://merchant.example/return', 'http://localhost:3000/', 'javascript:alert(1)', '/relative', 'https://user:password@merchant.example/', 'https://merchant.example/#fragment', 'https://merchant.example/\nreturn']) {
    assert.throws(() => configure({ ...env, CASHFREE_RETURN_URL: returnUrl }));
  }
  assert.throws(() => configure({ ...env, APP_BASE_URL: 'https://partner.example/oauth/callback' }), /origin/);
  assert.equal(configure(env).returnUrl, 'https://partner.example/?order_id={order_id}');
});
