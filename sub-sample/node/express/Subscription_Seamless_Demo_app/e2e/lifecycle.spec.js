import {test,expect} from '@playwright/test';
import QRCode from 'qrcode';
test('merchant can authorise, charge, simulate and access an on-demand product',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Good products. Great recurring journeys.'})).toBeVisible();
  await page.screenshot({path:`/tmp/subscription-lab-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:/On-demand/}).click();
  await page.getByRole('button',{name:/Try subscription/}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Browser Tester');
  await dialog.getByLabel('Email address').fill('browser@example.com');
  await dialog.getByLabel('Mobile number').fill('9999999999');
  await dialog.getByRole('checkbox',{name:/I agree/}).check();
  await dialog.getByRole('button',{name:/Create subscription/}).click();
  await expect(dialog.getByText('One approval. All set for recurring.')).toBeVisible();
  const intent=dialog.locator('option[value="link"]');
  if(testInfo.project.name==='desktop')await expect(intent).toBeDisabled();else await expect(intent).toBeEnabled();
  await dialog.getByRole('button',{name:/Try demo authorisation/}).click();
  await dialog.getByRole('button',{name:'Approve mandate',exact:true}).click();
  await expect(dialog.getByRole('button',{name:/Awaiting successful charge/})).toBeDisabled();
  await dialog.getByLabel('Usage / charge description').fill('Two hours of rendering');
  await dialog.getByRole('button',{name:/Schedule charge/}).click();
  await expect(dialog.getByRole('button',{name:'Success',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Success',exact:true}).click();
  await expect(dialog.getByRole('button',{name:/Open paid service/})).toBeEnabled();
  await dialog.getByRole('button',{name:/Open paid service/}).click();
  await expect(page.getByRole('status')).toContainText('Your paid service is ready');
  await dialog.getByRole('button',{name:'Close panel'}).click();
  await page.locator('nav a[data-page="subscriptions"]').click();
  await expect(page.getByRole('heading',{name:'Your subscriptions'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('configuration and guide render on each screen size',async({page})=>{
  await page.goto('/#settings');
  await expect(page.getByLabel('API version')).toHaveValue('2025-01-01');
  await page.getByRole('button',{name:/Save configuration/}).click();
  await expect(page.getByRole('status')).toContainText('Configuration saved');
  await page.locator('nav').getByRole('link',{name:'Integration guide'}).click();
  await expect(page.getByRole('heading',{name:'The eNACH response switch'})).toBeVisible();
  await expect(page.getByRole('link',{name:'care@cashfree.com'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
for(const kind of ['post','redirect']) test(`bank ${kind} action navigates from the frontend`,async({page})=>{
  await page.goto('/');
  await page.route('**/api/subscriptions/*/authorize',async route=>route.fulfill({json:{payment:{payment_id:'pay_test'},next:{kind,url:'https://enach.npci.org.in/onmags/sendRequest',fields:{AuthMode:'NetBanking',MandateReqDoc:'<Document attr="1">&preserved</Document>'}}}}));
  await page.route('https://enach.npci.org.in/onmags/sendRequest',async route=>{
    expect(route.request().method()).toBe(kind==='post'?'POST':'GET');
    if(kind==='post'){const body=new URLSearchParams(route.request().postData());expect(body.get('MandateReqDoc')).toBe('<Document attr="1">&preserved</Document>');}
    await route.fulfill({contentType:'text/html',body:'<h1>Mock NPCI authorisation</h1>'});
  });
  await page.getByRole('button',{name:/Try subscription/}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Redirect Tester');await dialog.getByLabel('Email address').fill('redirect@example.com');await dialog.getByLabel('Mobile number').fill('9999999999');await dialog.getByRole('checkbox',{name:/I agree/}).check();await dialog.getByRole('button',{name:/Create subscription/}).click();
  await dialog.getByRole('button',{name:/Try demo authorisation/}).click();
  await dialog.getByRole('button',{name:/Continue to (bank|authorisation)/}).click();
  await expect(page.getByRole('heading',{name:'Mock NPCI authorisation'})).toBeVisible();
});

for (const scenario of [
  {environment:'sandbox',outcome:'SUCCESS'},
  {environment:'sandbox',outcome:'FAILED'},
  {environment:'production',outcome:null}
]) test(`pending AUTH simulation: ${scenario.environment} ${scenario.outcome || 'hidden'}`, async({page})=>{
  const subscription={subscription_id:'sub_auth_simulation',product_id:'studio',created_at:new Date().toISOString(),subscription_status:'INITIALIZED',customer_details:{customer_name:'Sandbox Tester',customer_email:'sandbox@example.com'},plan_details:{plan_name:'Studio Plus',plan_type:'ON_DEMAND',plan_max_amount:2000},authorization_details:{authorization_amount:1},payments:[{payment_id:'pay_auth_simulation',payment_type:'AUTH',payment_status:'PENDING',payment_amount:1}],service_access:false};
  await page.route('**/api/config',route=>route.fulfill({json:{mode:'cashfree',environment:scenario.environment,configured:true,apiVersion:'2025-01-01'}}));
  await page.route('**/api/subscriptions',route=>route.fulfill({json:[subscription]}));
  await page.route('**/api/subscriptions/sub_auth_simulation',route=>route.fulfill({json:subscription}));
  let simulated=false;
  await page.route('**/api/subscriptions/sub_auth_simulation/simulate',async route=>{
    expect(route.request().postDataJSON()).toEqual({paymentId:'pay_auth_simulation',status:scenario.outcome});
    subscription.payments[0].payment_status=scenario.outcome;
    subscription.subscription_status=scenario.outcome==='SUCCESS'?'ACTIVE':'INITIALIZED';
    simulated=true;
    await route.fulfill({json:{simulation_id:'sim_test'}});
  });
  await page.goto('/#subscriptions');
  await page.getByRole('button',{name:'View →'}).click();
  const dialog=page.getByRole('dialog');
  if(scenario.environment==='production') {
    await expect(dialog.locator('[data-simulate]')).toHaveCount(0);
    expect(simulated).toBe(false);
    return;
  }
  await expect(dialog.getByText('Sandbox: simulate any PENDING AUTH or CHARGE', {exact:false})).toBeVisible();
  await dialog.getByRole('button',{name:scenario.outcome==='SUCCESS'?'Success':'Fail',exact:true}).click();
  await expect(dialog.locator('td').filter({hasText:scenario.outcome})).toBeVisible();
  await expect(dialog.locator('[data-simulate]:enabled')).toHaveCount(0);
  await expect(dialog.locator('[data-simulate]:disabled')).toHaveCount(2);
  await expect(dialog.getByRole('button',{name:/Awaiting successful charge/})).toBeDisabled();
  expect(simulated).toBe(true);
});

test('simulation buttons are disabled for every non-PENDING payment status',async({page})=>{
  const statuses=['PENDING','INITIALIZED','SUCCESS','FAILED','CANCELLED','PROCESSING','UNKNOWN'];
  const subscription={subscription_id:'sub_status_controls',product_id:'studio',created_at:new Date().toISOString(),subscription_status:'ACTIVE',customer_details:{customer_name:'Status Tester',customer_email:'status@example.com'},plan_details:{plan_name:'Studio Plus',plan_type:'ON_DEMAND',plan_max_amount:2000},authorization_details:{authorization_amount:1},payments:statuses.map(status=>({payment_id:`pay_status_${status}`,payment_type:'CHARGE',payment_status:status,payment_amount:499})),service_access:false};
  await page.route('**/api/config',route=>route.fulfill({json:{mode:'cashfree',environment:'sandbox',configured:true,apiVersion:'2025-01-01'}}));
  await page.route('**/api/subscriptions',route=>route.fulfill({json:[subscription]}));
  await page.route('**/api/subscriptions/sub_status_controls',route=>route.fulfill({json:subscription}));
  await page.goto('/#subscriptions');
  await page.getByRole('button',{name:'View →'}).click();
  const dialog=page.getByRole('dialog');
  for(const status of statuses){
    const buttons=dialog.locator(`[data-simulate="pay_status_${status}"]`);
    await expect(buttons).toHaveCount(2);
    for(const button of await buttons.all()){
      if(status==='PENDING')await expect(button).toBeEnabled();
      else {await expect(button).toBeDisabled();await expect(button).toHaveAttribute('title','Only PENDING payments can be simulated');}
    }
  }
});

test('eNACH exposes all auth modes and sends the selected Aadhaar mode',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:/Try subscription/}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Auth Mode Tester');
  await dialog.getByLabel('Email address').fill('authmode@example.com');
  await dialog.getByLabel('Mobile number').fill('9999999999');
  await dialog.getByRole('checkbox',{name:/I agree/}).check();
  await dialog.getByRole('button',{name:/Create subscription/}).click();
  await dialog.getByRole('button',{name:'eNACH',exact:true}).click();
  const mode=dialog.getByLabel('eNACH auth mode');
  await expect(mode).toBeVisible();
  await expect(mode).toHaveValue('');
  await expect(mode.locator('option:not([disabled])')).toHaveText(['Netbanking','Debit card','Aadhaar']);
  await mode.selectOption('aadhaar');
  await dialog.getByLabel('Account holder name').fill('Auth Mode Tester');
  await dialog.getByLabel('Account number',{exact:true}).fill('1234567890');
  await dialog.getByLabel('Bank',{exact:true}).selectOption('HDFC');
  await expect(dialog.getByLabel('Bank ID (automatic)')).toHaveValue('HDFC');
  await expect(dialog.getByLabel('Bank ID (automatic)')).toHaveAttribute('readonly','');
  await dialog.getByLabel('Bank',{exact:true}).selectOption('CGBX');
  await expect(dialog.getByLabel('Bank ID (automatic)')).toHaveValue('CGBX');
  await dialog.getByLabel('IFSC',{exact:true}).fill('SBIN0000001');
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  let submitted=false;
  await page.route('**/api/subscriptions/*/authorize',async route=>{
    expect(route.request().postDataJSON()).toMatchObject({method:'enach',authMode:'aadhaar',bankId:'CGBX',bankCode:'CGBX',ifsc:'SBIN0000001'});
    submitted=true;
    await route.fulfill({json:{payment:{payment_id:'pay_mode_test'},next:{kind:'demo'}}});
  });
  await dialog.getByRole('button',{name:/Try demo authorisation/}).click();
  await expect(dialog.getByRole('heading',{name:'Try a mandate outcome.'})).toBeVisible();
  expect(submitted).toBe(true);
});

test('Card SI rejects 9999999999 before an AUTH request and leaves eNACH available',async({page})=>{
  let authRequests=0;
  page.on('request',request=>{if(request.url().endsWith('/authorize'))authRequests++;});
  await page.goto('/');
  await page.getByRole('button',{name:/Try subscription/}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Card Phone Tester');
  await dialog.getByLabel('Email address').fill('cardphone@example.com');
  await dialog.getByLabel('Mobile number').fill('9999999999');
  await dialog.getByRole('checkbox',{name:/I agree/}).check();
  await dialog.getByRole('button',{name:/Create subscription/}).click();
  await dialog.getByRole('button',{name:'Card SI',exact:true}).click();
  await expect(dialog.getByRole('alert')).toHaveText('9999999999 is not supported for card-based authorisation. Please use any other mobile number.');
  await expect(dialog.getByRole('button',{name:/Try demo authorisation/})).toBeDisabled();
  expect(authRequests).toBe(0);
  await dialog.getByRole('button',{name:'eNACH',exact:true}).click();
  await expect(dialog.getByRole('alert')).toBeEmpty();
  await expect(dialog.getByRole('button',{name:/Try demo authorisation/})).toBeEnabled();
});

for(const environment of ['sandbox','production']) test(`subscription UPI Collect guidance: ${environment}`,async({page})=>{
  await page.route('**/api/config',route=>route.fulfill({json:{mode:'cashfree',environment,configured:true,apiVersion:'2025-01-01'}}));
  await page.goto('/');
  await page.getByRole('button',{name:/Try subscription/}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Collect Tester');
  await dialog.getByLabel('Email address').fill('collect@example.com');
  await dialog.getByLabel('Mobile number').fill('9876543210');
  await dialog.getByRole('checkbox',{name:/I agree/}).check();
  await dialog.getByRole('button',{name:/Create subscription/}).click();
  const channel=dialog.getByLabel('UPI flow');
  await expect(channel.locator('option[value="collect"]')).toBeEnabled();
  await channel.selectOption('collect');
  await expect(dialog.getByLabel('UPI ID')).toBeVisible();
  await expect(dialog.getByLabel('UPI ID')).toHaveAttribute('required','');
  await dialog.getByLabel('UPI ID').fill('tester@bank');
  let submitted=false;
  await page.route('**/api/subscriptions/*/authorize',async route=>{
    expect(route.request().postDataJSON()).toMatchObject({method:'upi',channel:'collect',upiId:'tester@bank'});
    submitted=true;
    await route.fulfill({json:{payment:{payment_id:'pay_collect_test'},next:{kind:'collect'}}});
  });
  await dialog.getByRole('button',{name:/Authorise mandate/}).click();
  if(environment==='sandbox'){
    await expect(dialog.getByRole('heading',{name:'Sandbox AUTH simulation'})).toBeVisible();
    await expect(dialog.getByText('The UPI Collect AUTH request goes to PENDING in sandbox.',{exact:false})).toBeVisible();
    await expect(dialog.getByRole('button',{name:'View subscription & simulate AUTH'})).toBeVisible();
    await expect(dialog.getByText('Open that app and approve the request.',{exact:false})).toHaveCount(0);
  } else {
    await expect(dialog.getByRole('heading',{name:'Approve the request in your PSP app.'})).toBeVisible();
    await expect(dialog.getByRole('button',{name:'View subscription',exact:true})).toBeVisible();
    await expect(dialog.getByText('Sandbox AUTH simulation',{exact:true})).toHaveCount(0);
  }
  expect(submitted).toBe(true);
});

test('UPI QR renders a base64 image that can be scanned',async({page})=>{
  const image=await QRCode.toDataURL('upi://mandate?pa=test@bank&am=1',{width:280,margin:2});
  await page.goto('/');
  await page.getByRole('button',{name:/Try subscription/}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('QR Tester');
  await dialog.getByLabel('Email address').fill('qr@example.com');
  await dialog.getByLabel('Mobile number').fill('9876543210');
  await dialog.getByRole('checkbox',{name:/I agree/}).check();
  await dialog.getByRole('button',{name:/Create subscription/}).click();
  await page.route('**/api/subscriptions/*/authorize',route=>route.fulfill({json:{payment:{payment_id:'pay_qr_test'},next:{kind:'qr',image}}}));
  await dialog.getByRole('button',{name:/Try demo authorisation/}).click();
  const qr=dialog.getByRole('img',{name:'UPI mandate authorisation QR code'});
  await expect(qr).toBeVisible();await expect(qr).toHaveAttribute('src',image);
  await expect.poll(()=>qr.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
});

for(const channel of ['qrcode','collect']) test(`sandbox UPI ${channel} redirects directly to the Cashfree simulator`,async({page})=>{
  const url='https://payments-test.cashfree.com/subs-checkout/checkout/simulator/UPI/test?auth_id=123';
  await page.route('**/api/config',route=>route.fulfill({json:{mode:'cashfree',environment:'sandbox',configured:true,apiVersion:'2025-01-01'}}));
  await page.route('**/api/subscriptions/*/authorize',async route=>{
    expect(route.request().postDataJSON().channel).toBe(channel);
    await route.fulfill({json:{payment:{payment_id:'pay_sandbox_upi'},next:{kind:'redirect',url,simulator:true}}});
  });
  await page.route(url,async route=>{
    expect(route.request().method()).toBe('GET');
    await route.fulfill({contentType:'text/html',body:'<h1>Cashfree sandbox authorisation simulator</h1>'});
  });
  await page.goto('/');
  await page.getByRole('button',{name:/Try subscription/}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Simulator Tester');
  await dialog.getByLabel('Email address').fill('simulator@example.com');
  await dialog.getByLabel('Mobile number').fill('9876543210');
  await dialog.getByRole('checkbox',{name:/I agree/}).check();
  await dialog.getByRole('button',{name:/Create subscription/}).click();
  await dialog.getByLabel('UPI flow').selectOption(channel);
  if(channel==='collect')await dialog.getByLabel('UPI ID').fill('tester@bank');
  await dialog.getByRole('button',{name:/Authorise mandate/}).click();
  await expect(page.getByRole('heading',{name:'Cashfree sandbox authorisation simulator'})).toBeVisible();
});
