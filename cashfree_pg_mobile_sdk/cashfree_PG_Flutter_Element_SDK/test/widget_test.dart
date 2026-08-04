// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cashfree_pg_flutter_element_sdk/cashfree_gateway.dart';
import 'package:cashfree_pg_flutter_element_sdk/main.dart';

void main() {
  testWidgets('renders the Cashfree PG demo home screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CashfreeHomeScreen(
          gateway: CashfreeGateway(),
          onPaymentResult: (_) {},
        ),
      ),
    );

    expect(find.text('Cashfree PG demo'), findsOneWidget);
    expect(find.text('ORDER ID'), findsOneWidget);
    expect(find.text('AMOUNT'), findsOneWidget);
  });
}
