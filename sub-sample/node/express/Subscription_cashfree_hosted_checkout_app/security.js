// Return diagnostics deliberately retain only status/correlation fields.
const publicFields=new Set(['subscription_id','subscriptionId','cf_subscriptionId','cf_status','cf_checkoutStatus','cf_mode','cf_subscriptionPaymentId','cf_subReferenceId','cf_authAmount','amount']);
function summarizeReturn(data) {
  return Object.fromEntries(Object.entries(data || {}).map(([key,value])=>[key,publicFields.has(key)?value:'[redacted]']));
}
module.exports={summarizeReturn};
