import { json, type RequestEvent } from '@sveltejs/kit';
import { CreateOrder, CheckOrderStatus } from '$lib/server/cashfree';
import { type CreateOrderRequest, type CustomerDetails, type OrderMeta } from 'cashfree-pg';
import { faker } from '@faker-js/faker';

export async function POST(event: RequestEvent) {
	const body = await event.request.json();

	//customer details
	const customerDetails: CustomerDetails = {
		customer_name: faker.person.fullName(),
		customer_phone: '9' + faker.string.numeric(9),
		customer_email: faker.internet.email(),
		customer_id: faker.string.uuid()
	};

	const orderMeta: OrderMeta = {
		return_url: 'https://www.example.com/return'
	};

	const order: CreateOrderRequest = {
		order_id: 'order_' + faker.string.uuid(),
		order_amount: body.order_amount,
		order_currency: 'INR',
		order_note: 'order generated from cashfree sample',
		customer_details: customerDetails,
		order_meta: orderMeta
	};

	try {
		const response = await CreateOrder(order);
		return json(response.data);
	} catch (error) {
		const err = error as any;
		return json(err.response?.data);
	}
}

export async function GET(event: RequestEvent) {
	const orderID = event.url.searchParams.get('order_id');
	if (!orderID) {
		return json({ error: 'order_id is required' }, { status: 400 });
	}

	try {
		const response = await CheckOrderStatus(orderID);
		return json(response.data);
	} catch (error) {
		const err = error as any;
		return json(err.response?.data);
	}
}
