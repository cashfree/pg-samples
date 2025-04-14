import { Injectable, Logger } from "@nestjs/common";
import { Cashfree, CFEnvironment } from "cashfree-pg";

@Injectable()
export class CashfreeService {
  private readonly logger = new Logger(CashfreeService.name); // Logger instance for logging service-related messages
  private readonly cashfree: Cashfree; // Cashfree SDK instance for interacting with Cashfree APIs

  constructor() {
    // Initialize the Cashfree SDK with environment, app ID, and app secret
    this.cashfree = new Cashfree(CFEnvironment.SANDBOX, process.env.APP_ID, process.env.APP_SECRET);
    this.logger.log("CashfreeService Init"); // Log service initialization
  }

  /**
   * Creates a new order using the Cashfree SDK.
   * @returns The response data from the Cashfree API.
   * @throws An error if the order creation fails.
   */
  async createOrder() {
    const request = {
      // Order details including amount, currency, and customer information
      order_amount: 1.01,
      order_currency: "INR",
      customer_details: {
        customer_id: "cashfree-nestjs-app",
        customer_name: "John Doe",
        customer_email: "kishan.maurya@cashfree.com",
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: "https://example.com/return/{order_id}",
        notify_url: "http://localhost:3000/cashfree/order/webhooks",
      },
      order_note: "Order created using NestJS",
    };

    try {
      // Call Cashfree API to create an order
      const response = await this.cashfree.PGCreateOrder(request);
      return response.data; // Return the response data
    } catch (error: any) {
      // Handle and throw an error if the API call fails
      throw new Error(`Error creating order: ${error.response.data.message}`);
    }
  }

  /**
   * Fetches an existing order using the Cashfree SDK.
   * @param orderId - The ID of the order to fetch.
   * @returns The response data from the Cashfree API.
   * @throws An error if fetching the order fails.
   */
  async fetchOrder(orderId: string): Promise<any> {
    try {
      // Call Cashfree API to fetch the order
      const response = await this.cashfree.PGFetchOrder(orderId);
      return response.data; // Return the response data
    } catch (error: any) {
      // Handle and throw an error if the API call fails
      throw new Error(`Error fetching order: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verifies the webhook signature using the Cashfree SDK.
   * This method ensures that the webhook request is authentic and has not been tampered with.
   *
   * @param signature - The signature sent in the `x-webhook-signature` header of the webhook request.
   * @param body - The raw body of the webhook request as a string.
   * @param timeStamp - The timestamp sent in the `x-webhook-timestamp` header of the webhook request.
   * @returns A promise resolving to the verification response from the Cashfree SDK.
   * @throws Logs an error if the verification fails.
   */
  async triggerWebHook(signature: string, body: string, timeStamp: string) {
    try {
      // Call the Cashfree SDK to verify the webhook signature
      const response = await this.cashfree.PGVerifyWebhookSignature(signature, body, timeStamp);

      // Log the successful verification response
      this.logger.log("Webhook verified successfully:", response);
    } catch (error: any) {
      // Log an error message if the verification fails
      this.logger.error("Error verifying webhook:", error);
    }
  }
}
