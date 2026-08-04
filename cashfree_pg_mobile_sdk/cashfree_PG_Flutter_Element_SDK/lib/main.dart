import 'dart:async';
import 'dart:convert';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfcard/cfcardlistener.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfcard/cfcardwidget.dart';
import 'package:flutter_cashfree_pg_sdk/api/cferrorresponse/cferrorresponse.dart';
import 'package:flutter_cashfree_pg_sdk/utils/cfexceptions.dart';

import 'app_config.dart';
import 'cashfree_gateway.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CashfreeDemoApp());
}

class SampleCardOption {
  const SampleCardOption({
    required this.scheme,
    required this.cardType,
    required this.cardSubType,
    required this.number,
    required this.variant,
  });

  final String scheme;
  final String cardType;
  final String cardSubType;
  final String number;
  final String variant;

  String get title => '$scheme $cardType $cardSubType';
  String get subtitle => '$variant  $number';
}

const List<SampleCardOption> _sampleCards = [
  SampleCardOption(
    scheme: 'Visa',
    cardType: 'Debit',
    cardSubType: 'Retail',
    number: '4706131211212123',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Visa',
    cardType: 'Debit',
    cardSubType: 'Retail',
    number: '4062288312345026',
    variant: 'Card 2',
  ),
  SampleCardOption(
    scheme: 'Visa',
    cardType: 'Credit',
    cardSubType: 'Retail',
    number: '4576238912771450',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Visa',
    cardType: 'Credit',
    cardSubType: 'Retail',
    number: '4444333322221111',
    variant: 'Card 2',
  ),
  SampleCardOption(
    scheme: 'Visa',
    cardType: 'Credit',
    cardSubType: 'Premium',
    number: '4466050254381183',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Visa',
    cardType: 'Credit',
    cardSubType: 'Premium',
    number: '4136880012657791',
    variant: 'Card 2',
  ),
  SampleCardOption(
    scheme: 'Visa',
    cardType: 'Credit',
    cardSubType: 'Corporate',
    number: '4074970084343075',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Visa',
    cardType: 'Credit',
    cardSubType: 'Corporate',
    number: '4770355457382883',
    variant: 'Card 2',
  ),
  SampleCardOption(
    scheme: 'Mastercard',
    cardType: 'Debit',
    cardSubType: 'Retail',
    number: '5409162669381034',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Mastercard',
    cardType: 'Debit',
    cardSubType: 'Retail',
    number: '5445856839524391',
    variant: 'Card 2',
  ),
  SampleCardOption(
    scheme: 'Mastercard',
    cardType: 'Credit',
    cardSubType: 'Retail',
    number: '5105105105105100',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Mastercard',
    cardType: 'Credit',
    cardSubType: 'Retail',
    number: '5176539438527826',
    variant: 'Card 2',
  ),
  SampleCardOption(
    scheme: 'Mastercard',
    cardType: 'Credit',
    cardSubType: 'Premium',
    number: '5242535837492075',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Mastercard',
    cardType: 'Credit',
    cardSubType: 'Premium',
    number: '5203860658394375',
    variant: 'Card 2',
  ),
  SampleCardOption(
    scheme: 'Mastercard',
    cardType: 'Credit',
    cardSubType: 'Corporate',
    number: '5552190758372734',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Mastercard',
    cardType: 'Credit',
    cardSubType: 'Corporate',
    number: '5506908329471983',
    variant: 'Card 2',
  ),
  SampleCardOption(
    scheme: 'Rupay',
    cardType: 'Debit',
    cardSubType: 'Retail',
    number: '6074825972083818',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Rupay',
    cardType: 'Debit',
    cardSubType: 'Retail',
    number: '6074828163369590',
    variant: 'Card 2',
  ),
  SampleCardOption(
    scheme: 'Rupay',
    cardType: 'Credit',
    cardSubType: 'Retail',
    number: '6528591234543575',
    variant: 'Card 1',
  ),
  SampleCardOption(
    scheme: 'Rupay',
    cardType: 'Credit',
    cardSubType: 'Retail',
    number: '65292523412356',
    variant: 'Card 2',
  ),
];

class CashfreeDemoApp extends StatefulWidget {
  const CashfreeDemoApp({super.key});

  @override
  State<CashfreeDemoApp> createState() => _CashfreeDemoAppState();
}

class _CashfreeDemoAppState extends State<CashfreeDemoApp> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  final CashfreeGateway _gateway = CashfreeGateway();
  final AppLinks _appLinks = AppLinks();

  StreamSubscription<Uri>? _linkSubscription;
  String? _lastHandledOrderId;

  @override
  void initState() {
    super.initState();
    _listenForReturnUrls();
  }

  Future<void> _listenForReturnUrls() async {
    _linkSubscription = _appLinks.uriLinkStream.listen(
      _handleIncomingLink,
      onError: (Object error) {
        debugPrint('Cashfree return URL listener error: $error');
      },
    );
  }

  void _handleIncomingLink(Uri uri) {
    final orderId = uri.queryParameters['order_id'];
    if (orderId == null || orderId.isEmpty || _lastHandledOrderId == orderId) {
      return;
    }

    _lastHandledOrderId = orderId;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _openStatusScreen(
        PaymentStatusArgs(
          orderId: orderId,
          source: 'Return URL',
          initialMessage: 'Cashfree redirected back to the app.',
        ),
      );
    });
  }

  void _openStatusScreen(PaymentStatusArgs args) {
    _lastHandledOrderId = args.orderId;
    _navigatorKey.currentState?.pushNamedAndRemoveUntil(
      CashfreeStatusScreen.routeName,
      (route) => route.isFirst,
      arguments: args,
    );
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cashfree PG Element Demo',
      debugShowCheckedModeBanner: false,
      navigatorKey: _navigatorKey,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme:
            ColorScheme.fromSeed(
              seedColor: const Color(0xFF0B5FFF),
              brightness: Brightness.light,
            ).copyWith(
              surface: const Color(0xFFF8FAFC),
              primary: const Color(0xFF0B5FFF),
              secondary: const Color(0xFF059669),
            ),
        scaffoldBackgroundColor: const Color(0xFFF6F8FB),
      ),
      home: CashfreeHomeScreen(
        gateway: _gateway,
        onPaymentResult: _openStatusScreen,
      ),
      onGenerateRoute: (settings) {
        if (settings.name == CashfreeStatusScreen.routeName) {
          final args = settings.arguments;
          if (args is! PaymentStatusArgs) {
            return MaterialPageRoute<void>(
              builder: (_) => const _RouteErrorScreen(
                message: 'Missing payment status arguments.',
              ),
            );
          }

          return MaterialPageRoute<void>(
            builder: (_) => CashfreeStatusScreen(
              gateway: _gateway,
              args: args,
              onBackToHome: () {
                _navigatorKey.currentState?.popUntil((route) => route.isFirst);
              },
            ),
          );
        }

        return null;
      },
    );
  }
}

class CashfreeHomeScreen extends StatefulWidget {
  const CashfreeHomeScreen({
    super.key,
    required this.gateway,
    required this.onPaymentResult,
  });

  final CashfreeGateway gateway;
  final void Function(PaymentStatusArgs args) onPaymentResult;

  @override
  State<CashfreeHomeScreen> createState() => _CashfreeHomeScreenState();
}

class _CashfreeHomeScreenState extends State<CashfreeHomeScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _orderIdController = TextEditingController();
  final TextEditingController _amountController = TextEditingController(
    text: '1.00',
  );
  final TextEditingController _upiIdController = TextEditingController(
    text: 'testsuccess@gocash',
  );
  final TextEditingController _bankCodeController = TextEditingController(
    text: '3003',
  );
  final TextEditingController _cardHolderController = TextEditingController(
    text: 'Demo Customer',
  );
  final TextEditingController _cardExpiryMonthController =
      TextEditingController(text: '08');
  final TextEditingController _cardExpiryYearController = TextEditingController(
    text: '32',
  );
  final TextEditingController _cardCvvController = TextEditingController(
    text: '123',
  );

  ElementPaymentMode _selectedMode = ElementPaymentMode.upiIntentWithUi;
  bool _isLoading = false;

  @override
  void dispose() {
    _orderIdController.dispose();
    _amountController.dispose();
    _upiIdController.dispose();
    _bankCodeController.dispose();
    _cardHolderController.dispose();
    _cardExpiryMonthController.dispose();
    _cardExpiryYearController.dispose();
    _cardCvvController.dispose();
    super.dispose();
  }

  String _generateOrderId() {
    return 'cf_${DateTime.now().millisecondsSinceEpoch}';
  }

  void _showSnackBar(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  void _handleVerify(String verifiedOrderId) {
    widget.onPaymentResult(
      PaymentStatusArgs(
        orderId: verifiedOrderId,
        source: 'Cashfree Element SDK callback',
        initialMessage: 'Payment returned through the Element SDK callback.',
      ),
    );
  }

  void _handleError(
    CFErrorResponse errorResponse,
    String errorOrderId,
    String fallbackOrderId,
  ) {
    widget.onPaymentResult(
      PaymentStatusArgs(
        orderId: errorOrderId.isEmpty ? fallbackOrderId : errorOrderId,
        source: 'Cashfree Element SDK error',
        initialMessage: errorResponse.getMessage(),
      ),
    );
  }

  Future<void> _applySampleCard(
    SampleCardOption card,
    GlobalKey<CFCardWidgetState> cardKey,
  ) async {
    await cardKey.currentState?.setCardNumber(card.number);
    _cardHolderController.text = 'Demo Customer';
    _cardExpiryMonthController.text = '08';
    _cardExpiryYearController.text = '32';
    _cardCvvController.text = '123';
  }

  Future<bool> _submitCardElement(PreparedPayment prepared) async {
    final cardKey = GlobalKey<CFCardWidgetState>();
    final cardWidget = CFCardWidget(
      key: cardKey,
      textStyle: Theme.of(context).textTheme.bodyLarge,
      inputDecoration: const InputDecoration(
        labelText: 'Card number',
        hintText: 'XXXX XXXX XXXX XXXX',
        border: OutlineInputBorder(),
        counterText: '',
      ),
      cardListener: (CFCardListener listener) {
        debugPrint('Cashfree card listener: $listener');
      },
      cfSession: prepared.session,
    );

    final shouldSubmit = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Card Element',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 16),
                cardWidget,
                const SizedBox(height: 14),
                Text(
                  'Sample cards',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 220),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      border: Border.all(color: Theme.of(context).dividerColor),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ListView.separated(
                      padding: EdgeInsets.zero,
                      shrinkWrap: true,
                      itemCount: _sampleCards.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final sampleCard = _sampleCards[index];

                        return InkWell(
                          onTap: () => _applySampleCard(sampleCard, cardKey),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.credit_card, size: 22),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        sampleCard.title,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        sampleCard.subtitle,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: Theme.of(
                                                context,
                                              ).colorScheme.onSurfaceVariant,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Use',
                                  style: Theme.of(context).textTheme.labelLarge
                                      ?.copyWith(
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.primary,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _cardHolderController,
                  decoration: const InputDecoration(
                    labelText: 'Card holder name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _cardExpiryMonthController,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(2),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'MM',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _cardExpiryYearController,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(2),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'YY',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _cardCvvController,
                        keyboardType: TextInputType.number,
                        obscureText: true,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(4),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'CVV',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => Navigator.of(context).pop(true),
                  icon: const Icon(Icons.credit_card),
                  label: const Text('Pay by Card Element'),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (shouldSubmit != true || !mounted) {
      return false;
    }

    widget.gateway.launchCard(
      payment: prepared,
      cardWidget: cardWidget,
      cardHolderName: _cardHolderController.text.trim(),
      expiryMonth: _cardExpiryMonthController.text.trim(),
      expiryYear: _cardExpiryYearController.text.trim(),
      cvv: _cardCvvController.text.trim(),
      onVerify: _handleVerify,
      onError: (errorResponse, errorOrderId) {
        _handleError(errorResponse, errorOrderId, prepared.orderId);
      },
    );
    return true;
  }

  Future<void> _startPayment() async {
    if (AppConfig.hasPlaceholderKeys) {
      _showSnackBar(
        'Pass Cashfree client id and secret with --dart-define first.',
      );
      return;
    }

    final formState = _formKey.currentState;
    if (formState != null && !formState.validate()) {
      return;
    }

    final orderId = _orderIdController.text.trim().isEmpty
        ? _generateOrderId()
        : _orderIdController.text.trim();
    final amount = double.tryParse(_amountController.text.trim());

    if (amount == null || amount <= 0) {
      _showSnackBar('Enter a valid amount greater than 0.');
      return;
    }

    if (_orderIdController.text.trim().isEmpty) {
      _orderIdController.text = orderId;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final prepared = await widget.gateway.preparePayment(
        orderId: orderId,
        amount: amount,
      );

      if (!mounted) {
        return;
      }

      switch (_selectedMode) {
        case ElementPaymentMode.upiIntentWithUi:
          widget.gateway.launchUpiIntentWithUi(
            payment: prepared,
            onVerify: _handleVerify,
            onError: (errorResponse, errorOrderId) {
              _handleError(errorResponse, errorOrderId, prepared.orderId);
            },
          );
        case ElementPaymentMode.upiCollect:
          widget.gateway.launchUpiCollect(
            payment: prepared,
            upiId: _upiIdController.text.trim(),
            onVerify: _handleVerify,
            onError: (errorResponse, errorOrderId) {
              _handleError(errorResponse, errorOrderId, prepared.orderId);
            },
          );
        case ElementPaymentMode.netbanking:
          widget.gateway.launchNetbanking(
            payment: prepared,
            bankCode: int.tryParse(_bankCodeController.text.trim()) ?? 3003,
            onVerify: _handleVerify,
            onError: (errorResponse, errorOrderId) {
              _handleError(errorResponse, errorOrderId, prepared.orderId);
            },
          );
        case ElementPaymentMode.card:
          final submitted = await _submitCardElement(prepared);
          if (!submitted) {
            _showSnackBar('Card Element payment cancelled.');
            return;
          }
      }

      _showSnackBar('${_selectedMode.label} opened for $orderId.');
    } on CFException catch (error) {
      _showSnackBar(error.message);
    } catch (error) {
      _showSnackBar('Unable to start checkout: $error');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF2F6FF), Color(0xFFFAFCFF), Color(0xFFFFFFFF)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _HeroHeader(),
                const SizedBox(height: 20),
                _InfoCard(
                  title: 'SDK Details',
                  child: Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _MetricChip(label: 'Type', value: AppConfig.sdkType),
                      _MetricChip(
                        label: 'Version',
                        value: AppConfig.sdkVersion,
                      ),
                      _MetricChip(
                        label: 'API version',
                        value: AppConfig.apiVersion,
                      ),
                      _MetricChip(
                        label: 'Environment',
                        value: AppConfig.environmentLabel,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _InfoCard(
                  title: 'Payment Details',
                  child: Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _orderIdController,
                          decoration: InputDecoration(
                            labelText: 'ORDER ID',
                            hintText: 'Leave blank to auto-generate',
                            suffixIcon: IconButton(
                              tooltip: 'Generate order id',
                              icon: const Icon(Icons.auto_awesome),
                              onPressed: () {
                                setState(() {
                                  _orderIdController.text = _generateOrderId();
                                });
                              },
                            ),
                          ),
                          validator: (value) {
                            if (value != null && value.contains(' ')) {
                              return 'ORDER ID cannot contain spaces.';
                            }

                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _amountController,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp(r'[0-9.]'),
                            ),
                          ],
                          decoration: const InputDecoration(
                            labelText: 'AMOUNT',
                            hintText: '1.00',
                            prefixText: '₹ ',
                          ),
                          validator: (value) {
                            final amount = double.tryParse(
                              (value ?? '').trim(),
                            );
                            if (amount == null || amount <= 0) {
                              return 'Enter a valid amount greater than 0.';
                            }

                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        DropdownButtonFormField<ElementPaymentMode>(
                          value: _selectedMode,
                          decoration: const InputDecoration(
                            labelText: 'ELEMENT SDK MODE',
                          ),
                          items: ElementPaymentMode.values.map((mode) {
                            return DropdownMenuItem<ElementPaymentMode>(
                              value: mode,
                              child: Text(mode.label),
                            );
                          }).toList(),
                          onChanged: (mode) {
                            if (mode == null) {
                              return;
                            }

                            setState(() {
                              _selectedMode = mode;
                            });
                          },
                        ),
                        if (_selectedMode == ElementPaymentMode.upiCollect) ...[
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _upiIdController,
                            decoration: const InputDecoration(
                              labelText: 'UPI ID',
                              hintText: 'testsuccess@gocash',
                            ),
                            validator: (value) {
                              if (_selectedMode !=
                                  ElementPaymentMode.upiCollect) {
                                return null;
                              }

                              final upiId = (value ?? '').trim();
                              if (upiId.isEmpty || !upiId.contains('@')) {
                                return 'Enter a valid UPI ID.';
                              }

                              return null;
                            },
                          ),
                        ],
                        if (_selectedMode == ElementPaymentMode.netbanking) ...[
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _bankCodeController,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            decoration: const InputDecoration(
                              labelText: 'BANK CODE',
                              hintText: '3003',
                            ),
                            validator: (value) {
                              if (_selectedMode !=
                                  ElementPaymentMode.netbanking) {
                                return null;
                              }

                              if (int.tryParse((value ?? '').trim()) == null) {
                                return 'Enter a valid bank code.';
                              }

                              return null;
                            },
                          ),
                        ],
                        const SizedBox(height: 18),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: _isLoading ? null : _startPayment,
                            icon: _isLoading
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.lock_open),
                            label: Text(
                              _isLoading
                                  ? 'Starting Element SDK...'
                                  : 'Pay with ${_selectedMode.label}',
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Return URL: ${AppConfig.returnUriBase}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class CashfreeStatusScreen extends StatefulWidget {
  const CashfreeStatusScreen({
    super.key,
    required this.gateway,
    required this.args,
    required this.onBackToHome,
  });

  static const String routeName = '/status';

  final CashfreeGateway gateway;
  final PaymentStatusArgs args;
  final VoidCallback onBackToHome;

  @override
  State<CashfreeStatusScreen> createState() => _CashfreeStatusScreenState();
}

class _CashfreeStatusScreenState extends State<CashfreeStatusScreen> {
  OrderStatusResult? _result;
  String? _errorMessage;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _refreshStatus();
  }

  Future<void> _refreshStatus() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final result = await widget.gateway.fetchOrderStatus(widget.args.orderId);
      if (!mounted) {
        return;
      }

      setState(() {
        _result = result;
      });
    } on CFException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _errorMessage = error.message;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _errorMessage = 'Unable to refresh payment status: $error';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Color _statusColor(String status) {
    final normalized = status.toUpperCase();
    if (normalized.contains('PAID') || normalized.contains('SUCCESS')) {
      return const Color(0xFF0F9D58);
    }
    if (normalized.contains('FAILED') || normalized.contains('CANCEL')) {
      return const Color(0xFFDC2626);
    }
    return const Color(0xFF0B5FFF);
  }

  @override
  Widget build(BuildContext context) {
    final result = _result;
    final statusText = result?.orderStatus ?? 'Checking...';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Status'),
        backgroundColor: Colors.white.withValues(alpha: 0.9),
        surfaceTintColor: Colors.white,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF7FAFF), Color(0xFFFFFFFF)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _InfoCard(
                  title: 'Order summary',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _StatusHeader(
                        status: statusText,
                        color: _statusColor(statusText),
                      ),
                      const SizedBox(height: 16),
                      _DetailRow(label: 'Order ID', value: widget.args.orderId),
                      const SizedBox(height: 8),
                      _DetailRow(label: 'Source', value: widget.args.source),
                      const SizedBox(height: 8),
                      _DetailRow(label: 'SDK type', value: AppConfig.sdkType),
                      const SizedBox(height: 8),
                      _DetailRow(
                        label: 'SDK version',
                        value: AppConfig.sdkVersion,
                      ),
                      const SizedBox(height: 8),
                      _DetailRow(
                        label: 'Environment',
                        value: AppConfig.environmentLabel,
                      ),
                      if (result != null) ...[
                        const SizedBox(height: 8),
                        _DetailRow(
                          label: 'Amount',
                          value:
                              '${result.currency} ${result.amount.toStringAsFixed(2)}',
                        ),
                      ],
                    ],
                  ),
                ),
                if (widget.args.initialMessage != null) ...[
                  const SizedBox(height: 16),
                  _InfoCard(
                    title: 'Latest event',
                    child: Text(widget.args.initialMessage!),
                  ),
                ],
                const SizedBox(height: 16),
                if (_loading)
                  const LinearProgressIndicator(minHeight: 4)
                else
                  const SizedBox.shrink(),
                const SizedBox(height: 16),
                _InfoCard(
                  title: 'Refresh result',
                  child: _errorMessage != null
                      ? Text(
                          _errorMessage!,
                          style: const TextStyle(color: Color(0xFFB42318)),
                        )
                      : Text(
                          result == null
                              ? 'Tap refresh to check the latest order status from Cashfree.'
                              : 'Cashfree returned ${result.orderStatus}. Tap refresh to re-check the live status.',
                        ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _loading ? null : _refreshStatus,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh status'),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: widget.onBackToHome,
                    icon: const Icon(Icons.home_outlined),
                    label: const Text('Back to home'),
                  ),
                ),
                if (result != null) ...[
                  const SizedBox(height: 16),
                  _InfoCard(
                    title: 'Raw response',
                    child: SelectableText(
                      JsonEncoder.withIndent('  ').convert(result.raw),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class PaymentStatusArgs {
  const PaymentStatusArgs({
    required this.orderId,
    required this.source,
    this.initialMessage,
  });

  final String orderId;
  final String source;
  final String? initialMessage;
}

class _HeroHeader extends StatelessWidget {
  const _HeroHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0B1F44), Color(0xFF0B5FFF), Color(0xFF1D9BF0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x220B5FFF),
            blurRadius: 30,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Cashfree PG demo',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Create a PG order, launch checkout, and verify the payment status after return.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: Colors.white.withValues(alpha: 0.92),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _Badge(
                label: 'PG only',
                backgroundColor: Colors.white.withValues(alpha: 0.16),
                foregroundColor: Colors.white,
              ),
              _Badge(
                label: 'Return URL handled',
                backgroundColor: Colors.white.withValues(alpha: 0.16),
                foregroundColor: Colors.white,
              ),
              _Badge(
                label: 'Refresh status enabled',
                backgroundColor: Colors.white.withValues(alpha: 0.16),
                foregroundColor: Colors.white,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE3E8F4)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F0B1F44),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F8FF),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE0E7FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              letterSpacing: 0.8,
              color: const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({
    required this.label,
    required this.backgroundColor,
    required this.foregroundColor,
  });

  final String label;
  final Color backgroundColor;
  final Color foregroundColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: foregroundColor,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.status, required this.color});

  final String status;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        status,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          color: color,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w700,
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
    );
  }
}

class _RouteErrorScreen extends StatelessWidget {
  const _RouteErrorScreen({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(message, textAlign: TextAlign.center),
        ),
      ),
    );
  }
}
