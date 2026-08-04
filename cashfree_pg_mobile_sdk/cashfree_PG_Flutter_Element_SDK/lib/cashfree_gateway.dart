import 'dart:convert';

import 'package:flutter_cashfree_pg_sdk/api/cfcard/cfcardwidget.dart';
import 'package:flutter_cashfree_pg_sdk/api/cferrorresponse/cferrorresponse.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfcard.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfcardpayment.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfnetbanking.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfnetbankingpayment.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfupi.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfupipayment.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpaymentgateway/cfpaymentgatewayservice.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfsession/cfsession.dart';
import 'package:flutter_cashfree_pg_sdk/utils/cfenums.dart';
import 'package:flutter_cashfree_pg_sdk/utils/cfexceptions.dart';
import 'package:http/http.dart' as http;

import 'app_config.dart';

enum ElementPaymentMode {
  upiIntentWithUi('Element UPI Intent'),
  upiCollect('Element UPI Collect'),
  netbanking('Element Netbanking'),
  card('Element Card');

  const ElementPaymentMode(this.label);

  final String label;
}

class PreparedPayment {
  const PreparedPayment({
    required this.orderId,
    required this.amount,
    required this.paymentSessionId,
    required this.session,
  });

  final String orderId;
  final double amount;
  final String paymentSessionId;
  final CFSession session;
}

class OrderStatusResult {
  const OrderStatusResult({
    required this.orderId,
    required this.orderStatus,
    required this.amount,
    required this.currency,
    required this.raw,
  });

  factory OrderStatusResult.fromJson(Map<String, dynamic> json) {
    return OrderStatusResult(
      orderId: json['order_id']?.toString() ?? '',
      orderStatus: json['order_status']?.toString() ?? 'UNKNOWN',
      amount: _asDouble(json['order_amount']),
      currency: json['order_currency']?.toString() ?? AppConfig.currency,
      raw: json,
    );
  }

  final String orderId;
  final String orderStatus;
  final double amount;
  final String currency;
  final Map<String, dynamic> raw;
}

class CashfreeGateway {
  CashfreeGateway() : _gatewayService = CFPaymentGatewayService();

  final CFPaymentGatewayService _gatewayService;

  Future<PreparedPayment> preparePayment({
    required String orderId,
    required double amount,
  }) async {
    try {
      final response = await http.post(
        Uri.parse(_ordersEndpoint),
        headers: _headers,
        body: jsonEncode({
          'order_amount': amount,
          'order_currency': AppConfig.currency,
          'order_id': orderId,
          'customer_details': {
            'customer_id': 'demo_customer',
            'customer_phone': '9876543210',
            'customer_email': 'demo@cashfree.com',
          },
          'order_meta': {'return_url': AppConfig.buildReturnUrl(orderId)},
        }),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw CFException(
          'Unable to create order (${response.statusCode}): ${response.body}',
        );
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final paymentSessionId = data['payment_session_id']?.toString();
      final createdOrderId = data['order_id']?.toString() ?? orderId;

      if (paymentSessionId == null || paymentSessionId.isEmpty) {
        throw CFException(
          'Payment session id was missing from Cashfree response.',
        );
      }

      final session = CFSessionBuilder()
          .setEnvironment(AppConfig.environment)
          .setOrderId(createdOrderId)
          .setPaymentSessionId(paymentSessionId)
          .build();

      return PreparedPayment(
        orderId: createdOrderId,
        amount: amount,
        paymentSessionId: paymentSessionId,
        session: session,
      );
    } on CFException {
      rethrow;
    } catch (error) {
      throw CFException('Failed to create payment session: $error');
    }
  }

  Future<OrderStatusResult> fetchOrderStatus(String orderId) async {
    try {
      final response = await http.get(
        Uri.parse('$_ordersEndpoint/$orderId'),
        headers: _headers,
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw CFException(
          'Unable to fetch status (${response.statusCode}): ${response.body}',
        );
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return OrderStatusResult.fromJson(data);
    } on CFException {
      rethrow;
    } catch (error) {
      throw CFException('Failed to fetch order status: $error');
    }
  }

  void launchUpiIntentWithUi({
    required PreparedPayment payment,
    required void Function(String orderId) onVerify,
    required void Function(CFErrorResponse errorResponse, String orderId)
    onError,
  }) {
    _gatewayService.setCallback(onVerify, onError);
    final upi = CFUPIBuilder().setChannel(CFUPIChannel.INTENT_WITH_UI).build();
    final upiPayment = CFUPIPaymentBuilder()
        .setSession(payment.session)
        .setUPI(upi)
        .build();
    _gatewayService.doPayment(upiPayment);
  }

  void launchUpiCollect({
    required PreparedPayment payment,
    required String upiId,
    required void Function(String orderId) onVerify,
    required void Function(CFErrorResponse errorResponse, String orderId)
    onError,
  }) {
    _gatewayService.setCallback(onVerify, onError);
    final upi = CFUPIBuilder()
        .setChannel(CFUPIChannel.COLLECT)
        .setUPIID(upiId)
        .build();
    final upiPayment = CFUPIPaymentBuilder()
        .setSession(payment.session)
        .setUPI(upi)
        .build();
    _gatewayService.doPayment(upiPayment);
  }

  void launchNetbanking({
    required PreparedPayment payment,
    required int bankCode,
    required void Function(String orderId) onVerify,
    required void Function(CFErrorResponse errorResponse, String orderId)
    onError,
  }) {
    _gatewayService.setCallback(onVerify, onError);
    final netbanking = CFNetbankingBuilder()
        .setChannel('link')
        .setBankCode(bankCode)
        .build();
    final netbankingPayment = CFNetbankingPaymentBuilder()
        .setSession(payment.session)
        .setNetbanking(netbanking)
        .build();
    _gatewayService.doPayment(netbankingPayment);
  }

  void launchCard({
    required PreparedPayment payment,
    required CFCardWidget cardWidget,
    required String cardHolderName,
    required String expiryMonth,
    required String expiryYear,
    required String cvv,
    required void Function(String orderId) onVerify,
    required void Function(CFErrorResponse errorResponse, String orderId)
    onError,
  }) {
    _gatewayService.setCallback(onVerify, onError);
    final card = CFCardBuilder()
        .setCardWidget(cardWidget)
        .setCardHolderName(cardHolderName)
        .setCardExpiryMonth(expiryMonth)
        .setCardExpiryYear(expiryYear)
        .setCardCVV(cvv)
        .build();
    final cardPayment = CFCardPaymentBuilder()
        .setSession(payment.session)
        .setCard(card)
        .savePaymentMethod(false)
        .build();
    _gatewayService.doPayment(cardPayment);
  }

  static String get _ordersEndpoint {
    return AppConfig.environment == CFEnvironment.PRODUCTION
        ? 'https://api.cashfree.com/pg/orders'
        : 'https://sandbox.cashfree.com/pg/orders';
  }

  static Map<String, String> get _headers {
    return {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-api-version': AppConfig.apiVersion,
      'x-client-id': AppConfig.clientId,
      'x-client-secret': AppConfig.clientSecret,
    };
  }
}

double _asDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }

  return double.tryParse(value?.toString() ?? '') ?? 0;
}
