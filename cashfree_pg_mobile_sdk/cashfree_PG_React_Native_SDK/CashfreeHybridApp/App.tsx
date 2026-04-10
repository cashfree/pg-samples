import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CFErrorResponse,
  CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';
import {
  CFEnvironment,
  CFSession,
  CFThemeBuilder,
  CFUPIIntentCheckoutPayment,
} from 'cashfree-pg-api-contract';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  checkBackendHealth,
  createCashfreeOrder,
  verifyCashfreeOrder,
} from './src/services/cashfreeApi';
import {
  CashfreeEnvironment,
  CheckoutLaunchMode,
  OrderHistoryItem,
  OrderStatus,
} from './src/types/cashfree';

const DEFAULT_BACKEND_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});
const DEMO_AUTOPAY_URL = 'cashfreehybridapp://demo/auto-pay';
const SCREEN_BACKGROUND = '#f8f5f0';
const RN_PG_SDK_VERSION = '2.3.0';

function App(): React.JSX.Element {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL ?? '');
  const [environment, setEnvironment] =
    useState<CashfreeEnvironment>('SANDBOX');
  const [customerName, setCustomerName] = useState('Rahul Sharma');
  const [customerEmail, setCustomerEmail] = useState('rahul@example.com');
  const [customerPhone, setCustomerPhone] = useState('9999999999');
  const [amount, setAmount] = useState('1.00');
  const [orderNote, setOrderNote] = useState('Hybrid app payment');
  const [checkoutMode, setCheckoutMode] = useState<CheckoutLaunchMode>('WEB');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'checkout' | 'status'>('checkout');
  const [statusMessage, setStatusMessage] = useState(
    'Ready to create a Cashfree order from your backend.',
  );
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [refreshingOrderId, setRefreshingOrderId] = useState<string | null>(null);

  const backendUrlRef = useRef(backendUrl);
  const hasAutoStartedDemoRef = useRef(false);

  useEffect(() => {
    backendUrlRef.current = backendUrl;
  }, [backendUrl]);

  const upsertOrder = useCallback((nextOrder: OrderHistoryItem) => {
    setOrderHistory(current => {
      const remainingOrders = current.filter(
        order => order.orderId !== nextOrder.orderId,
      );

      return [nextOrder, ...remainingOrders].slice(0, 10);
    });
  }, []);

  const patchOrder = useCallback(
    (orderId: string, update: Partial<OrderHistoryItem>) => {
      setOrderHistory(current =>
        current.map(order =>
          order.orderId === orderId ? {...order, ...update} : order,
        ),
      );
    },
    [],
  );

  const verifyExistingOrder = useCallback(
    async (
      orderId: string,
      orderEnvironment: CashfreeEnvironment,
      options?: {showAlertOnFailure?: boolean},
    ) => {
      const baseUrl = backendUrlRef.current.trim();

      if (!baseUrl) {
        const message =
          'Add your backend URL before refreshing order status from the status screen.';
        setStatusMessage(message);
        if (options?.showAlertOnFailure) {
          Alert.alert('Backend URL required', message);
        }
        return;
      }

      try {
        setRefreshingOrderId(orderId);
        patchOrder(orderId, {
          lastMessage: 'Refreshing payment status from backend...',
        });
        setStatusMessage(`Refreshing payment status for ${orderId}...`);

        const result = await verifyCashfreeOrder(baseUrl, orderId, orderEnvironment);
        const normalizedStatus = normalizeOrderStatus(result.orderStatus);

        patchOrder(orderId, {
          status: normalizedStatus,
          paymentSessionId: result.paymentSessionId,
          lastUpdatedAt: formatTimestamp(),
          lastMessage: `Backend confirmed ${normalizedStatus}.`,
        });
        setStatusMessage(
          `Verification complete. Order ${result.orderId} is ${normalizedStatus}.`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Verification failed.';
        patchOrder(orderId, {
          lastUpdatedAt: formatTimestamp(),
          lastMessage: message,
        });
        setStatusMessage(
          `Payment returned for ${orderId}, but backend verification failed.`,
        );

        if (options?.showAlertOnFailure) {
          Alert.alert('Verification failed', message);
        }
      } finally {
        setRefreshingOrderId(current =>
          current === orderId ? null : current,
        );
      }
    },
    [patchOrder],
  );

  const handleVerification = useCallback(
    async (orderId: string) => {
      const existingOrder = orderHistory.find(order => order.orderId === orderId);
      const orderEnvironment = existingOrder?.environment ?? environment;

      patchOrder(orderId, {
        status: 'VERIFYING',
        lastUpdatedAt: formatTimestamp(),
        lastMessage: 'Cashfree SDK finished. Waiting for backend verification...',
      });
      setActiveTab('status');

      await verifyExistingOrder(orderId, orderEnvironment, {
        showAlertOnFailure: true,
      });
    },
    [environment, orderHistory, patchOrder, verifyExistingOrder],
  );

  useEffect(() => {
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string) {
        handleVerification(orderID);
      },
      onError(error: CFErrorResponse, orderID: string) {
        const message = error.getMessage() || 'Payment flow failed.';
        patchOrder(orderID, {
          status: 'FAILED',
          lastUpdatedAt: formatTimestamp(),
          lastMessage: message,
        });
        setActiveTab('status');
        setStatusMessage(
          `Cashfree checkout returned an error for ${orderID}: ${message}`,
        );
        Alert.alert('Payment failed', `${message}\n\nOrder ID: ${orderID}`);
      },
    });

    return () => {
      CFPaymentGatewayService.removeCallback();
    };
  }, [handleVerification, patchOrder]);

  const launchCashfreeCheckout = useCallback(
    (session: CFSession, mode: CheckoutLaunchMode) => {
      if (mode === 'UPI') {
        const upiTheme = new CFThemeBuilder()
          .setNavigationBarBackgroundColor('#0f172a')
          .setNavigationBarTextColor('#fffaf0')
          .setButtonBackgroundColor('#0f766e')
          .setButtonTextColor('#fffaf0')
          .setPrimaryTextColor('#0f172a')
          .setSecondaryTextColor('#475569')
          .setBackgroundColor('#fffaf3')
          .build();

        const upiPayment = new CFUPIIntentCheckoutPayment(session, upiTheme);
        CFPaymentGatewayService.doUPIPayment(upiPayment);
        return;
      }

      CFPaymentGatewayService.doWebPayment(session);
    },
    [],
  );

  const handleStartPayment = useCallback(async () => {
    const trimmedUrl = backendUrl.trim().replace(/\/$/, '');

    if (!trimmedUrl) {
      Alert.alert(
        'Backend URL required',
        'Enter the URL of the backend that creates Cashfree orders.',
      );
      return;
    }

    if (!amount.trim() || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert(
        'Invalid amount',
        'Enter a valid order amount greater than zero.',
      );
      return;
    }

    try {
      setLoading(true);
      setStatusMessage('Checking backend connection...');
      await checkBackendHealth(trimmedUrl);
      setStatusMessage('Backend reachable. Creating order on backend...');

      const order = await createCashfreeOrder(trimmedUrl, {
        environment,
        orderAmount: Number(amount),
        orderCurrency: 'INR',
        orderNote,
        customerName,
        customerEmail,
        customerPhone,
      });

      upsertOrder({
        orderId: order.orderId,
        paymentSessionId: order.paymentSessionId,
        amount,
        customerName,
        customerPhone,
        environment,
        checkoutMode,
        status: normalizeOrderStatus(order.orderStatus),
        createdAt: formatTimestamp(),
        lastUpdatedAt: formatTimestamp(),
        lastMessage: `Order created. Launching ${getCheckoutModeLabel(checkoutMode)} checkout...`,
      });

      setStatusMessage(
        `Order created. Launching ${getCheckoutModeLabel(checkoutMode)} checkout...`,
      );
      setActiveTab('checkout');

      const cfEnvironment =
        environment === 'PRODUCTION'
          ? CFEnvironment.PRODUCTION
          : CFEnvironment.SANDBOX;
      const session = new CFSession(
        order.paymentSessionId,
        order.orderId,
        cfEnvironment,
      );

      launchCashfreeCheckout(session, checkoutMode);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start payment.';
      setStatusMessage(message);
      Alert.alert('Unable to start payment', message);
    } finally {
      setLoading(false);
    }
  }, [
    amount,
    backendUrl,
    checkoutMode,
    customerEmail,
    customerName,
    customerPhone,
    environment,
    launchCashfreeCheckout,
    orderNote,
    upsertOrder,
  ]);

  useEffect(() => {
    const maybeStartDemoFlow = (url: string | null | undefined) => {
      if (!url || hasAutoStartedDemoRef.current) {
        return;
      }

      try {
        const parsedUrl = new URL(url);
        const route = `${parsedUrl.hostname}${parsedUrl.pathname}`.replace(
          /^\/+/,
          '',
        );

        if (route !== 'demo/auto-pay') {
          return;
        }

        hasAutoStartedDemoRef.current = true;
        setTimeout(() => {
          handleStartPayment();
        }, 1200);
      } catch {
        // Ignore malformed URLs and continue with the normal manual flow.
      }
    };

    Linking.getInitialURL()
      .then(initialUrl => {
        maybeStartDemoFlow(initialUrl);
      })
      .catch(() => {});

    const subscription = Linking.addEventListener('url', event => {
      maybeStartDemoFlow(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleStartPayment]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={SCREEN_BACKGROUND} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentInsetAdjustmentBehavior="automatic"
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="always"
            alwaysBounceVertical>
            <View style={styles.heroCard}>
              <Text style={styles.kicker}>React Native Cashfree PG SDK</Text>
              <Text style={styles.title}>Hybrid payment app starter</Text>
              <Text style={styles.sdkVersion}>
                PG redirection SDK version: {RN_PG_SDK_VERSION}
              </Text>
              <Text style={styles.subtitle}>
                Create an order from your backend, open Cashfree checkout, and
                track payment status from a dedicated in-app status screen.
              </Text>
            </View>

            <View style={styles.tabRow}>
              <TabButton
                label="Checkout"
                selected={activeTab === 'checkout'}
                onPress={() => setActiveTab('checkout')}
              />
              <TabButton
                label={`Payment status (${orderHistory.length})`}
                selected={activeTab === 'status'}
                onPress={() => setActiveTab('status')}
              />
            </View>

            {activeTab === 'checkout' ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Backend</Text>
                  <LabeledInput
                    label="Backend base URL"
                    value={backendUrl}
                    onChangeText={setBackendUrl}
                    placeholder="https://your-server.example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.helper}>
                    Android emulator usually uses `http://10.0.2.2:3000`, iOS
                    simulator uses `http://localhost:3000`, and physical devices
                    need your machine&apos;s LAN IP.
                  </Text>

                  <Text style={styles.sectionLabel}>Environment</Text>
                  <View style={styles.segmentRow}>
                    <EnvironmentButton
                      label="Sandbox"
                      selected={environment === 'SANDBOX'}
                      onPress={() => setEnvironment('SANDBOX')}
                    />
                    <EnvironmentButton
                      label="Production"
                      selected={environment === 'PRODUCTION'}
                      onPress={() => setEnvironment('PRODUCTION')}
                    />
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Order details</Text>
                  <Text style={styles.sectionLabel}>Checkout type</Text>
                  <View style={styles.segmentRow}>
                    <EnvironmentButton
                      label="Web checkout"
                      selected={checkoutMode === 'WEB'} //accepted value WEB or UPI
                      onPress={() => setCheckoutMode('WEB')}
                    />
                    <EnvironmentButton
                      label="UPI checkout"
                      selected={checkoutMode === 'UPI'}
                      onPress={() => setCheckoutMode('UPI')}
                    />
                  </View>
                  <Text style={styles.helperBlock}>
                    Pick the checkout flow at runtime. `Web checkout` opens the
                    broader Cashfree payment page, and `UPI checkout` opens the
                    UPI-only Cashfree flow with the same order/session values.
                  </Text>

                  <LabeledInput
                    label="Customer name"
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                  <LabeledInput
                    label="Customer email"
                    value={customerEmail}
                    onChangeText={setCustomerEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <LabeledInput
                    label="Customer phone"
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    keyboardType="phone-pad"
                  />
                  <LabeledInput
                    label="Order amount (INR)"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                  <LabeledInput
                    label="Order note"
                    value={orderNote}
                    onChangeText={setOrderNote}
                  />

                  <Pressable
                    accessibilityRole="button"
                    onPress={handleStartPayment}
                    disabled={loading}
                    style={({pressed}) => [
                      styles.primaryButton,
                      pressed && !loading ? styles.primaryButtonPressed : null,
                      loading ? styles.primaryButtonDisabled : null,
                    ]}>
                    {loading ? (
                      <ActivityIndicator color="#fff7ed" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Create order and pay
                      </Text>
                    )}
                  </Pressable>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Status</Text>
                  <Text style={styles.statusText}>{statusMessage}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.helper}>
                    `onVerify` only means the SDK returned control to your app.
                    The status screen below your tabs is where you should confirm
                    backend-verified order states before treating a payment as
                    successful.
                  </Text>
                  <View style={styles.divider} />
                  <Text style={styles.helper}>
                    Demo shortcut: open `{DEMO_AUTOPAY_URL}` to auto-create an
                    order and jump into checkout with the default sample values.
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Payment status</Text>
                <Text style={styles.helper}>
                  Review the latest orders and refresh any item against your
                  backend. Use backend verification as the source of truth.
                </Text>
                <View style={styles.divider} />
                {orderHistory.length === 0 ? (
                  <Text style={styles.emptyState}>
                    No orders yet. Create a payment from the checkout tab to see
                    status history here.
                  </Text>
                ) : (
                  orderHistory.map(order => (
                    <OrderStatusCard
                      key={order.orderId}
                      order={order}
                      isRefreshing={refreshingOrderId === order.orderId}
                      onRefresh={() =>
                        verifyExistingOrder(order.orderId, order.environment, {
                          showAlertOnFailure: true,
                        })
                      }
                    />
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
};

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = false,
}: InputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        style={styles.input}
      />
    </View>
  );
}

type EnvironmentButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function EnvironmentButton({
  label,
  selected,
  onPress,
}: EnvironmentButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.segmentButton, selected ? styles.segmentSelected : null]}>
      <Text
        style={[
          styles.segmentText,
          selected ? styles.segmentTextSelected : null,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

type TabButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function TabButton({label, selected, onPress}: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.tabButton, selected ? styles.tabButtonSelected : null]}>
      <Text
        style={[styles.tabButtonText, selected ? styles.tabButtonTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

type OrderStatusCardProps = {
  order: OrderHistoryItem;
  isRefreshing: boolean;
  onRefresh: () => void;
};

function OrderStatusCard({
  order,
  isRefreshing,
  onRefresh,
}: OrderStatusCardProps) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderCopy}>
          <Text style={styles.orderId}>{order.orderId}</Text>
          <Text style={styles.orderMeta}>
            {order.amount} INR • {order.environment}
          </Text>
          <Text style={styles.orderMeta}>
            Checkout: {getCheckoutModeLabel(order.checkoutMode)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: getStatusBadgeColor(order.status)},
          ]}>
          <Text style={styles.statusBadgeText}>{order.status}</Text>
        </View>
      </View>

      <Text style={styles.orderMeta}>Customer: {order.customerName}</Text>
      <Text style={styles.orderMeta}>Phone: {order.customerPhone}</Text>
      <Text style={styles.orderMeta}>
        Session: {order.paymentSessionId ?? 'Not available'}
      </Text>
      <Text style={styles.orderMeta}>Created: {order.createdAt}</Text>
      <Text style={styles.orderMeta}>Updated: {order.lastUpdatedAt}</Text>
      <Text style={styles.orderMessage}>{order.lastMessage}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={onRefresh}
        disabled={isRefreshing}
        style={[
          styles.secondaryButton,
          isRefreshing ? styles.secondaryButtonDisabled : null,
        ]}>
        {isRefreshing ? (
          <ActivityIndicator color="#0f766e" />
        ) : (
          <Text style={styles.secondaryButtonText}>Refresh status</Text>
        )}
      </Pressable>
    </View>
  );
}

function formatTimestamp() {
  return new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function normalizeOrderStatus(status?: string): OrderHistoryItem['status'] {
  if (!status) {
    return 'PENDING';
  }

  const knownStatuses: OrderStatus[] = [
    'ACTIVE',
    'PAID',
    'EXPIRED',
    'TERMINATED',
    'TERMINATION_REQUESTED',
  ];

  return knownStatuses.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : 'PENDING';
}

function getStatusBadgeColor(status: OrderHistoryItem['status']) {
  switch (status) {
    case 'PAID':
      return '#0f766e';
    case 'FAILED':
    case 'TERMINATED':
      return '#b91c1c';
    case 'VERIFYING':
      return '#1d4ed8';
    case 'ACTIVE':
      return '#c2410c';
    case 'EXPIRED':
    case 'TERMINATION_REQUESTED':
      return '#6b7280';
    case 'PENDING':
    default:
      return '#7c3aed';
  }
}

function getCheckoutModeLabel(mode: CheckoutLaunchMode) {
  return mode === 'UPI' ? 'UPI' : 'Web';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 120,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 24,
  },
  kicker: {
    color: '#fdba74',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    color: '#fffaf0',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 12,
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 22,
  },
  sdkVersion: {
    marginTop: 10,
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#efe4d2',
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabButtonSelected: {
    backgroundColor: '#0f172a',
  },
  tabButtonText: {
    color: '#7c2d12',
    fontSize: 14,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#fffaf0',
  },
  card: {
    backgroundColor: '#fffaf3',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1e4d1',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6c2a7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 16,
  },
  helper: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  helperBlock: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d6c2a7',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff7ed',
  },
  segmentSelected: {
    backgroundColor: '#c2410c',
    borderColor: '#c2410c',
  },
  segmentText: {
    color: '#9a3412',
    fontWeight: '700',
  },
  segmentTextSelected: {
    color: '#fff7ed',
  },
  primaryButton: {
    backgroundColor: '#0f766e',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#ecfeff',
    borderRadius: 14,
    paddingVertical: 12,
  },
  secondaryButtonDisabled: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontWeight: '700',
  },
  statusText: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 22,
  },
  emptyState: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#ece0cf',
    marginVertical: 14,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: '#ead8bf',
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#fffef9',
    marginTop: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  orderHeaderCopy: {
    flex: 1,
  },
  orderId: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  orderMeta: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  orderMessage: {
    color: '#1e293b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  statusBadge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: '#fffaf0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default App;
