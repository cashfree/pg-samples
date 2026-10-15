const ENDPOINTS = {
  sandbox: { apiBase: 'https://api-sandbox.cashfree.com', pgBase: 'https://sandbox.cashfree.com' },
  production: { apiBase: 'https://api.cashfree.com', pgBase: 'https://cashfree.com' }
};

function configure(env = process.env) {
  const environment = env.CASHFREE_ENV || 'sandbox';
  if (!Object.hasOwn(ENDPOINTS, environment)) throw new Error('CASHFREE_ENV must be sandbox or production');
  const defaults = ENDPOINTS[environment];
  function endpoint(name, fallback) {
    const value = (env[name] || fallback).replace(/\/$/, '');
    // Never send partner credentials to an arbitrary or mismatched endpoint.
    if (value !== fallback) throw new Error(`${name} must be ${fallback} for ${environment}`);
    return value;
  }
  const apiBase = endpoint('CASHFREE_API_BASE_URL', defaults.apiBase);
  const pgBase = endpoint('CASHFREE_PG_BASE_URL', defaults.pgBase);
  const appBaseUrl = (env.APP_BASE_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/$/, '');
  const appUrl = validateUrl(appBaseUrl, 'APP_BASE_URL', environment);
  if (appUrl.origin !== appBaseUrl) throw new Error('APP_BASE_URL must be an origin without a path or query');
  const returnUrl = env.CASHFREE_RETURN_URL || `${appBaseUrl}/?order_id={order_id}`;
  validateUrl(returnUrl, 'CASHFREE_RETURN_URL', environment);
  const pgApiVersion = env.CASHFREE_PG_API_VERSION || '2023-08-01';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pgApiVersion)) throw new Error('CASHFREE_PG_API_VERSION must have YYYY-MM-DD format');
  return { environment, apiBase, pgBase, appBaseUrl, returnUrl, pgApiVersion };
}

function validateUrl(value, name, environment) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be a valid absolute URL`); }
  const localSandbox = environment === 'sandbox' && url.protocol === 'http:' && url.hostname === 'localhost';
  if ((!localSandbox && url.protocol !== 'https:') || url.username || url.password || url.hash || /[\s\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`${name} must use HTTPS without credentials, fragments or whitespace (sandbox also allows http://localhost)`);
  }
  return url;
}

module.exports = { configure };
