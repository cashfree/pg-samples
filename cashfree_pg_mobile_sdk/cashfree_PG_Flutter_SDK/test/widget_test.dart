import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cashfree_flutter_pg_app/main.dart';

void main() {
  testWidgets('renders checkout dashboard', (WidgetTester tester) async {
    await tester.pumpWidget(const CashfreeFlutterPgApp());
    await tester.pumpAndSettle();

    expect(find.text('cashfree_flutter_PG_App'), findsOneWidget);
    expect(find.text('Environment'), findsOneWidget);
    expect(find.text('Checkout Method'), findsOneWidget);
    expect(find.text('Web Checkout'), findsWidgets);
    expect(find.text('UPI Intent'), findsWidgets);
    await tester.scrollUntilVisible(
      find.text('Create Order & Pay'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Create Order & Pay'), findsOneWidget);
  });

  testWidgets('opens status screen from bottom navigation', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const CashfreeFlutterPgApp());

    await tester.tap(find.text('Status'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Payment Details'),
      300,
      scrollable: find.byType(Scrollable).first,
    );

    expect(find.text('Payment Status'), findsOneWidget);
    expect(find.text('Payment Details'), findsOneWidget);
  });
}
