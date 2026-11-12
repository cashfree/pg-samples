// India has a fixed UTC+05:30 offset; +24/+48 hours retain the local clock time.
function productionTestProduct(now = new Date()) {
  return {
    plan_details: {
      plan_name: 'Production One Cycle Test',
      plan_type: 'PERIODIC',
      plan_currency: 'INR',
      plan_amount: 1,
      plan_max_amount: 1,
      plan_max_cycles: 1,
      plan_intervals: 1,
      plan_interval_type: 'DAY',
      plan_note: 'Production test: one INR 1 recurring debit'
    },
    authorization_details: {
      authorization_amount: 1,
      authorization_amount_refund: false
    },
    subscription_first_charge_time: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    subscription_expiry_time: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
  };
}
module.exports = productionTestProduct;
