import { Cashfree, type CreateOrderRequest } from 'cashfree-pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Cashfree with environment variables
Cashfree.XClientId = process.env.CASHFREE_PG_APP_ID || '';
Cashfree.XClientSecret = process.env.CASHFREE_PG_SECRET_KEY || '';
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

export const CreateOrder = async (order: CreateOrderRequest) => {
	return await Cashfree.PGCreateOrder('2025-01-01', order);
};

//check status given orderID
export const CheckOrderStatus = async (orderID: string) => {
	return await Cashfree.PGFetchOrder('2025-01-01', orderID);
};
