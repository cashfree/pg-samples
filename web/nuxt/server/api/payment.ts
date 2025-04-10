import { Cashfree, CFEnvironment } from 'cashfree-pg';

export default defineEventHandler(async (event) => {
  
    const config = useRuntimeConfig();
    const cashfree = new Cashfree(CFEnvironment.SANDBOX, config.clientId, config.clientSecret);

    const body = await readBody(event);

    var request = {
      "order_amount": body.amount,
      "order_currency": body.currency,
      "customer_details": {
        "customer_id": "walterwNrcMi",
        "customer_phone": "9999999999"
      },
      "order_meta": {
        "return_url": "https://www.cashfree.com/devstudio/preview/pg/web/checkout?order_id={order_id}",
        "notify_url": "https://webhook.site/78066a24-b4a2-491d-9083-b47520a288e1"
      }
    };

    const response = await cashfree.PGCreateOrder(request);
    return response.data;
  })