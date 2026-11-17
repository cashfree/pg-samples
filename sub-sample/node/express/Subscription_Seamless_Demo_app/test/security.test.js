import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const base={...process.env,HOST:'127.0.0.1',PORT:'3000',APP_MODE:'demo',CASHFREE_ENV:'sandbox',PUBLIC_BASE_URL:'http://localhost:3000',MERCHANT_PASSWORD:''};
function load(env){return spawnSync(process.execPath,['--input-type=module','-e',"await import('./config.js')"],{cwd:new URL('..',import.meta.url),env:{...base,...env},encoding:'utf8'});}
test('public deployments reject missing/weak passwords and cleartext origins',()=>{
  assert.equal(load({}).status,0);
  for(const env of [{HOST:'0.0.0.0'},{PUBLIC_BASE_URL:'https://merchant.example.com'},{PUBLIC_BASE_URL:'https://merchant.example.com',MERCHANT_PASSWORD:'short'},{PUBLIC_BASE_URL:'http://merchant.example.com',MERCHANT_PASSWORD:'sample-strong-password'}])assert.notEqual(load(env).status,0);
  assert.equal(load({HOST:'0.0.0.0',PUBLIC_BASE_URL:'https://merchant.example.com',MERCHANT_PASSWORD:'sample-strong-password'}).status,0);
});
test('public origins cannot embed credentials, query strings or paths',()=>{
  for(const origin of ['https://user:pass@merchant.example.com','https://merchant.example.com/private','https://merchant.example.com?token=private'])assert.notEqual(load({PUBLIC_BASE_URL:origin,MERCHANT_PASSWORD:'sample-strong-password'}).status,0);
});
