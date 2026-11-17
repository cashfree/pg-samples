// Central configuration. Secrets stay in Node.js; never put them in public/.
export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  mode: process.env.APP_MODE || 'demo',
  environment: process.env.CASHFREE_ENV || 'sandbox',
  apiVersion: process.env.CASHFREE_API_VERSION || '2025-01-01',
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, ''),
  merchantPassword: process.env.MERCHANT_PASSWORD || '',
  environments: {
    sandbox: { baseUrl: 'https://sandbox.cashfree.com/pg', clientId: process.env.CASHFREE_SANDBOX_CLIENT_ID || '', clientSecret: process.env.CASHFREE_SANDBOX_CLIENT_SECRET || '' },
    production: { baseUrl: 'https://api.cashfree.com/pg', clientId: process.env.CASHFREE_PRODUCTION_CLIENT_ID || '', clientSecret: process.env.CASHFREE_PRODUCTION_CLIENT_SECRET || '' }
  }
};
if (!['demo', 'cashfree'].includes(config.mode)) throw new Error('APP_MODE must be demo or cashfree');
if (!Object.hasOwn(config.environments, config.environment)) throw new Error('CASHFREE_ENV must be sandbox or production');

const publicOrigin=new URL(config.publicBaseUrl);
if(!['http:','https:'].includes(publicOrigin.protocol) || publicOrigin.username || publicOrigin.password || publicOrigin.pathname!=='/' || publicOrigin.search || publicOrigin.hash)throw new Error('PUBLIC_BASE_URL must be an HTTP(S) origin without credentials, paths or query parameters.');
const localHosts=['localhost','127.0.0.1','[::1]'];
const exposed=!localHosts.includes(config.host) || !localHosts.includes(publicOrigin.hostname);
if(exposed && publicOrigin.protocol!=='https:')throw new Error('Public deployment requires an HTTPS PUBLIC_BASE_URL.');
if((exposed || config.environment==='production') && config.merchantPassword.length<12)throw new Error('Public or production use requires MERCHANT_PASSWORD with at least 12 characters.');
