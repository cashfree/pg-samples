import {
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyOrderResponse,
} from '../types/cashfree';

function buildNetworkErrorMessage(backendUrl: string) {
  return [
    `Cannot reach your backend at ${backendUrl}.`,
    'Make sure the backend server is running and that the URL is reachable from the device.',
    'Android emulator usually uses http://10.0.2.2:3000 and iOS simulator usually uses http://localhost:3000.',
  ].join(' ');
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const errorMessage =
      data?.message || data?.error || 'Request failed. Please try again.';
    throw new Error(errorMessage);
  }

  return data as T;
}

async function performRequest<T>(
  backendUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${backendUrl}${path}`, init);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Network request failed.';
    throw new Error(`${buildNetworkErrorMessage(backendUrl)} Original error: ${message}`);
  }

  return parseResponse<T>(response);
}

export async function checkBackendHealth(backendUrl: string) {
  return performRequest<{ok: boolean}>(backendUrl, '/health', {
    method: 'GET',
  });
}

export async function createCashfreeOrder(
  backendUrl: string,
  payload: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  return performRequest<CreateOrderResponse>(backendUrl, '/api/cashfree/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function verifyCashfreeOrder(
  backendUrl: string,
  orderId: string,
  environment: CreateOrderRequest['environment'],
): Promise<VerifyOrderResponse> {
  return performRequest<VerifyOrderResponse>(backendUrl, '/api/cashfree/verify-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId,
      environment,
    }),
  });
}
