import { createHmac, timingSafeEqual } from 'node:crypto';
export function requireValue(condition, message, status = 400) {
  if (!condition) throw Object.assign(new Error(message), { status });
}
export function validId(value) {
  requireValue(typeof value === 'string' && /^[\w-]{1,100}$/.test(value), 'Use a subscription/payment ID containing letters, numbers, hyphens or underscores.');
  return value;
}
export function amount(value, label = 'Amount') {
  const n = Number(value);
  requireValue(Number.isFinite(n) && n > 0 && n <= 10000000 && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, `${label} must be a positive INR amount with at most two decimals.`);
  return n;
}
export function safeHttps(value) {
  const url = new URL(value);
  requireValue(url.protocol === 'https:' && !url.username && !url.password, 'Payment destination must be HTTPS.');
  return url.href;
}
// Parse cURL as DATA only. Never run shell commands returned by an API.
// Supported legacy shape: curl --url 'https://...' --data[-raw] '{"AuthMode":...}'.
export function parseCurl(value) {
  const url = value.match(/(?:--url\s+)?["'](https:\/\/[^"']+)["']/)?.[1] || value.match(/https:\/\/[^\s'"\\]+/)?.[0];
  const body = value.match(/(?:--data(?:-raw|-binary)?|-d)\s+'([\s\S]*?)'(?=\s*(?:\\|--|$))/)?.[1];
  requireValue(url && body, 'Unsupported cURL response. Expected an HTTPS URL and a single-quoted JSON body; review the provider response.');
  return { url: safeHttps(url), payload: JSON.parse(body), method: 'post' };
}
// Cashfree QR data can be mandate text, base64-encoded mandate text, or an
// already-rendered base64 raster image. Never encode image base64 as QR text.
export function normalizeQr(value) {
  requireValue(typeof value==='string' && value.trim().length>0 && value.length<=2*1024*1024,'Cashfree returned invalid QR data.',502);
  const qr=value.trim();
  const dataUri=qr.match(/^data:image\/(png|jpe?g|gif|webp);base64,([\s\S]+)$/i);
  requireValue(!qr.startsWith('data:') || dataUri,'Unsupported QR image format. Expected a base64 PNG, JPEG, GIF or WebP image.',502);
  const encoded=(dataUri?dataUri[2]:qr).replace(/\s/g,'');
  if(/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    const bytes=Buffer.from(encoded,'base64');
    if(bytes.toString('base64').replace(/=+$/,'')===encoded.replace(/=+$/,'')) {
      const mime=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':
        bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':
        /^GIF8[79]a$/.test(bytes.subarray(0,6).toString())?'image/gif':
        bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'image/webp':null;
      if(mime) {
        requireValue(!dataUri || `image/${dataUri[1].toLowerCase().replace('jpg','jpeg')}`===mime,'QR image content does not match its declared format.',502);
        return {kind:'qr',image:`data:${mime};base64,${bytes.toString('base64')}`};
      }
      requireValue(!dataUri,'Cashfree returned malformed QR image data.',502);
      const decoded=bytes.toString('utf8');
      if(decoded.startsWith('upi://'))return {kind:'qr',value:decoded};
    }
  }
  requireValue(!dataUri,'Cashfree returned malformed QR image data.',502);
  return {kind:'qr',value:qr};
}
export function normalizeAuth(response, { environment = 'production' } = {}) {
  if (response.demo) return { kind: 'demo' };
  const raw = response.data || {};
  const data = typeof raw === 'string' ? (raw.trim().startsWith('curl ') ? parseCurl(raw) : { url: raw }) : raw;
  const curl = response.curl || response.curl_request || data.curl;
  const parsed = curl ? parseCurl(typeof curl === 'string' ? curl : curl.curl) : data;
  const payload = parsed.payload || parsed.body || {};
  // data.url can be the generic /pgbillpayuiapi/simulator endpoint, which
  // rejects direct navigation. Only open a subscription-specific UPI simulator
  // link returned by Cashfree, including links inside upiIntentData.
  if(environment==='sandbox' && ['qrcode','collect'].includes(response.channel)) {
    const links=payload.upiIntentData || {};
    const candidates=[parsed.url,links.androidAuthAppLinks?.DEFAULT,
      ...Object.values(links.androidAuthAppLinks || {}),...Object.values(links.iosAuthAppLinks || {})];
    const simulator=candidates.find(value=>{
      try { const u=new URL(value);return u.protocol==='https:' && u.hostname.endsWith('.cashfree.com') && /\/(?:subs-checkout|subscriptions)\/checkout\/simulator\/UPI\/[^/]+\/?$/i.test(u.pathname) && !!u.searchParams.get('auth_id'); }
      catch { return false; }
    });
    if(simulator)return {kind:'redirect',url:safeHttps(simulator),simulator:true};
    if(parsed.url && !(payload.qrData || parsed.qrData))return {kind:'simulation'};
  }
  // Collect is a PSP request in production, not an Intent app chooser.
  if (response.channel === 'collect') return { kind: 'collect' };
  const qr = payload.qrData || parsed.qrData;
  if (qr) return normalizeQr(qr);
  const intents = payload.upiIntentData;
  if (intents && response.channel !== 'qrcode') return { kind: 'intent', android: intents.androidAuthAppLinks || {}, ios: intents.iosAuthAppLinks || {} };
  const redirect = response.redirect_url || parsed.redirect_url;
  if (redirect) return { kind: 'redirect', url: safeHttps(redirect) };
  const url = parsed.url || response.url;
  requireValue(url, 'Cashfree did not return a usable payment action. Review the response in the API inspector.');
  // Some Cashfree merchants receive a direct URL under an Unleash flag.
  // To enable direct redirect URLs for eNACH, contact care@cashfree.com.
  if (Object.keys(payload).length && String(parsed.method || 'post').toLowerCase() === 'post') {
    requireValue(typeof payload === 'object' && !Array.isArray(payload), 'Invalid form POST payload.');
    return { kind: 'post', url: safeHttps(url), fields: payload };
  }
  return { kind: 'redirect', url: safeHttps(url) };
}
export function verifyWebhook(raw, timestamp, signature, secret, now = Date.now()) {
  if (!timestamp || !signature || !secret) return false;
  // Cashfree sends a Unix timestamp in milliseconds.
  const sent = Number(timestamp);
  if (!Number.isFinite(sent) || Math.abs(now - sent) > 5 * 60 * 1000) return false;
  const expected = createHmac('sha256', secret).update(timestamp).update(raw).digest('base64');
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
const privateKeys = /payload|curl|qrData|upiIntent|secret|client.id|session|token|jwt|checksum|mandatereq|signature|account.number|account_holder|customer_|card.number|card.cvv|card.holder|card.expiry|upi.id/i;
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, privateKeys.test(k) ? '[redacted]' : redact(v)]));
  if (typeof value === 'string' && /https?:\/\//.test(value)) {
    try { const u = new URL(value); return `${u.origin}/[payment-path-redacted]`; } catch { return '[redacted URL]'; }
  }
  return value;
}
export function serviceAccess(subscription, payments) {
  // Authorising a mandate alone never unlocks a paid service.
  return subscription.subscription_status === 'ACTIVE' && payments.some(p => p.payment_type === 'CHARGE' && p.payment_status === 'SUCCESS');
}
