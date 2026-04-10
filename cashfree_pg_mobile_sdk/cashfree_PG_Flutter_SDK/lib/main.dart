import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_cashfree_pg_sdk/api/cferrorresponse/cferrorresponse.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfupi.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfupipayment.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfwebcheckoutpayment.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpaymentgateway/cfpaymentgatewayservice.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfsession/cfsession.dart';
import 'package:flutter_cashfree_pg_sdk/api/cftheme/cftheme.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfupi/cfupiutils.dart';
import 'package:flutter_cashfree_pg_sdk/utils/cfenums.dart';
import 'package:flutter_cashfree_pg_sdk/utils/cfexceptions.dart';

void main() {
  runApp(const CashfreeFlutterPgApp());
}

enum AppEnvironment { sandbox, production }

enum CheckoutMode { webCheckout, upiCheckout }

enum PaymentStatus { idle, pending, awaitingVerification, paid, failed }

const String kFlutterPgSdkVersion = '2.3.2+49';

class CashfreeFlutterPgApp extends StatelessWidget {
  const CashfreeFlutterPgApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF0B7285);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'cashfree_flutter_PG_App',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: seed,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF5F8FB),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: seed, width: 1.5),
          ),
        ),
      ),
      home: const CheckoutDashboard(),
    );
  }
}

class CheckoutDashboard extends StatefulWidget {
  const CheckoutDashboard({super.key});

  @override
  State<CheckoutDashboard> createState() => _CheckoutDashboardState();
}

class _CheckoutDashboardState extends State<CheckoutDashboard>
    with WidgetsBindingObserver {
  final CFPaymentGatewayService _gatewayService = CFPaymentGatewayService();
  final TextEditingController _sessionIdController = TextEditingController();

  AppEnvironment _environment = AppEnvironment.sandbox;
  bool _isCreatingOrder = false;
  CheckoutMode _checkoutMode = CheckoutMode.webCheckout;
  PaymentStatus _paymentStatus = PaymentStatus.idle;

  int _selectedTab = 0;
  bool _isLaunchingPayment = false;

  String _statusMessage =
      'Tap "Create Order & Pay" to generate an order and start a Cashfree payment.';
  String _statusTitle = 'No payment started';
  String? _activeOrderId;
  String? _lastCashfreeOrderId;
  String? _paymentId;
  double? _paymentAmount;
  DateTime? _paymentTime;
  Timer? _upiFallbackTimer;
  Timer? _statusPollTimer;
  bool _callbackReceivedForActiveOrder = false;
  bool _verificationInFlight = false;

  List<_UpiApp> _installedUpiApps = const [];

  String get _backendBaseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }

    return 'http://127.0.0.1:3000';
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _gatewayService.setCallback(_verifyPayment, _onError);
    unawaited(_loadUpiApps());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cancelPaymentFallbacks();
    _sessionIdController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _checkoutMode == CheckoutMode.upiCheckout &&
        _paymentStatus == PaymentStatus.pending &&
        _activeOrderId != null) {
      _beginFallbackVerification(_activeOrderId!);
    }
  }

  Future<void> _loadUpiApps() async {
    try {
      final rawApps = await CFUPIUtils().getUPIApps();
      if (!mounted) {
        return;
      }

      final apps = <_UpiApp>[];
      for (final entry in rawApps ?? <dynamic>[]) {
        if (entry is Map) {
          final id = '${entry['id'] ?? ''}'.trim();
          final name = '${entry['display_name'] ?? entry['name'] ?? id}'.trim();
          if (id.isNotEmpty || name.isNotEmpty) {
            apps.add(_UpiApp(id: id, name: name));
          }
        }
      }

      setState(() {
        _installedUpiApps = apps;
      });
    } on MissingPluginException {
      if (!mounted) {
        return;
      }
      setState(() {
        _installedUpiApps = const [];
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _installedUpiApps = const [];
      });
    }
  }

  CFEnvironment get _cfEnvironment {
    return _environment == AppEnvironment.sandbox
        ? CFEnvironment.SANDBOX
        : CFEnvironment.PRODUCTION;
  }

  Future<void> _launchPaymentWithOrderId(String orderId) async {
    FocusScope.of(context).unfocus();

    final sessionId = _sessionIdController.text.trim();

    if (sessionId.isEmpty) {
      _showSnackBar('Session ID is required.');
      return;
    }

    setState(() {
      _selectedTab = 1;
      _isLaunchingPayment = true;
      _paymentStatus = PaymentStatus.pending;
      _activeOrderId = orderId;
      _callbackReceivedForActiveOrder = false;
      _statusTitle = 'Payment in progress';
      _statusMessage =
          'Payment checkout has been launched. Complete the flow in the SDK, then verify the final order status from your server.';
    });

    _cancelPaymentFallbacks();

    try {
      final session = CFSessionBuilder()
          .setEnvironment(_cfEnvironment)
          .setOrderId(orderId)
          .setPaymentSessionId(sessionId)
          .build();

      if (_checkoutMode == CheckoutMode.webCheckout) {
        final payment = CFWebCheckoutPaymentBuilder()
            .setSession(session)
            .setTheme(_buildTheme())
            .build();
        _gatewayService.doPayment(payment);
      } else {
        final payment = CFUPIPaymentBuilder()
            .setSession(session)
            .setUPI(
              CFUPIBuilder().setChannel(CFUPIChannel.INTENT_WITH_UI).build(),
            )
            .build();
        _gatewayService.doPayment(payment);
        _startUpiFallbackWatchdog(orderId);
      }
    } on CFException catch (error) {
      _markFailed(orderId: orderId, message: error.message);
    } finally {
      if (mounted) {
        setState(() {
          _isLaunchingPayment = false;
        });
      }
    }
  }

  Future<Map<String, String>?> _createOrderInBackend() async {
    if (!mounted) return null;
    setState(() {
      _isCreatingOrder = true;
    });

    try {
      final response = await http.post(
        Uri.parse('$_backendBaseUrl/create-order'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({}),
      ).timeout(const Duration(seconds: 20));

      if (response.statusCode != 200) {
        _showSnackBar('Backend error: ${response.statusCode} - ${response.body}');
        return null;
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final sessionId = data['payment_session_id'] as String?;
      final orderId = data['order_id'] as String?;
      
      if (sessionId == null || sessionId.isEmpty || orderId == null || orderId.isEmpty) {
        _showSnackBar('Invalid response from backend.');
        return null;
      }

      return {'order_id': orderId, 'payment_session_id': sessionId};
    } catch (e) {
      _showSnackBar('Order creation failed: $e');
      return null;
    } finally {
      if (mounted) {
        setState(() {
          _isCreatingOrder = false;
        });
      }
    }
  }

  Future<void> _createOrderAndPay() async {
    final result = await _createOrderInBackend();
    if (result == null) return;

    _sessionIdController.text = result['payment_session_id']!;
    // Note: order_id is not displayed in UI, but used internally
    await _launchPaymentWithOrderId(result['order_id']!);
  }

  CFTheme _buildTheme() {
    return CFThemeBuilder()
        .setNavigationBarBackgroundColorColor('#0B7285')
        .setNavigationBarTextColor('#FFFFFF')
        .setPrimaryTextColor('#0F172A')
        .setSecondaryTextColor('#475569')
        .setButtonBackgroundColor('#F97316')
        .setButtonTextColor('#FFFFFF')
        .build();
  }

  void _verifyPayment(String orderId) {
    if (!mounted) {
      return;
    }

    _callbackReceivedForActiveOrder = true;
    _cancelPaymentFallbacks();

    setState(() {
      _selectedTab = 1;
      _paymentStatus = PaymentStatus.awaitingVerification;
      _activeOrderId = _activeOrderId ?? orderId;
      _lastCashfreeOrderId = orderId;
      _statusTitle = 'Verifying payment status...';
      _statusMessage = 'Please wait while we confirm your payment with Cashfree...';
    });

    _verifyOrderStatus(orderId);
  }

  Future<void> _verifyOrderStatus(String orderId) async {
    if (_verificationInFlight) {
      return;
    }

    _verificationInFlight = true;
    try {
      final response = await http.get(
        Uri.parse('$_backendBaseUrl/verify-order/$orderId'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 20));

      if (response.statusCode != 200) {
        _showSnackBar('Failed to verify order: ${response.statusCode}');
        return;
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final orderStatus = data['order_status'] as String?;
      final paymentId = data['cf_payment_id'] as String?;
      final orderAmount = data['order_amount'];
      final paymentCompletionTime = data['payment_completion_time'] as String?;

      if (!mounted) return;

      setState(() {
        if (paymentId != null && paymentId.isNotEmpty) {
          _paymentId = paymentId;
        }

        _paymentAmount = orderAmount is num ? orderAmount.toDouble() : null;

        if (paymentCompletionTime != null && paymentCompletionTime.isNotEmpty) {
          try {
            _paymentTime = DateTime.parse(paymentCompletionTime);
          } catch (_) {
            _paymentTime = null;
          }
        }

        if (orderStatus == 'PAID') {
          _cancelPaymentFallbacks();
          _paymentStatus = PaymentStatus.paid;
          _statusTitle = 'Payment Successful! ✅';
          _statusMessage = 'Your payment has been confirmed and processed successfully.';
        } else if (orderStatus == 'ACTIVE') {
          _paymentStatus = PaymentStatus.pending;
          _statusTitle = 'Payment Pending ⏳';
          _statusMessage =
              'Your payment is still being processed. If the iOS simulator does not return automatically, close the checkout using the back arrow and refresh the status here.';
        } else if (orderStatus == 'CANCELLED') {
          _cancelPaymentFallbacks();
          _paymentStatus = PaymentStatus.failed;
          _statusTitle = 'Payment Cancelled ❌';
          _statusMessage = 'Your payment or order was cancelled.';
        } else {
          _paymentStatus = PaymentStatus.pending;
          _statusTitle = 'Payment Status: $orderStatus';
          _statusMessage = 'Order Status: $orderStatus';
        }
      });
    } catch (e) {
      _showSnackBar('Error verifying order: $e');
    } finally {
      _verificationInFlight = false;
    }
  }

  void _onError(CFErrorResponse errorResponse, String orderId) {
    _callbackReceivedForActiveOrder = true;
    _cancelPaymentFallbacks();
    _markFailed(
      orderId: orderId,
      message: errorResponse.getMessage() ?? 'Cashfree checkout failed.',
    );
  }

  void _markFailed({required String orderId, required String message}) {
    if (!mounted) {
      return;
    }

    _cancelPaymentFallbacks();

    setState(() {
      _selectedTab = 1;
      _paymentStatus = PaymentStatus.failed;
      _activeOrderId = orderId.isEmpty ? _activeOrderId : orderId;
      _lastCashfreeOrderId = orderId.isEmpty ? _lastCashfreeOrderId : orderId;
      _statusTitle = 'Payment failed';
      _statusMessage = message.isEmpty
          ? 'Cashfree checkout returned an unknown error.'
          : message;
    });
  }

  void _checkStatusNow() {
    if (_activeOrderId == null) {
      _showSnackBar('No active order to check.');
      return;
    }
    setState(() {
      _selectedTab = 1;
    });
    _verifyOrderStatus(_activeOrderId!);
  }

  void _startUpiFallbackWatchdog(String orderId) {
    if (!Platform.isIOS) {
      return;
    }

    _upiFallbackTimer = Timer(const Duration(seconds: 8), () {
      if (!_callbackReceivedForActiveOrder && mounted) {
        _beginFallbackVerification(orderId);
      }
    });

    _statusPollTimer = Timer.periodic(const Duration(seconds: 8), (timer) {
      if (!mounted || _callbackReceivedForActiveOrder) {
        timer.cancel();
        return;
      }

      if (_paymentStatus == PaymentStatus.paid ||
          _paymentStatus == PaymentStatus.failed) {
        timer.cancel();
        return;
      }

      _beginFallbackVerification(orderId);
    });
  }

  void _beginFallbackVerification(String orderId) {
    if (!mounted || _callbackReceivedForActiveOrder) {
      return;
    }

    setState(() {
      _selectedTab = 1;
      _paymentStatus = PaymentStatus.awaitingVerification;
      _statusTitle = 'Checking payment status...';
      _statusMessage =
          'Cashfree checkout has not returned a callback yet, so the app is checking the order status directly.';
    });

    _verifyOrderStatus(orderId);
  }

  void _cancelPaymentFallbacks() {
    _upiFallbackTimer?.cancel();
    _statusPollTimer?.cancel();
    _upiFallbackTimer = null;
    _statusPollTimer = null;
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFEAF7FA), Color(0xFFF5F8FB), Color(0xFFFFF8F1)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: _HeroBanner(
                  environmentLabel: _environment == AppEnvironment.sandbox
                      ? 'Sandbox'
                      : 'Production',
                  checkoutLabel: _checkoutMode == CheckoutMode.webCheckout
                      ? 'Web Checkout'
                      : 'UPI Intent',
                  sdkVersionLabel:
                      'PG redirection SDK version: $kFlutterPgSdkVersion',
                ),
              ),
              Expanded(
                child: IndexedStack(
                  index: _selectedTab,
                  children: [
                    _buildCheckoutScreen(context),
                    _buildStatusScreen(context),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTab,
        onDestinationSelected: (index) {
          setState(() {
            _selectedTab = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.tune_rounded),
            label: 'Checkout',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_rounded),
            label: 'Status',
          ),
        ],
      ),
    );
  }

  Widget _buildCheckoutScreen(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
      children: [
        _SectionCard(
          title: 'Environment',
          subtitle: 'Let the user switch between Sandbox and Production.',
          child: SegmentedButton<AppEnvironment>(
            segments: const [
              ButtonSegment(
                value: AppEnvironment.sandbox,
                icon: Icon(Icons.science_outlined),
                label: Text('Sandbox'),
              ),
              ButtonSegment(
                value: AppEnvironment.production,
                icon: Icon(Icons.verified_user_outlined),
                label: Text('Production'),
              ),
            ],
            selected: {_environment},
            onSelectionChanged: (selection) {
              setState(() {
                _environment = selection.first;
              });
            },
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Checkout Method',
          subtitle:
              'This hybrid app supports Cashfree Web Checkout and UPI Checkout on both Android and iOS.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SegmentedButton<CheckoutMode>(
                segments: const [
                  ButtonSegment(
                    value: CheckoutMode.webCheckout,
                    icon: Icon(Icons.language_rounded),
                    label: Text('Web Checkout'),
                  ),
                  ButtonSegment(
                    value: CheckoutMode.upiCheckout,
                    icon: Icon(Icons.account_balance_wallet_outlined),
                    label: Text('UPI Intent'),
                  ),
                ],
                selected: {_checkoutMode},
                onSelectionChanged: (selection) {
                  setState(() {
                    _checkoutMode = selection.first;
                  });
                },
              ),
              if (_checkoutMode == CheckoutMode.upiCheckout) ...[
                const SizedBox(height: 12),
                Text(
                  'UPI Intent lets the customer choose an installed UPI app from the SDK-powered selector.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF475569),
                  ),
                ),
                if (_installedUpiApps.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(
                    'Detected UPI apps',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _installedUpiApps
                        .map(
                          (app) => Chip(
                            label: Text(app.name),
                            avatar: const Icon(
                              Icons.phone_android_rounded,
                              size: 18,
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Order Details',
          subtitle:
              'Order ID and Payment Session ID are generated automatically by the backend.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Tap Create Order & Pay to generate the order and payment session in backend, then launch Cashfree checkout.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF475569),
                    ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Launch Checkout',
          subtitle: 'One tap flow: create order + payment session + checkout.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FilledButton.icon(
                onPressed: _isCreatingOrder || _isLaunchingPayment
                    ? null
                    : _createOrderAndPay,
                icon: _isCreatingOrder || _isLaunchingPayment
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.play_arrow_rounded),
                label: const Text('Create Order & Pay'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFF97316),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatusScreen(BuildContext context) {
    final isPendingState =
        _paymentStatus == PaymentStatus.pending ||
        _paymentStatus == PaymentStatus.awaitingVerification;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
      children: [
        _SectionCard(
          title: 'Payment Status',
          subtitle:
              'Current payment status and details',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _StatusBadge(status: _paymentStatus),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _statusTitle,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                _statusMessage,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF334155),
                ),
              ),
              const SizedBox(height: 18),
              _InfoRow(
                label: 'Environment',
                value: _environment == AppEnvironment.sandbox
                    ? 'SANDBOX'
                    : 'PRODUCTION',
              ),
              _InfoRow(
                label: 'Checkout Mode',
                value: _checkoutMode == CheckoutMode.webCheckout
                    ? 'Web Checkout'
                    : 'UPI Intent',
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Payment Details',
          subtitle:
              'Real payment information confirmed from Cashfree backend API.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_paymentStatus == PaymentStatus.idle)
                Text(
                  'No payment data available yet. Start a payment to see details.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF64748B),
                  ),
                )
              else ...[
                _InfoRow(
                  label: 'Order ID',
                  value: _activeOrderId ?? 'N/A',
                ),
                _InfoRow(
                  label: 'Payment ID',
                  value: _paymentId?.isNotEmpty == true ? _paymentId! : 'Verifying...',
                ),
                _InfoRow(
                  label: 'Amount',
                  value: _paymentAmount != null
                      ? '₹${_paymentAmount!.toStringAsFixed(2)}'
                      : 'N/A',
                ),
                _InfoRow(
                  label: 'Payment Time',
                  value: _paymentTime != null
                      ? _formatTimestamp(_paymentTime!)
                      : 'Verifying...',
                ),
                if (_paymentStatus == PaymentStatus.paid)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFFFDE),
                        border: Border.all(color: const Color(0xFF65A30D), width: 1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle, color: Color(0xFF65A30D), size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '✅ Order is PAID',
                              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                color: const Color(0xFF3A5D1A),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: isPendingState ? _checkStatusNow : null,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Refresh Status'),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final hour = timestamp.hour.toString().padLeft(2, '0');
    final minute = timestamp.minute.toString().padLeft(2, '0');
    final second = timestamp.second.toString().padLeft(2, '0');
    final month = timestamp.month.toString().padLeft(2, '0');
    final day = timestamp.day.toString().padLeft(2, '0');
    return '$day/$month/${timestamp.year} $hour:$minute:$second';
  }
}

class _HeroBanner extends StatelessWidget {
  const _HeroBanner({
    required this.environmentLabel,
    required this.checkoutLabel,
    required this.sdkVersionLabel,
  });

  final String environmentLabel;
  final String checkoutLabel;
  final String sdkVersionLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF0B7285), Color(0xFF14919B), Color(0xFFF97316)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x260F172A),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'cashfree_flutter_PG_App',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Hybrid Flutter checkout demo for Android and iOS with Cashfree Web Checkout, UPI Checkout, and a post-payment status screen.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.92),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            sdkVersionLabel,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: const Color(0xFFFFF3C4),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _BannerTag(label: environmentLabel),
              _BannerTag(label: checkoutLabel),
              const _BannerTag(label: 'Status polling'),
            ],
          ),
        ],
      ),
    );
  }
}

class _BannerTag extends StatelessWidget {
  const _BannerTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x120F172A),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: const Color(0xFF64748B)),
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final PaymentStatus status;

  @override
  Widget build(BuildContext context) {
    late final String label;
    late final Color color;

    switch (status) {
      case PaymentStatus.idle:
        label = 'Idle';
        color = const Color(0xFF64748B);
        break;
      case PaymentStatus.pending:
        label = 'Pending';
        color = const Color(0xFFF59E0B);
        break;
      case PaymentStatus.awaitingVerification:
        label = 'Verify';
        color = const Color(0xFF0B7285);
        break;
      case PaymentStatus.paid:
        label = 'Paid';
        color = const Color(0xFF16A34A);
        break;
      case PaymentStatus.failed:
        label = 'Failed';
        color = const Color(0xFFDC2626);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: const Color(0xFF64748B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF0F172A),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _UpiApp {
  const _UpiApp({required this.id, required this.name});

  final String id;
  final String name;
}
