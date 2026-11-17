import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { config } from './config.js';
import enachBanks from './lib/enach-banks.json' with { type: 'json' };
import { readStore, mutateStore } from './lib/store.js';
import { requireValue as assert, validId, amount, normalizeAuth, redact, serviceAccess, verifyWebhook } from './lib/payments.js';

export const products = [
  { id: 'studio', name: 'Studio Plus', category: 'CREATIVE TOOLS', description: 'Your creative workspace, on repeat.', amount: 499, maxAmount: 2000, icon: '✳', color: 'lavender', features: ['Unlimited creative projects', 'Premium templates & exports', 'Priority cloud rendering'] },
  { id: 'fitness', name: 'Move Membership', category: 'HEALTH & WELLNESS', description: 'A little movement. A lasting habit.', amount: 299, maxAmount: 1500, icon: '↗', color: 'peach', features: ['Live & on-demand classes', 'Personal progress insights', 'Flexible session billing'] },
  { id: 'cloud', name: 'Cloud Compute', category: 'DEVELOPER SERVICES', description: 'More power, whenever you need it.', amount: 999, maxAmount: 5000, icon: '⌘', color: 'mint', features: ['Managed compute workspace', 'Usage-based billing support', 'Detailed usage & invoices'] }
];
const sessions = new Map(), credentials = new Map(), traces = new Map(), loginAttempts=new Map();
const fingerprint = (env, id, secret='') => createHash('sha256').update(JSON.stringify([env,id,secret])).digest('hex').slice(0,24);
for (const [env, c] of Object.entries(config.environments)) credentials.set(fingerprint(env,c.clientId,c.clientSecret), { ...c, environment: env });
function context(session) {
  const c = session.credentials || config.environments[session.environment];
  const namespace = session.mode === 'demo' ? 'demo' : fingerprint(session.environment, c.clientId,c.clientSecret);
  if (session.mode !== 'demo') credentials.set(namespace, { ...c, environment: session.environment });
  return { ...c, mode: session.mode, environment: session.environment, apiVersion: session.apiVersion, namespace, session };
}
function getSession(req, res) {
  const sid = req.headers.cookie?.match(/(?:^|; )merchant_session=([a-f0-9]+)/)?.[1];
  if (sid && sessions.has(sid)) { const s = sessions.get(sid); s.lastSeen = Date.now(); return s; }
  assert(sessions.size<5000,'Workspace is busy. Try again later.',503);
  const id = randomBytes(24).toString('hex');
  const s = { id, mode: config.mode, environment: config.environment, apiVersion: config.apiVersion, authenticated: !config.merchantPassword, lastSeen: Date.now() };
  sessions.set(id,s);
  res.setHeader('Set-Cookie', `merchant_session=${id}; HttpOnly; SameSite=Lax; Path=/${config.publicBaseUrl.startsWith('https:') ? '; Secure' : ''}`);
  return s;
}
setInterval(() => {
  const now=Date.now();
  for(const [id,s] of sessions) if(now-s.lastSeen>12*3600000){sessions.delete(id);traces.delete(id);}
  const retained=new Set(Object.entries(config.environments).map(([env,c])=>fingerprint(env,c.clientId,c.clientSecret)));
  for(const s of sessions.values())if(s.credentials)retained.add(fingerprint(s.environment,s.credentials.clientId,s.credentials.clientSecret));
  for(const key of credentials.keys())if(!retained.has(key))credentials.delete(key);
  for(const [peer,a] of loginAttempts)if(now-a.since>15*60*1000)loginAttempts.delete(peer);
},60000).unref();
function json(res, status, body) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); }
async function body(req) {
  const chunks=[]; let size=0;
  for await (const chunk of req) { size += chunk.length; assert(size <= 128*1024, 'Request body too large.',413); chunks.push(chunk); }
  const raw = Buffer.concat(chunks);
  if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) return { raw, data: Object.fromEntries(new URLSearchParams(raw.toString())) };
  try { return { raw, data: raw.length ? JSON.parse(raw) : {} }; } catch { throw Object.assign(new Error('Invalid JSON request.'),{status:400}); }
}
const shellQuote = v => `'${String(v).replace(/'/g,`'\\''`)}'`;
const maskSecret = v => v ? '[configured]' : '';
function curlFor(url, method, headers, payload) {
  const lines=[`curl --request ${method} ${shellQuote(url)}`];
  for(const [k,v] of Object.entries(headers)) if(v!==undefined&&v!==null) lines.push(`  --header ${shellQuote(`${k}: ${['x-client-id','x-client-secret'].includes(k.toLowerCase())?'[redacted]':v}`)}`);
  if(payload) lines.push(`  --data ${shellQuote(JSON.stringify(redact(payload),null,2))}`);
  return lines.join(' \\\n');
}
function httpResponseFor(response, data, text) {
  const head=[`HTTP/1.1 ${response.status} ${response.statusText||''}`.trim()];
  for(const [k,v] of response.headers) if(['content-type','x-api-version','x-request-id','date'].includes(k)) head.push(`${k}: ${v}`);
  const bodyText = data===undefined ? '[non-JSON response omitted]' : JSON.stringify(redact(data),null,2);
  return `${head.join('\n')}\n\n${bodyText}`;
}
function addTrace(c, entry) {
  if(!c.session) return;
  const list=traces.get(c.session.id)||[];
  list.unshift({time:new Date().toISOString(),environment:c.environment,...entry});
  traces.set(c.session.id,list.slice(0,30));
}
async function cf(c, path, method='GET', payload, headers={}) {
  assert(c.clientId && c.clientSecret,'Add Cashfree credentials in Settings or .env before calling the API.',422);
  const requestId = randomUUID(), url = c.baseUrl + path;
  const requestHeaders = { 'Content-Type':'application/json','x-client-id':c.clientId,'x-client-secret':c.clientSecret,'x-api-version':c.apiVersion || config.apiVersion,'x-request-id':requestId,...(method === 'POST' ? {'x-idempotency-key':randomUUID()} : {}),...headers };
  const base = {method,path,url,requestId,request:redact(payload),curl:curlFor(url,method,requestHeaders,payload)};
  let response, data, text;
  try {
    response = await fetch(url, { method, redirect:'error', signal: AbortSignal.timeout(25000), headers: requestHeaders, ...(payload ? {body:JSON.stringify(payload)} : {}) });
    text = await response.text();
    try { data=JSON.parse(text); } catch { data=undefined; }
  } catch (err) {
    addTrace(c,{...base,status:'ERROR',response:null,httpResponse:`No HTTP response received from Cashfree.\n${err.name}: request failed`});
    throw Object.assign(new Error('Cashfree request could not complete. Refresh the subscription/payment before retrying; a timed-out request may have succeeded.'), {status:502, requestId});
  }
  addTrace(c,{...base,status:response.status,cfRequestId:response.headers.get('x-request-id')||'',response:data===undefined?null:redact(data),httpResponse:httpResponseFor(response,data,text)});
  if(data===undefined) data={message:'Cashfree returned a non-JSON response.'};
  if (!response.ok) throw Object.assign(new Error(response.status === 401 ? 'Cashfree authentication failed. Check the App ID and Secret for the selected environment.' : (data.message || 'Cashfree rejected the request.')), {status:[401,403].includes(response.status) ? 422 : response.status >= 500 ? 502 : response.status, code:data.code, requestId});
  return data;
}
const keyFor = (c,id) => `${c.namespace}:${validId(id)}`;
async function record(c,id) { const r=(await readStore()).subscriptions[keyFor(c,id)]; assert(r,'Subscription not found in this merchant environment.',404); return r; }
function view(r) { const {subscription_session_id,...subscription}=r.subscription; return { ...subscription, product_id:r.productId, created_at:r.createdAt, payments:r.payments, service_access:serviceAccess(r.subscription,r.payments), return_event:r.returnEvent || null }; }
async function refresh(c,id) {
  const r=await record(c,id);
  if(c.mode === 'demo') return r;
  const s=await cf(c,`/subscriptions/${encodeURIComponent(id)}`);
  const payments=await cf(c,`/subscriptions/${encodeURIComponent(id)}/payments`);
  // Cashfree may return HTTP 200 + JSON null before the first AUTH/payment exists.
  // Treat this as an empty history so a new mandate can proceed to authorisation.
  const paymentList = payments === null ? [] : Array.isArray(payments) ? payments : payments?.payments;
  assert(Array.isArray(paymentList),'Unexpected Cashfree payments response.',502);
  return mutateStore(db=> { const x=db.subscriptions[keyFor(c,id)]; x.subscription=storedSubscription(s); x.payments=paymentList.map(paymentSummary); return x; });
}
function storedSubscription(s) {
  const customer=s.customer_details || {}, auth=s.authorization_details || {};
  return {...s,customer_details:Object.fromEntries(['customer_name','customer_email','customer_phone'].filter(k=>customer[k]!==undefined).map(k=>[k,customer[k]])),authorization_details:Object.fromEntries(['authorization_amount','authorization_amount_refund','authorization_status','payment_id','payment_method'].filter(k=>auth[k]!==undefined).map(k=>[k,auth[k]]))};
}
function paymentSummary(p) { return Object.fromEntries(['payment_id','cf_payment_id','payment_type','payment_status','payment_amount','payment_schedule_date','payment_method','payment_remarks','payment_initiated_date'].filter(k=>p[k] !== undefined).map(k=>[k,p[k]])); }
function publicConfig(c) { return {mode:c.mode,environment:c.environment,apiVersion:c.apiVersion,configured:!!(c.clientId&&c.clientSecret),clientIdHint:c.clientId ? '[configured]' : '',clientSecretHint:maskSecret(c.clientSecret),publicBaseUrl:config.publicBaseUrl,webhookUrl:`${config.publicBaseUrl}/webhooks/cashfree/${c.environment}`,passwordProtected:!!config.merchantPassword}; }
function sameOrigin(req) {
  assert(req.headers['x-demo-client'] === 'subscription-lab', 'Missing merchant client header.',403);
  if(req.headers.origin) { const origin=new URL(req.headers.origin); assert(origin.host === req.headers.host || origin.origin === config.publicBaseUrl,'Origin not allowed.',403); }
}
async function callback(req,res,url) {
  const data=req.method === 'POST' ? (await body(req)).data : Object.fromEntries(url.searchParams);
  const token=url.searchParams.get('state');
  assert(token && /^[a-f0-9]{48}$/.test(token),'Missing or invalid return state.',400);
  const entry=Object.entries((await readStore()).subscriptions).find(([,r])=>r.returnState === token);
  assert(entry,'Unknown return state.',404);
  const [key,r]=entry;
  if(data.cf_subscriptionId) assert(data.cf_subscriptionId === r.subscription.subscription_id,'Subscription mismatch.',400);
  // Return parameters are untrusted, including status/signature. Re-fetch with server credentials.
  let verificationError=null;
  try { const c=r.namespace === 'demo' ? {mode:'demo',namespace:'demo'} : {...credentials.get(r.namespace),namespace:r.namespace,apiVersion:r.apiVersion,mode:'cashfree'}; await refresh(c,r.subscription.subscription_id); }
  catch(err) { verificationError=err.message; }
  const allowed=['cf_subscriptionId','cf_status','cf_checkoutStatus','cf_mode','cf_subscriptionPaymentId','cf_message'];
  await mutateStore(db=>{ db.subscriptions[key].returnEvent={time:new Date().toISOString(),payload:Object.fromEntries(allowed.filter(k=>data[k]!==undefined).map(k=>[k,String(data[k]).slice(0,500)])),verificationError,verified:!verificationError}; });
  res.writeHead(303,{Location:`/?returned=${encodeURIComponent(r.subscription.subscription_id)}#subscriptions`});res.end();
}
async function webhook(req,res,environment) {
  assert(['sandbox','production'].includes(environment),'Unknown environment.',404);
  const {raw,data}=await body(req);
  const matches=[...credentials.entries()].filter(([,c])=>c.environment===environment && verifyWebhook(raw,req.headers['x-webhook-timestamp'],req.headers['x-webhook-signature'],c.clientSecret));
  assert(matches.length,'Invalid or expired webhook signature.',401);
  const id=data.data?.subscription_details?.subscription_id || data.data?.subscription_id;
  validId(id);
  let found=false;
  for(const [namespace,c] of matches) { if((await readStore()).subscriptions[`${namespace}:${id}`]) { await refresh({...c,namespace,mode:'cashfree'},id);found=true; } }
  assert(found,'Subscription is not registered in this demo.',404);
  json(res,200,{received:true});
}
const staticFiles={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css'};
export const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  try {
    const url=new URL(req.url,'http://localhost'), path=url.pathname;
    const requestHost=new URL(`http://${req.headers.host || ''}`).hostname;
    assert(['localhost','127.0.0.1','[::1]',new URL(config.publicBaseUrl).hostname].includes(requestHost),'Host not allowed.',403);
    if(path==='/health') return json(res,200,{ok:true});
    if(path==='/return/cashfree' && ['GET','POST'].includes(req.method)) return await callback(req,res,url);
    if(path.startsWith('/webhooks/cashfree/') && req.method==='POST') return await webhook(req,res,path.split('/').at(-1));
    if(staticFiles[path] && req.method==='GET') { res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'); return res.end(await readFile(fileURLToPath(new URL(`./public/${staticFiles[path]}`,import.meta.url)))); }
    const session=getSession(req,res);
    if(path==='/api/login' && req.method==='POST') { sameOrigin(req); const peer=req.socket.remoteAddress;const now=Date.now();const attempts=loginAttempts.get(peer);assert(!attempts || attempts.count<10 || now-attempts.since>15*60*1000,'Too many login attempts. Try again in 15 minutes.',429);loginAttempts.set(peer,{count:attempts&&now-attempts.since<=15*60*1000?attempts.count+1:1,since:attempts&&now-attempts.since<=15*60*1000?attempts.since:now}); const {data}=await body(req); const a=Buffer.from(String(data.password||'')), b=Buffer.from(config.merchantPassword);assert(a.length===b.length&&timingSafeEqual(a,b),'Incorrect merchant password.',401);loginAttempts.delete(peer);traces.delete(session.id);sessions.delete(session.id);session.id=randomBytes(24).toString('hex');sessions.set(session.id,session);res.setHeader('Set-Cookie',`merchant_session=${session.id}; HttpOnly; SameSite=Lax; Path=/${config.publicBaseUrl.startsWith('https:')?'; Secure':''}`);session.authenticated=true;return json(res,200,{ok:true}); }
    assert(session.authenticated,'Merchant login required.',401);
    const c=context(session);
    if(req.method!=='GET') sameOrigin(req);
    if(path==='/api/config'&&req.method==='GET') return json(res,200,publicConfig(c));
    if(path==='/api/config'&&req.method==='POST') {
      const {data}=await body(req);assert(['demo','cashfree'].includes(data.mode),'Choose demo or Cashfree mode.');assert(['sandbox','production'].includes(data.environment),'Choose sandbox or production.');assert(/^20\d\d-\d\d-\d\d$/.test(data.apiVersion),'Use an API version in YYYY-MM-DD format.');
      if(data.environment==='production'&&data.mode==='cashfree') assert(data.confirmProduction===true,'Confirm that production uses real bank mandates and payments.');
      if(!data.useServerKeys && (data.clientId || data.clientSecret)) { assert(typeof data.clientId==='string'&&typeof data.clientSecret==='string'&&data.clientId.trim()&&data.clientSecret.trim(),'Provide both App ID and Secret.');session.credentials={...config.environments[data.environment],clientId:data.clientId.trim(),clientSecret:data.clientSecret.trim()}; }
      else if(session.environment!==data.environment || data.useServerKeys) delete session.credentials;
      session.mode=data.mode;session.environment=data.environment;session.apiVersion=data.apiVersion;traces.delete(session.id);
      return json(res,200,publicConfig(context(session)));
    }
    if(path==='/api/enach-banks'&&req.method==='GET') return json(res,200,enachBanks);
    if(path==='/api/products'&&req.method==='GET') return json(res,200,products);
    if(path==='/api/traces'&&req.method==='GET') return json(res,200,traces.get(session.id)||[]);
    if(path==='/api/subscriptions'&&req.method==='GET') return json(res,200,Object.values((await readStore()).subscriptions).filter(r=>r.namespace===c.namespace).map(view).sort((a,b)=>b.created_at.localeCompare(a.created_at)));
    if(path==='/api/subscriptions'&&req.method==='POST') {
      const {data}=await body(req);const product=products.find(p=>p.id===data.productId);assert(product,'Choose a product.');assert(['PERIODIC','ON_DEMAND'].includes(data.planType),'Choose a valid plan type.');
      const customer=data.customer;assert(customer&&String(customer.customer_name||'').trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.customer_email)&&/^\d{10}$/.test(customer.customer_phone),'Enter a name, valid email and 10-digit mobile number.');
      const id=`sub_${randomUUID().replaceAll('-','').slice(0,20)}`, returnState=randomBytes(24).toString('hex');
      const max=amount(data.maxAmount,'Mandate maximum');const price=amount(data.amount,'Plan amount');assert(max>=price,'Mandate maximum must cover the plan amount.');
      const authAmount=amount(data.authAmount,'Authorisation amount');assert(authAmount<=max,'Authorisation amount exceeds mandate maximum.');
      const plan={plan_name:product.name,plan_type:data.planType,plan_currency:'INR',plan_max_amount:max,plan_max_cycles:120,...(data.planType==='PERIODIC'?{plan_amount:price,plan_intervals:1,plan_interval_type:'MONTH'}:{})};
      const payload={subscription_id:id,customer_details:{customer_name:customer.customer_name.trim().slice(0,100),customer_email:customer.customer_email,customer_phone:customer.customer_phone},plan_details:plan,authorization_details:{authorization_amount:authAmount,authorization_amount_refund:!!data.authRefund,payment_methods:['enach','upi','card']},subscription_meta:{return_url:`${config.publicBaseUrl}/return/cashfree?state=${returnState}`},subscription_expiry_time:new Date(Date.now()+365*86400000).toISOString(),...(data.planType==='PERIODIC'?{subscription_first_charge_time:new Date(Date.now()+3*86400000).toISOString()}:{})};
      const subscription=c.mode==='demo'?{...payload,subscription_session_id:`demo_${randomUUID()}`,subscription_status:'INITIALIZED',cf_subscription_id:`demo_${Date.now()}`}:await cf(c,'/subscriptions','POST',payload);
      await mutateStore(db=>{db.subscriptions[keyFor(c,id)]={namespace:c.namespace,environment:c.environment,apiVersion:c.apiVersion,productId:product.id,createdAt:new Date().toISOString(),subscription:storedSubscription(subscription),returnState,payments:[]};});
      return json(res,201,view(await record(c,id)));
    }
    const match=path.match(/^\/api\/subscriptions\/([\w-]+)(?:\/(refresh|authorize|charge|simulate|demo-authorize|demo-cycle|consume))?$/);
    if(match) {
      const [,id,action]=match; let r=await record(c,id);
      if(!action&&req.method==='GET') return json(res,200,view(r));
      assert(req.method==='POST','Method not allowed.',405);
      const {data}=await body(req);
      if(action==='refresh') return json(res,200,view(await refresh(c,id)));
      if(action==='authorize') {
        if(c.mode!=='demo') r=await refresh(c,id);
        assert(['INITIALIZED','BANK_APPROVAL_PENDING'].includes(r.subscription.subscription_status),'This mandate is not awaiting authorisation.');
        const method=data.method;assert(['upi','enach','card'].includes(method),'Choose a payment method.');
        let instrument;
        if(method==='upi') { assert(['qrcode','collect','link'].includes(data.channel),'Invalid UPI channel.');if(data.channel==='link') assert(data.device==='mobile','UPI Intent requires a mobile device.');if(data.channel==='collect') {assert(/^[\w.\-]+@[\w.\-]+$/.test(data.upiId),'Enter a valid UPI ID.');} instrument={channel:data.channel,...(data.channel==='collect'?{upi_id:data.upiId}:{})}; }
        if(method==='enach') {
          assert(['net_banking','debit_card','aadhaar'].includes(data.authMode),'Choose eNACH authorisation.');
          // Resolve from the published bank directory, never from the IFSC prefix.
          // A number of co-operative banks use a sponsor bank's IFSC prefix.
          const bank=enachBanks.banks.find(b=>b.id===(data.bankId || data.bankCode));
          assert(bank,'Choose a bank from the eNACH bank list.');
          assert(data.accountName&&/^\d{6,20}$/.test(data.accountNumber)&&/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifsc),'Enter valid bank account details and IFSC.');
          instrument={channel:'link',auth_mode:data.authMode,account_holder_name:data.accountName,account_number:data.accountNumber,account_ifsc:data.ifsc,account_bank_code:bank.id,account_type:data.accountType==='CURRENT'?'CURRENT':'SAVINGS'};
        }
        if(method==='card') {assert(String(r.subscription.customer_details?.customer_phone).trim()!=='9999999999','9999999999 is not supported for card-based authorisation. Please use any other mobile number.');assert(/^\d{13,19}$/.test(data.cardNumber||'')&&/^\d{3,4}$/.test(data.cvv||'')&&/^(0[1-9]|1[0-2])$/.test(data.expiryMonth||'')&&/^\d{2}$/.test(data.expiryYear||'')&&data.cardName,'Enter complete card details.');instrument={channel:'link',card_number:data.cardNumber,card_cvv:data.cvv,card_expiry_mm:data.expiryMonth,card_expiry_yy:data.expiryYear,card_holder_name:data.cardName}; }
        const paymentId=`pay_${randomUUID().replaceAll('-','').slice(0,20)}`;
        const payload={subscription_id:id,subscription_session_id:r.subscription.subscription_session_id,payment_id:paymentId,payment_type:'AUTH',payment_method:{[method]:instrument},payment_schedule_date:new Date(Date.now()+2*86400000).toISOString()};
        const headers={};
        if(method==='upi'&&data.channel==='collect') {
          // Subscription Collect is permitted across platforms. Never label desktop/Android as iOS.
          headers['x-client-device']=['mobile','desktop','tablet'].includes(data.device)?data.device:'desktop';
          headers['x-client-browser']=['safari','chrome','firefox','edge'].includes(data.browser)?data.browser:'chrome';
          if(data.os==='ios')headers['x-client-os']='ios';
          if(headers['x-client-device']==='mobile')headers['x-client-rendering-type']=['webview','mweb','native'].includes(data.rendering)?data.rendering:'mweb';
        }
        const response=c.mode==='demo'?{demo:true,payment_id:paymentId,payment_type:'AUTH',payment_status:'PENDING',payment_method:method,payment_amount:r.subscription.authorization_details.authorization_amount,subscription_id:id}:await cf(c,'/subscriptions/pay','POST',payload,headers);
        await mutateStore(db=>{db.subscriptions[keyFor(c,id)].payments.push(paymentSummary(response));});
        // Normalize after persisting payment ID so unsupported actions remain inspectable/recoverable.
        const next=normalizeAuth(response,{environment:c.environment});
        if(next.kind==='qr'&&!next.image) next.image=await QRCode.toDataURL(next.value,{width:280,margin:2});
        return json(res,200,{payment:paymentSummary(response),next,response:redact(response)});
      }
      if(action==='demo-authorize') {
        assert(c.mode==='demo','Offline authorisation is only available in demo mode.',403);
        assert(['ACTIVE','BANK_APPROVAL_PENDING','INITIALIZED'].includes(data.status),'Invalid demo status.');
        await mutateStore(db=>{const x=db.subscriptions[keyFor(c,id)];x.subscription.subscription_status=data.status; const p=x.payments.findLast(p=>p.payment_type==='AUTH');if(p)p.payment_status=data.status==='INITIALIZED'?'FAILED':data.status==='ACTIVE'?'SUCCESS':'PENDING';});
        return json(res,200,view(await record(c,id)));
      }
      if(action==='demo-cycle') {
        assert(c.mode==='demo','Offline billing cycles are only available in demo mode.',403);
        assert(r.subscription.subscription_status==='ACTIVE','Billing cycles require an ACTIVE mandate.',409);
        assert(r.subscription.plan_details.plan_type==='PERIODIC','Use Schedule charge for on-demand plans.');
        const payment={subscription_id:id,payment_id:`pay_${randomUUID().replaceAll('-','').slice(0,20)}`,payment_type:'CHARGE',payment_status:'PENDING',payment_amount:r.subscription.plan_details.plan_amount,payment_schedule_date:new Date().toISOString(),payment_remarks:'Offline periodic cycle illustration'};
        await mutateStore(db=>db.subscriptions[keyFor(c,id)].payments.push(payment));
        return json(res,201,payment);
      }
      if(action==='charge') {
        if(c.mode!=='demo') r=await refresh(c,id);
        assert(r.subscription.subscription_status==='ACTIVE','Charges require an ACTIVE subscription.',409);
        assert(r.subscription.plan_details.plan_type==='ON_DEMAND','Periodic plans are charged automatically. Use an on-demand plan for manual charging.',409);
        const charge=amount(data.amount);assert(charge<=r.subscription.plan_details.plan_max_amount,'Charge exceeds the authorised mandate maximum.');
        const date=new Date(data.scheduleDate);assert(Number.isFinite(date.getTime())&&date.getTime()>Date.now(),'Choose a future schedule date.');
        const payload={subscription_id:id,payment_id:`pay_${randomUUID().replaceAll('-','').slice(0,20)}`,payment_type:'CHARGE',payment_amount:charge,payment_schedule_date:date.toISOString(),payment_remarks:String(data.remarks||'Service usage').slice(0,200)};
        if(c.environment==='production'&&c.mode!=='demo') assert(data.confirmProduction===true,'Confirm this real production charge.');
        const response=c.mode==='demo'?{...payload,payment_status:'PENDING'}:await cf(c,'/subscriptions/pay','POST',payload);
        await mutateStore(db=>db.subscriptions[keyFor(c,id)].payments.push(paymentSummary(response)));
        return json(res,201,paymentSummary(response));
      }
      if(action==='simulate') {
        assert(c.mode==='demo'||c.environment==='sandbox','Cashfree simulation is available only in sandbox.',403);
        assert(['SUCCESS','FAILED'].includes(data.status),'Choose SUCCESS or FAILED.');validId(data.paymentId);
        // Reconcile with Cashfree before testing eligibility: cached PENDING may be stale.
        if(c.mode!=='demo') r=await refresh(c,id);
        const payment=r.payments.find(p=>p.payment_id===data.paymentId);assert(payment,'Payment does not belong to this subscription.',404);assert(payment.payment_type==='CHARGE' || (payment.payment_type==='AUTH' && c.mode==='cashfree' && c.environment==='sandbox'),'AUTH simulation is available only through Cashfree sandbox; use the offline mandate controls in demo mode.');assert(payment.payment_status==='PENDING',`Only PENDING payments can be simulated. Current status: ${payment.payment_status || 'UNKNOWN'}.`,409);
        const payload={entity:'SUBS_PAYMENTS',entity_id:data.paymentId,entity_simulation:{payment_status:data.status,payment_error_code:data.status==='FAILED'?'ISSUER_NOT_AVAILABLE':''}};
        if(c.mode==='demo') {await mutateStore(db=>{db.subscriptions[keyFor(c,id)].payments.find(p=>p.payment_id===data.paymentId).payment_status=data.status;});return json(res,200,{...payload,simulation_id:`offline_${randomUUID()}`});}
        const result=await cf(c,'/simulate','POST',payload); await refresh(c,id);return json(res,200,result);
      }
      if(action==='consume') {
        if(c.mode!=='demo') r=await refresh(c,id);
        assert(serviceAccess(r.subscription,r.payments),'Service is available after a verified successful charge on an ACTIVE mandate.',409);
        return json(res,200,{message:'Your paid service is ready. This is a reference fulfilment endpoint; connect your own product here.'});
      }
    }
    json(res,404,{message:'Endpoint not found.'});
  } catch(err) { json(res,err.status||500,{message:err.status?err.message:'An internal error occurred. Check the local server.',...(err.code?{code:err.code}:{}),...(err.requestId?{requestId:err.requestId}:{})});if(!err.status) console.error('Request failed:',err.name); }
});
if(process.argv[1]===fileURLToPath(import.meta.url)) server.listen(config.port,config.host,()=>console.log(`Subscription Lab: http://${config.host}:${config.port} (${config.mode})`));
