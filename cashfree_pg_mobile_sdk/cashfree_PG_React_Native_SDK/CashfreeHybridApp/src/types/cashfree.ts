export type CashfreeEnvironment = 'SANDBOX' | 'PRODUCTION';

export type CheckoutLaunchMode = 'WEB' | 'UPI';

export type CreateOrderRequest = {
  environment: CashfreeEnvironment;
  orderAmount: number;
  orderCurrency: 'INR';
  orderNote: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export type CreateOrderResponse = {
  orderId: string;
  paymentSessionId: string;
  cfOrderId?: string;
  orderStatus?: OrderStatus;
};

export type OrderStatus =
  | 'ACTIVE'
  | 'PAID'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'TERMINATION_REQUESTED';

export type VerifyOrderResponse = {
  orderId: string;
  orderStatus: OrderStatus | string;
  paymentSessionId?: string;
};

export type OrderHistoryStatus =
  | OrderStatus
  | 'PENDING'
  | 'VERIFYING'
  | 'FAILED';

export type OrderHistoryItem = {
  orderId: string;
  paymentSessionId?: string;
  amount: string;
  customerName: string;
  customerPhone: string;
  environment: CashfreeEnvironment;
  checkoutMode: CheckoutLaunchMode;
  status: OrderHistoryStatus;
  createdAt: string;
  lastUpdatedAt: string;
  lastMessage: string;
};
