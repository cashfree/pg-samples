import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {request as httpRequest} from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'subscription-lab-test-'));
process.env.PUBLIC_BASE_URL='http://localhost:3000';process.env.HOST='127.0.0.1';process.env.CASHFREE_ENV='sandbox';process.env.DATA_DIR=dir;process.env.APP_MODE='demo';process.env.MERCHANT_PASSWORD='';
const { server }=await import('../server.js');
let origin,cookie='';const nativeFetch=global.fetch;
before(async()=>{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{global.fetch=nativeFetch;await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
async function request(path,data,options={}) { const res=await nativeFetch(origin+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-demo-client':'subscription-lab',cookie,...options.headers},...(data===undefined?{}:{body:JSON.stringify(data)}),redirect:options.redirect||'follow'});const set=res.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {res,data:res.headers.get('content-type')?.includes('json')?await res.json():await res.text()}; }
const draft={productId:'studio',planType:'ON_DEMAND',amount:499,maxAmount:2000,authAmount:1,customer:{customer_name:'Test Merchant',customer_email:'merchant@example.com',customer_phone:'9999999999'}};
let id,paymentId;
test('server serves static assets without exposing configuration files',async()=>{assert.equal((await request('/')).res.status,200);assert.equal((await request('/.env')).res.status,404);assert.equal(await new Promise((resolve,reject)=>{const req=httpRequest(origin+'/health',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();}),403);assert.equal((await request('/config.js')).res.status,404);});
test('create on-demand subscription and enforce mandate consent boundaries',async()=>{const result=await request('/api/subscriptions',draft);assert.equal(result.res.status,201);id=result.data.subscription_id;assert.equal(result.data.subscription_status,'INITIALIZED');assert.equal(result.data.service_access,false);assert.equal((await request(`/api/subscriptions/${id}/consume`,{})).res.status,409);assert.equal((await request(`/api/subscriptions/${id}/charge`,{amount:499,scheduleDate:new Date(Date.now()+86400000).toISOString()})).res.status,409);});
test('mobile-only Intent and UPI ID validation enforced server-side',async()=>{assert.equal((await request(`/api/subscriptions/${id}/authorize`,{method:'upi',channel:'link',device:'desktop'})).res.status,400);assert.equal((await request(`/api/subscriptions/${id}/authorize`,{method:'upi',channel:'collect',device:'mobile',os:'android',upiId:'invalid-upi-id'})).res.status,400);});
test('authorise, schedule charge, fail a payment, then succeed and unlock service',async()=>{
  const auth=await request(`/api/subscriptions/${id}/authorize`,{method:'upi',channel:'qrcode'});assert.equal(auth.data.next.kind,'demo');
  assert.equal((await request(`/api/subscriptions/${id}/simulate`,{paymentId:auth.data.payment.payment_id,status:'SUCCESS'})).res.status,400);
  const active=await request(`/api/subscriptions/${id}/demo-authorize`,{status:'ACTIVE'});assert.equal(active.data.service_access,false);
  const scheduleDate=new Date(Date.now()+2*86400000).toISOString();
  assert.equal((await request(`/api/subscriptions/${id}/charge`,{amount:2001,scheduleDate})).res.status,400);
  const charge=await request(`/api/subscriptions/${id}/charge`,{amount:499,scheduleDate});paymentId=charge.data.payment_id;assert.equal(charge.res.status,201);
  assert.equal((await request(`/api/subscriptions/${id}/simulate`,{paymentId,status:'FAILED'})).res.status,200);
  assert.equal((await request(`/api/subscriptions/${id}`)).data.service_access,false);
  assert.equal((await request(`/api/subscriptions/${id}/simulate`,{paymentId,status:'SUCCESS'})).res.status,409);
  const next=await request(`/api/subscriptions/${id}/charge`,{amount:499,scheduleDate});
  await request(`/api/subscriptions/${id}/simulate`,{paymentId:next.data.payment_id,status:'SUCCESS'});
  assert.equal((await request(`/api/subscriptions/${id}`)).data.service_access,true);
  assert.equal((await request(`/api/subscriptions/${id}/consume`,{})).res.status,200);
});
test('periodic subscriptions cannot be charged manually',async()=>{const created=await request('/api/subscriptions',{...draft,planType:'PERIODIC'});const periodic=created.data.subscription_id;await request(`/api/subscriptions/${periodic}/demo-authorize`,{status:'ACTIVE'});assert.equal((await request(`/api/subscriptions/${periodic}/charge`,{amount:499,scheduleDate:new Date(Date.now()+86400000).toISOString()})).res.status,409);});
test('offline periodic cycle can be simulated without manually charging Cashfree',async()=>{const created=await request('/api/subscriptions',{...draft,planType:'PERIODIC'});const sid=created.data.subscription_id;assert.equal((await request(`/api/subscriptions/${sid}/demo-cycle`,{})).res.status,409);await request(`/api/subscriptions/${sid}/demo-authorize`,{status:'ACTIVE'});const cycle=await request(`/api/subscriptions/${sid}/demo-cycle`,{});assert.equal(cycle.data.payment_amount,499);await request(`/api/subscriptions/${sid}/simulate`,{paymentId:cycle.data.payment_id,status:'SUCCESS'});assert.equal((await request(`/api/subscriptions/${sid}`)).data.service_access,true);});
test('return POST accepts form body but never trusts claimed status',async()=>{
  const created=await request('/api/subscriptions',draft);const sub=created.data;
  const url=new URL(sub.subscription_meta.return_url);
  const res=await nativeFetch(origin+url.pathname+url.search,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({cf_subscriptionId:sub.subscription_id,cf_status:'ACTIVE',cf_checkoutStatus:'SUCCESS'}),redirect:'manual'});
  assert.equal(res.status,303);
  const fetched=(await request(`/api/subscriptions/${sub.subscription_id}`)).data;assert.equal(fetched.subscription_status,'INITIALIZED');assert.equal(fetched.service_access,false);assert.equal(fetched.return_event.payload.cf_status,'ACTIVE');
  assert.equal((await request('/return/cashfree',{cf_status:'ACTIVE'})).res.status,400);
});
test('cross-origin mutations and forged webhooks are rejected',async()=>{assert.equal((await request('/api/subscriptions',draft,{headers:{origin:'https://evil.example'}})).res.status,403);assert.equal((await request('/webhooks/cashfree/sandbox',{data:{subscription_id:id}})).res.status,401);});
test('mocked Cashfree contracts use versioned server credentials and merchant payment ID',async()=>{
  const calls=[];let subscription;let charge;let qrPayload='upi://mandate?pa=demo@bank&am=1';let upiSimulatorUrl;const authPayments=[];
  global.fetch=async(url,options)=>{
    assert.ok(['sandbox.cashfree.com','api.cashfree.com'].includes(new URL(url).hostname));calls.push({url,options});
    const payload=options.body?JSON.parse(options.body):null;
    let result;
    if(url.endsWith('/subscriptions')&&options.method==='POST')result=subscription={...payload,subscription_session_id:'mock-session',subscription_status:'INITIALIZED'};
    else if(url.endsWith('/payments'))result=charge||authPayments.length?[...authPayments,...(charge?[charge]:[])]:null;
    else if(options.method==='GET')result=subscription;
    else if(url.endsWith('/simulate')){assert.equal(payload.entity,'SUBS_PAYMENTS');const target=[...authPayments,charge].find(p=>p?.payment_id===payload.entity_id);assert.ok(target,'Simulation must use the merchant payment_id');target.payment_status=payload.entity_simulation.payment_status;if(target.payment_type==='AUTH')subscription.subscription_status=target.payment_status==='SUCCESS'?'ACTIVE':'INITIALIZED';result={simulation_id:'mock-simulation'};}
    else if(payload.payment_type==='AUTH'&&payload.payment_method?.upi?.channel==='collect')result={payment_id:payload.payment_id,payment_type:'AUTH',payment_status:'PENDING',channel:'collect',...(upiSimulatorUrl?{data:{url:'https://payments-test.cashfree.com/pgbillpayuiapi/simulator',method:'post',payload:{paymentType:'UPI',upiIntentData:{androidAuthAppLinks:{DEFAULT:upiSimulatorUrl}}}}}:{})};
    else if(payload.payment_type==='AUTH'&&payload.payment_method?.upi?.channel==='qrcode')result={payment_id:payload.payment_id,payment_type:'AUTH',payment_status:'PENDING',channel:'qrcode',data:{...(upiSimulatorUrl?{url:'https://payments-test.cashfree.com/pgbillpayuiapi/simulator',method:'post'}:{}),payload:{qrData:qrPayload,...(upiSimulatorUrl?{upiIntentData:{androidAuthAppLinks:{DEFAULT:upiSimulatorUrl}}}:{})}}};
    else if(payload.payment_type==='AUTH') result={payment_id:payload.payment_id,payment_type:'AUTH',payment_status:'PENDING',data:{url:'https://enach.npci.org.in/onmags/sendRequest',method:'post',payload:{MandateReqDoc:'<Document>unchanged</Document>',AuthMode:'NetBanking'}}};
    else result=charge={...payload,payment_status:'PENDING'};
    if(payload?.payment_type==='AUTH')authPayments.push(result);
    return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
  };
  await request('/api/config',{mode:'cashfree',environment:'sandbox',apiVersion:'2025-01-01',clientId:'test-app-id',clientSecret:'not-a-real-key'});
  const created=await request('/api/subscriptions',draft);assert.equal(created.res.status,201);
  const sid=created.data.subscription_id;
  const cardDetails={method:'card',cardName:'Test Merchant',cardNumber:'4111111111111111',cvv:'123',expiryMonth:'12',expiryYear:'29'};
  const authCountBefore=calls.filter(c=>c.url.endsWith('/subscriptions/pay')).length;
  const blockedCard=await request(`/api/subscriptions/${sid}/authorize`,{...cardDetails,customer_phone:'9876543210'});
  assert.equal(blockedCard.res.status,400);assert.match(blockedCard.data.message,/9999999999 is not supported for card-based authorisation/);
  assert.equal(calls.filter(c=>c.url.endsWith('/subscriptions/pay')).length,authCountBefore,'Blocked card phone must not call Create AUTH even with a spoofed phone in the request');
  const emptyHistory=await request(`/api/subscriptions/${sid}/refresh`,{});assert.equal(emptyHistory.res.status,200);assert.deepEqual(emptyHistory.data.payments,[]);
  const auth=await request(`/api/subscriptions/${sid}/authorize`,{method:'enach',authMode:'net_banking',accountName:'Test User',accountNumber:'1234567890',ifsc:'HDFC0000001',bankCode:'HDFC'});assert.equal(auth.data.next.kind,'post');
  assert.equal((await request(`/api/subscriptions/${sid}/simulate`,{paymentId:auth.data.payment.payment_id,status:'FAILED'})).res.status,200);
  const failedAuth=(await request(`/api/subscriptions/${sid}`)).data;assert.equal(failedAuth.subscription_status,'INITIALIZED');assert.equal(failedAuth.payments[0].payment_status,'FAILED');assert.equal(failedAuth.service_access,false);
  assert.equal((await request(`/api/subscriptions/${sid}/simulate`,{paymentId:auth.data.payment.payment_id,status:'SUCCESS'})).res.status,409);
  for(const client of [{device:'desktop',os:'other',browser:'chrome'},{device:'mobile',os:'android',browser:'chrome',rendering:'webview'},{device:'mobile',os:'ios',browser:'safari',rendering:'mweb'}]){
    const collect=await request(`/api/subscriptions/${sid}/authorize`,{method:'upi',channel:'collect',upiId:'tester@bank',...client});
    assert.equal(collect.res.status,200);assert.equal(collect.data.next.kind,'collect');
    const sent=calls.filter(c=>c.options.body&&JSON.parse(c.options.body).payment_method?.upi?.channel==='collect').at(-1);
    assert.equal(JSON.parse(sent.options.body).payment_method.upi.upi_id,'tester@bank');
    assert.equal(sent.options.headers['x-client-device'],client.device);
    assert.equal(sent.options.headers['x-client-os'],client.os==='ios'?'ios':undefined);
    assert.equal(sent.options.headers['x-client-rendering-type'],client.device==='mobile'?client.rendering:undefined);
  }
  upiSimulatorUrl='https://payments-test.cashfree.com/subs-checkout/checkout/simulator/UPI/test?auth_id=123';
  for(const channel of ['qrcode','collect']){
    const simulatedAuth=await request(`/api/subscriptions/${sid}/authorize`,{method:'upi',channel,upiId:'tester@bank',device:'desktop'});
    assert.equal(simulatedAuth.res.status,200);assert.deepEqual(simulatedAuth.data.next,{kind:'redirect',url:upiSimulatorUrl,simulator:true});
  }
  upiSimulatorUrl=undefined;
  const sponsored=await request(`/api/subscriptions/${sid}/authorize`,{method:'enach',authMode:'net_banking',bankId:'CGBX',bankCode:'HDFC',accountName:'Test User',accountNumber:'1234567890',ifsc:'SBIN0000001'});
  assert.equal(sponsored.res.status,200);
  const bankRequest=calls.filter(c=>c.options.body&&JSON.parse(c.options.body).payment_method?.enach).at(-1);
  assert.equal(JSON.parse(bankRequest.options.body).payment_method.enach.account_bank_code,'CGBX');
  assert.equal(JSON.parse(bankRequest.options.body).payment_method.enach.account_ifsc,'SBIN0000001');
  const unsupported=await request(`/api/subscriptions/${sid}/authorize`,{method:'enach',authMode:'net_banking',bankId:'ZZZZ',accountName:'Test User',accountNumber:'1234567890',ifsc:'SBIN0000001'});
  assert.equal(unsupported.res.status,400);
  const qr=await request(`/api/subscriptions/${sid}/authorize`,{method:'upi',channel:'qrcode'});assert.equal(qr.data.next.kind,'qr');assert.match(qr.data.next.image,/^data:image\/png;base64,/);
  const existingImage=await QRCode.toDataURL('upi://mandate?pa=demo@bank&am=1');
  qrPayload=existingImage.split(',')[1];
  const imageQr=await request(`/api/subscriptions/${sid}/authorize`,{method:'upi',channel:'qrcode'});
  assert.equal(imageQr.res.status,200);assert.equal(imageQr.data.next.image,existingImage,'Base64 QR images must pass through without being encoded as a second QR');
  assert.equal((await request(`/api/subscriptions/${sid}/simulate`,{paymentId:qr.data.payment.payment_id,status:'SUCCESS'})).res.status,200);
  const activeAuth=(await request(`/api/subscriptions/${sid}`)).data;assert.equal(activeAuth.subscription_status,'ACTIVE');assert.equal(activeAuth.service_access,false);assert.equal((await request(`/api/subscriptions/${sid}/consume`,{})).res.status,409);
  await request(`/api/subscriptions/${sid}/charge`,{amount:499,scheduleDate:new Date(Date.now()+86400000).toISOString()});
  for(const status of ['INITIALIZED','SUCCESS','FAILED','CANCELLED','PROCESSING','UNKNOWN']) {
    charge.payment_status=status;
    const before=calls.filter(c=>c.url.endsWith('/simulate')).length;
    const rejected=await request(`/api/subscriptions/${sid}/simulate`,{paymentId:charge.payment_id,status:'SUCCESS'});
    assert.equal(rejected.res.status,409);assert.match(rejected.data.message,new RegExp(status));
    assert.equal(calls.filter(c=>c.url.endsWith('/simulate')).length,before,'Non-PENDING state must not call Cashfree simulation, even if the app cached PENDING');
  }
  charge.payment_status='PENDING';
  await request(`/api/subscriptions/${sid}/simulate`,{paymentId:charge.payment_id,status:'SUCCESS'});
  assert.equal((await request(`/api/subscriptions/${sid}`)).data.service_access,true);
  for(const call of calls){assert.equal(call.options.headers['x-client-secret'],'not-a-real-key');assert.equal(call.options.headers['x-api-version'],'2025-01-01');}
  const inspector=JSON.stringify((await request('/api/traces')).data);assert.equal(inspector.includes('not-a-real-key'),false);assert.equal(inspector.includes('test-app-id'),false);assert.equal((await request('/api/config')).data.clientSecretHint,'[configured]');
  const lastTrace=(await request('/api/traces')).data[0];assert.match(lastTrace.curl,/^curl --request (GET|POST) 'https:\/\/sandbox\.cashfree\.com\/pg\//);assert.match(lastTrace.curl,/x-client-secret: \[redacted\]/);assert.match(lastTrace.httpResponse,/^HTTP\/1\.1 200/);assert.equal(lastTrace.environment,'sandbox');
  const otherCustomer=await request('/api/subscriptions',{...draft,customer:{...draft.customer,customer_phone:'9876543210'}});
  const allowedCard=await request(`/api/subscriptions/${otherCustomer.data.subscription_id}/authorize`,cardDetails);
  assert.equal(allowedCard.res.status,200);assert.equal(allowedCard.data.next.kind,'post');
  assert.ok(calls.some(c=>c.options.body&&JSON.parse(c.options.body).payment_method?.card),'Other mobile numbers must still allow card AUTH');
  // Production restrictions apply even when an arbitrary payment is supplied.
  await request('/api/config',{mode:'cashfree',environment:'production',apiVersion:'2025-01-01',confirmProduction:true,clientId:'prod-placeholder',clientSecret:'prod-placeholder'});
  assert.equal((await request('/api/subscriptions')).data.length,0);
  const liveCreated=await request('/api/subscriptions',draft);const liveId=liveCreated.data.subscription_id;
  assert.equal((await request(`/api/subscriptions/${liveId}/simulate`,{paymentId:'anything',status:'SUCCESS'})).res.status,403);
  assert.equal((await request(`/api/subscriptions/${liveId}/demo-authorize`,{status:'ACTIVE'})).res.status,403);
  assert.equal((await request(`/api/subscriptions/${liveId}/demo-cycle`,{})).res.status,403);
  subscription.subscription_status='ACTIVE';
  assert.equal((await request(`/api/subscriptions/${liveId}/charge`,{amount:499,scheduleDate:new Date(Date.now()+86400000).toISOString()})).res.status,400);
  global.fetch=async()=>new Response(JSON.stringify({message:'authentication Failed',code:'request_failed'}),{status:401,headers:{'Content-Type':'application/json'}});
  const rejected=await request('/api/subscriptions',draft);assert.equal(rejected.res.status,422);assert.match(rejected.data.message,/Cashfree authentication failed/);
  global.fetch=nativeFetch;
});

test('workspace login rotates sessions, blocks old cookies and rate-limits password guessing',async()=>{
  const {config}=await import('../config.js');
  config.merchantPassword='sample-password-for-tests';cookie='';
  try{
    assert.equal((await request('/api/config')).res.status,401);
    const before=cookie;
    assert.equal((await request('/api/login',{password:config.merchantPassword})).res.status,200);
    const authenticated=cookie;assert.notEqual(authenticated,before);
    assert.equal((await request('/api/config',undefined,{headers:{cookie:before}})).res.status,401);
    assert.equal((await request('/api/config',undefined,{headers:{cookie:authenticated}})).res.status,200);
    for(let i=0;i<10;i++)assert.equal((await request('/api/login',{password:'incorrect'},{headers:{cookie:''}})).res.status,401);
    assert.equal((await request('/api/login',{password:'incorrect'},{headers:{cookie:''}})).res.status,429);
  }finally{config.merchantPassword='';}
});
