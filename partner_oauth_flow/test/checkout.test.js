const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const environment of ['sandbox', 'production']) {
  test(`browser checkout uses the backend's ${environment} selection`, async () => {
    const elements = new Map();
    const checkoutCalls = [];
    function element(selector) {
      if (!elements.has(selector)) elements.set(selector, { listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; } });
      return elements.get(selector);
    }
    function Cashfree(options) {
      checkoutCalls.push(options);
      return { checkout: payment => checkoutCalls.push(payment) };
    }
    const context = {
      document: { querySelector: element }, window: { Cashfree, addEventListener() {} }, Cashfree,
      FormData: class { *[Symbol.iterator]() { yield ['merchant_id', 'example']; yield ['order_amount', '10']; } },
      fetch: async route => ({ ok: true, json: async () => route === '/api/config' ?
        { env: environment, redirectUrl: 'https://partner.example/oauth/callback', returnUrl: 'https://merchant.example/return' } :
        route === '/api/merchants' ? [] : { payment_session_id: 'example_session' } })
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8'), context);
    await new Promise(resolve => setImmediate(resolve));
    await element('#orderForm').listeners.submit({ preventDefault() {}, currentTarget: {} });
    element('#checkoutButton').listeners.click();
    assert.equal(checkoutCalls[0].mode, environment);
    assert.equal(checkoutCalls[1].paymentSessionId, 'example_session');
    assert.equal(checkoutCalls[1].redirectTarget, '_self');
  });
}
