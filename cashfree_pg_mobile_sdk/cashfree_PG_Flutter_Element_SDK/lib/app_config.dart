import 'package:flutter_cashfree_pg_sdk/utils/cfenums.dart';

class AppConfig {
  static const String sdkType = 'Cashfree PG Element SDK';
  static const String sdkVersion = '2.4.0+52';
  static const String apiVersion = String.fromEnvironment(
    'CASHFREE_API_VERSION',
    defaultValue: '2025-01-01',
  );
  static const String environmentName = String.fromEnvironment(
    'CASHFREE_ENV',
    defaultValue: 'SANDBOX',
  );
  static const String clientId = String.fromEnvironment(
    'CASHFREE_CLIENT_ID',
    defaultValue: 'PUT_YOUR_CLIENT_ID_HERE',
  );
  static const String clientSecret = String.fromEnvironment(
    'CASHFREE_CLIENT_SECRET',
    defaultValue: 'PUT_YOUR_CLIENT_SECRET_HERE',
  );
  static const String returnScheme = String.fromEnvironment(
    'CASHFREE_RETURN_SCHEME',
    defaultValue: 'cashfreepgdemo',
  );
  static const String returnHost = 'payment-return';
  static const String currency = 'INR';

  static CFEnvironment get environment {
    return environmentName.toUpperCase() == 'PRODUCTION'
        ? CFEnvironment.PRODUCTION
        : CFEnvironment.SANDBOX;
  }

  static String get environmentLabel {
    return environment == CFEnvironment.PRODUCTION ? 'Production' : 'Sandbox';
  }

  static Uri get returnUriBase {
    return Uri(scheme: returnScheme, host: returnHost);
  }

  static String buildReturnUrl(String orderId) {
    return returnUriBase
        .replace(queryParameters: {'order_id': orderId})
        .toString();
  }

  static bool get hasPlaceholderKeys {
    return clientId.startsWith('PUT_') || clientSecret.startsWith('PUT_');
  }
}
