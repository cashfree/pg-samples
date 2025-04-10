import { Cashfree, CFEnvironment } from 'cashfree-pg';

export default defineEventHandler(async (event) => {
  
    const config = useRuntimeConfig();
    const cashfree = new Cashfree(CFEnvironment.SANDBOX, config.clientId, config.clientSecret);
    const body = await readBody(event);

    const signature = getHeader(event, 'x-webhook-signature');
    const timestamp = getHeader(event, 'x-webhook-timestamp');

    const rawBody = body.toString().replace(/\s*(?=\{|\}|\,|\:|\[|\])/g, '').replace(/\s*(?<=\{|\}|\:|\[|\,)\s*/g, '');
    // rawBody is the stringified body from the request.
    // make sure order amount or any other float value is preserved.
    // If the webhook sends 1.00, the raw body should have 1.00. Doing JSON.stringify() changes 1.00 to 1 and signature verification will fail


    try {
        const response = cashfree.PGVerifyWebhookSignature(signature?.toString() ?? "", rawBody, timestamp?.toString() ?? "");
        // This verifies the signature.
        // This has to be done whenever webhook is received by ther server    
    
        return response;
    } catch {
        return {message: 'signature verification failed'}
    }
  })