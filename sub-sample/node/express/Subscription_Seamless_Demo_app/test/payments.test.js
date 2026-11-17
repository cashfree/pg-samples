import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { createHmac } from 'node:crypto';
import { normalizeAuth, parseCurl, verifyWebhook, redact, serviceAccess, validId, amount } from '../lib/payments.js';

test('eNACH legacy fields become form POST without modifying mandate XML', () => {
  const payload={AuthMode:'NetBanking',BankID:'HDFC',MandateReqDoc:'<Document attr="1">&test</Document>',CheckSumVal:'abc+/='};
  const action=normalizeAuth({data:{url:'https://enach.npci.org.in/onmags/sendRequest',method:'post',payload}});
  assert.equal(action.kind,'post');assert.deepEqual(action.fields,payload);
});
test('direct redirect feature flag response takes priority',()=>{
  assert.deepEqual(normalizeAuth({data:{url:'https://payments.cashfree.com/auth'}}),{kind:'redirect',url:'https://payments.cashfree.com/auth'});
  assert.equal(normalizeAuth({data:{redirect_url:'https://payments.cashfree.com/auth',payload:{legacy:'ignored'}}}).kind,'redirect');
});
test('legacy cURL is parsed as data, never executed',()=>{
  const curl=`curl --request POST --url 'https://enach.npci.org.in/onmags/sendRequest' --data '{"MandateReqDoc":"$(touch /tmp/never-run)","AuthMode":"DebitCard"}'`;
  assert.equal(parseCurl(curl).payload.MandateReqDoc,'$(touch /tmp/never-run)');
  assert.equal(normalizeAuth({curl}).kind,'post');
  assert.throws(()=>parseCurl('curl https://example.com --data @localfile'));
});
test('UPI QR, intent and collect response variants',()=>{
  assert.equal(normalizeAuth({channel:'qrcode',data:{payload:{qrData:'upi://mandate?pa=test@bank'}}}).kind,'qr');
  const action=normalizeAuth({channel:'link',data:{payload:{upiIntentData:{androidAuthAppLinks:{GPAY:'upi://mandate'},iosAuthAppLinks:{GPAY:'tez://mandate'}}}}});
  assert.equal(action.android.GPAY,'upi://mandate');assert.equal(action.ios.GPAY,'tez://mandate');
  assert.equal(normalizeAuth({channel:'collect'}).kind,'collect');
});
test('unsafe redirect protocols and malformed actions fail closed',()=>{
  for (const url of ['javascript:alert(1)','http://bank.example','https://user:pass@bank.example']) assert.throws(()=>normalizeAuth({data:{url}}));
  assert.throws(()=>normalizeAuth({data:{}}));
});
test('signed raw webhooks reject tampering, replay and incorrect secret',()=>{
  const timestamp=String(Date.now()), raw=Buffer.from('{ "data": {"id":1} }'),secret='test-only-key';
  const signature=createHmac('sha256',secret).update(timestamp).update(raw).digest('base64');
  assert.equal(verifyWebhook(raw,timestamp,signature,secret),true);
  assert.equal(verifyWebhook(Buffer.from('{}'),timestamp,signature,secret),false);
  assert.equal(verifyWebhook(raw,timestamp,signature,'other'),false);
  assert.equal(verifyWebhook(raw,timestamp,signature,secret,Date.now()+600000),false);
});
test('successful AUTH, pending/failed charge and inactive mandate never grant service',()=>{
  const active={subscription_status:'ACTIVE'};
  assert.equal(serviceAccess(active,[{payment_type:'AUTH',payment_status:'SUCCESS'}]),false);
  assert.equal(serviceAccess(active,[{payment_type:'CHARGE',payment_status:'PENDING'}]),false);
  assert.equal(serviceAccess(active,[{payment_type:'CHARGE',payment_status:'FAILED'}]),false);
  const paid=[{payment_type:'CHARGE',payment_status:'SUCCESS'}];assert.equal(serviceAccess(active,paid),true);
  assert.equal(serviceAccess({subscription_status:'BANK_APPROVAL_PENDING'},paid),false);
});
test('request inspection redacts secrets, bank details, card fields and auth URLs',()=>{
  const result=redact({customer_details:{customer_name:'Private User'},payment_method:{card:{card_number:'4111111111111111',card_cvv:'123'}},subscription_session_id:'secret-session',data:{url:'https://bank.example/private-token?jwt=123',payload:{qrData:'upi://mandate?secret=abc'}}});
  const text=JSON.stringify(result);for(const sensitive of ['Private User','4111111111111111','secret-session','private-token','secret=abc'])assert.equal(text.includes(sensitive),false);
});
test('IDs and amounts reject path traversal and invalid money',()=>{assert.throws(()=>validId('../secrets'));for(const n of [0,-1,Infinity,NaN,'abc',1.001])assert.throws(()=>amount(n));assert.equal(amount('199.99'),199.99);});

test('QR base64 images are displayed directly, never encoded as QR text',async()=>{
  const image=await QRCode.toDataURL('upi://mandate?pa=test@bank&am=1');
  for(const qrData of [image,image.split(',')[1],image.split(',')[1].replace(/(.{64})/g,'$1\n')]){
    const action=normalizeAuth({channel:'qrcode',data:{payload:{qrData}}});
    assert.equal(action.kind,'qr');assert.equal(action.image,image);assert.equal(action.value,undefined);
  }
});
test('base64 mandate text is decoded before generating the QR image',()=>{
  const uri='upi://mandate?pa=test@bank&am=1';
  const action=normalizeAuth({channel:'qrcode',data:{payload:{qrData:Buffer.from(uri).toString('base64')}}});
  assert.equal(action.value,uri);assert.equal(action.image,undefined);
});
test('malformed and unsupported image data cannot become a scan-able QR of base64 text',()=>{
  for(const qrData of ['data:image/png;base64,not-valid!!','data:image/png;base64,aGVsbG8=','data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='])assert.throws(()=>normalizeAuth({channel:'qrcode',data:{payload:{qrData}}}));
});

test('sandbox QR and Collect prefer the simulator URL over POST payloads and app links',()=>{
  const url='https://payments-test.cashfree.com/subs-checkout/checkout/simulator/UPI/test-token?auth_id=123';
  for(const channel of ['qrcode','collect']){
    const response={channel,payment_method:'upi',data:{url,method:'post',payload:{paymentType:'UPI',qrData:'upi://mandate?pa=test@bank',upiIntentData:{androidAuthAppLinks:{DEFAULT:url},iosAuthAppLinks:{GPAY:url}}}}};
    assert.deepEqual(normalizeAuth(response,{environment:'sandbox'}),{kind:'redirect',url,simulator:true});
    assert.equal(normalizeAuth(response,{environment:'production'}).kind,channel==='collect'?'collect':'qr');
  }
});
test('production Collect stays a PSP request even if app links are also returned',()=>{
  assert.deepEqual(normalizeAuth({channel:'collect',data:{url:'https://payments.cashfree.com/timer',method:'post',payload:{upiIntentData:{androidAuthAppLinks:{GPAY:'gpay://upi/mandate'}}}}},{environment:'production'}),{kind:'collect'});
});

test('sandbox generic QR URL is skipped in favour of the returned DEFAULT subscription link',()=>{
  const url='https://payments-test.cashfree.com/subs-checkout/checkout/simulator/UPI/test-token?auth_id=123';
  for(const channel of ['qrcode','collect']){
    const data={url:'https://payments-test.cashfree.com/pgbillpayuiapi/simulator',method:'post',payload:{paymentType:'UPI',upiIntentData:{androidAuthAppLinks:{DEFAULT:url,GPAY:url},iosAuthAppLinks:{GPAY:url}}}};
    assert.deepEqual(normalizeAuth({channel,data},{environment:'sandbox'}),{kind:'redirect',url,simulator:true});
    delete data.payload.upiIntentData.androidAuthAppLinks;
    assert.deepEqual(normalizeAuth({channel,data},{environment:'sandbox'}),{kind:'redirect',url,simulator:true});
    delete data.payload.upiIntentData;
    assert.deepEqual(normalizeAuth({channel,data},{environment:'sandbox'}),{kind:'simulation'});
  }
});
