import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * prapp://payment-result?order=…&status=… when the app is opened by the payment redirect
 * outside the auth session (LLD §9.5). Normally openAuthSessionAsync consumes this URL.
 */
export default function PaymentResult() {
  const { order, status, reason } = useLocalSearchParams<{
    order?: string;
    status?: string;
    reason?: string;
  }>();
  if (!order) return <Redirect href="/orders" />;
  return (
    <Redirect
      href={{
        pathname: '/orders/[id]',
        params: { id: order, payment: status ?? 'pending', ...(reason ? { reason } : {}) },
      }}
    />
  );
}
