import { Cashfree, CFEnvironment } from 'cashfree-pg';

export default defineEventHandler(async (event) => {
  
    const config = useRuntimeConfig();
    const cashfree = new Cashfree(CFEnvironment.SANDBOX, config.clientId, config.clientSecret);

    const body = await readBody(event);

    const response = await cashfree.PGFetchOrder(body.order_id);
    return response.data;
  })