import { Controller, Get, Logger, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CashfreeService } from './cashfree.service';
import * as path from 'path';

/**
 * The CashfreeController handles HTTP requests related to orders.
 * It provides endpoints to create a new order and fetch an existing order by its ID.
 */
@Controller('cashfree')
export class CashfreeController {
  // Logger instance for logging messages specific to this controller.
  private readonly logger = new Logger(CashfreeController.name);

  /**
   * Constructor to initialize the CashfreeController.
   * @param cashfreeService - Injected service to handle business logic for orders.
   */
  constructor(private readonly cashfreeService: CashfreeService) {
    this.logger.log('CashfreeController Init');
  }

  /**
   * GET /
   * Endpoint to serve the `index.html` file.
   * @param res - The Express response object used to send the file.
   */
  @Get()
  getIndex(@Res() res: Response) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }

  /**
   * POST /order
   * Endpoint to create a new order.
   * Delegates the request to the `createOrder` method of the CashfreeService.
   * @returns A promise resolving to the result of the order creation.
   */
  @Post('/order')
  async createOrder() {
    return this.cashfreeService.createOrder();
  }

  /**
   * GET /orders/:orderId
   * Endpoint to fetch an order by its ID.
   * Delegates the request to the `fetchOrder` method of the CashfreeService.
   * @param orderId - The ID of the order to fetch, extracted from the route parameter.
   * @returns A promise resolving to the fetched order details.
   */
  @Get('/orders/:orderId')
  async getOrder(@Param('orderId') orderId: string) {
    return this.cashfreeService.fetchOrder(orderId);
  }
}