/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-cashfree-pg-sdk', () => ({
  CFPaymentGatewayService: {
    setCallback: jest.fn(),
    removeCallback: jest.fn(),
    doWebPayment: jest.fn(),
  },
  CFErrorResponse: jest.fn(),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
