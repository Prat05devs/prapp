import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowUpRight, Download, Globe, LifeBuoy, Lock, Pencil } from 'lucide-react-native';
import { Linking, Pressable, View } from 'react-native';
import { formatIST, formatMoney } from '@prapp/shared';
import { OrderTimeline } from '@/components/order-timeline';
import { StatusBadge } from '@/components/status-badge';
import {
  ActionButton,
  Badge,
  Centered,
  ErrorText,
  Icon,
  Notice,
  Panel,
  ScrollScreen,
  Text,
} from '@/components/ui';
import { useCheckout } from '@/hooks/use-checkout';
import { useOrder } from '@/hooks/use-order';
import { appEnv } from '@/lib/env';
import { api } from '@/lib/api';

// Order detail (LLD §13): status, links + report after publish, edit & resubmit on changes.
export default function OrderScreen() {
  const { id, payment, reason } = useLocalSearchParams<{
    id: string;
    payment?: string;
    reason?: string;
  }>();
  const { data, loading, refresh, error } = useOrder(
    id,
    payment === 'success' || payment === 'pending',
  );
  const checkout = useCheckout(id);

  if (!data)
    return (
      <Centered>
        {error ? <ErrorText>{error}</ErrorText> : <Text variant="muted">Loading…</Text>}
      </Centered>
    );
  const { order, placements, refunds, reportUrl } = data;
  const env = appEnv();
  const payLink =
    env.EXPO_PUBLIC_PAYMENTS_MODE === 'link' ? (env.EXPO_PUBLIC_PAYMENT_LINK_URL ?? null) : null;
  const unpaid = ['draft', 'pending_payment', 'expired'].includes(order.status);
  const edit = () => router.push({ pathname: '/orders/[id]/edit', params: { id } });

  async function openReport() {
    // The API returns a 5-minute signed URL; fetch a fresh one in case this screen is old.
    const fresh = await api.orders.get(id).catch(() => null);
    const url = fresh?.reportUrl ?? reportUrl;
    if (url) await WebBrowser.openBrowserAsync(url);
  }

  const facts: [string, string][] = [
    ['Created', formatIST(order.createdAt)],
    ...(order.paidAt ? [['Paid', formatIST(order.paidAt)] as [string, string]] : []),
    ...(order.deadlineAt && ['paid', 'in_progress'].includes(order.status)
      ? [['Expected live by', formatIST(order.deadlineAt)] as [string, string]]
      : []),
    ...(order.publishedAt ? [['Published', formatIST(order.publishedAt)] as [string, string]] : []),
  ];

  return (
    <ScrollScreen refreshing={loading} onRefresh={() => void refresh()}>
      <Panel tone="subtle" className="gap-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-body-sm text-slate">
            Order <Text className="font-mono text-code text-ink">{order.orderNumber}</Text>
          </Text>
          <StatusBadge status={order.status} />
        </View>
        <Text variant="h2">{order.headline}</Text>
        <View className="flex-row gap-3 border-t border-rule pt-4">
          <View className="flex-1 gap-0.5">
            <Text variant="muted">Package</Text>
            <Text variant="label">{order.packageName ?? 'Package'}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text variant="muted">Amount</Text>
            <Text variant="label">
              {order.amountMinor != null && order.currency
                ? formatMoney(order.amountMinor, order.currency)
                : '-'}
            </Text>
          </View>
        </View>
        <OrderTimeline status={order.status} />
        <View className="border-t border-rule">
          {facts.map(([k, v]) => (
            <View key={k} className="flex-row justify-between gap-4 border-b border-rule py-2.5">
              <Text variant="muted">{k}</Text>
              <Text className="text-body-sm text-ink">{v}</Text>
            </View>
          ))}
        </View>
      </Panel>

      {payment && unpaid ? (
        payment === 'failed' ? (
          <Notice tone="danger" title="Payment failed">
            {`${reason ? `${reason}. ` : ''}No money was taken. You can try again.`}
          </Notice>
        ) : (
          <Notice title="Confirming your payment…" />
        )
      ) : null}
      {payLink && order.status === 'paid' && order.amountMinor ? (
        <Notice
          tone={payment === 'link' ? 'success' : 'info'}
          title={payment === 'link' ? 'Order received: complete your payment' : 'Payment'}
        >
          {`Pay ${formatMoney(order.amountMinor, order.currency ?? 'INR')} on our Razorpay page and write your order number ${order.orderNumber} in the note. We check every payment and then publish your story. Already paid? Nothing more to do.`}
        </Notice>
      ) : null}
      {payLink && order.status === 'paid' && order.amountMinor ? (
        <ActionButton
          title={`Pay ${formatMoney(order.amountMinor, order.currency ?? 'INR')} on Razorpay`}
          variant="accent"
          icon={ArrowUpRight}
          onPress={() => void WebBrowser.openBrowserAsync(payLink)}
        />
      ) : null}
      {payment && !unpaid && !payLink ? (
        <Notice
          tone="success"
          title={order.amountMinor === 0 ? 'Order confirmed' : 'Payment received'}
        >
          Your story will be published within 24 hours.
        </Notice>
      ) : null}

      {order.status === 'changes_requested' ? (
        <Notice tone="warn" title="Our team asked for changes">
          {order.changesRequestedReason}
        </Notice>
      ) : null}
      {order.status === 'rejected' ? (
        <Notice tone="danger" title="We could not publish your story">
          {`${order.rejectionReason ?? ''}\nA full refund has been initiated. Banks can take 5–7 working days to show it.`}
        </Notice>
      ) : null}

      {placements.length ? (
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Icon as={Globe} size={18} className="text-brand" />
            <Text variant="h3">Your story is live</Text>
          </View>
          {placements.map((p) => (
            <View key={p.id} className="gap-3 rounded-lg border border-hairline bg-paper p-4">
              <View className="flex-row items-center justify-between">
                <Text variant="label">{p.platform}</Text>
                <Badge variant="verified">
                  <Text>Live</Text>
                </Badge>
              </View>
              <Pressable
                onPress={() => void Linking.openURL(p.liveUrl)}
                className="flex-row items-center gap-2 rounded-md bg-subtle px-3 py-2 active:bg-elevated"
              >
                <Text numberOfLines={1} className="flex-1 font-mono text-code text-body">
                  {p.liveUrl}
                </Text>
                <Icon as={ArrowUpRight} size={14} className="text-slate" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {refunds.length ? (
        <View className="gap-2">
          <Text variant="h3">Refunds</Text>
          {refunds.map((r) => (
            <View
              key={r.id}
              className="flex-row items-center justify-between rounded-xl border border-hairline px-4 py-3"
            >
              <Text variant="label">{formatMoney(r.amountMinor, order.currency ?? 'INR')}</Text>
              <Badge>
                <Text>{r.status}</Text>
              </Badge>
            </View>
          ))}
        </View>
      ) : null}

      <View className="gap-3">
        {order.status === 'published' ? (
          order.reportStatus === 'ready' ? (
            <ActionButton
              title="Download report (PDF)"
              icon={Download}
              onPress={() => void openReport()}
            />
          ) : (
            <Notice>
              Your report is being prepared. We&apos;ll notify you when it&apos;s ready.
            </Notice>
          )
        ) : null}
        {order.status === 'draft' ? (
          <ActionButton title="Continue editing" icon={Pencil} onPress={edit} />
        ) : null}
        {order.status === 'changes_requested' ? (
          <ActionButton title="Edit and resubmit" icon={Pencil} onPress={edit} />
        ) : null}
        {order.status === 'pending_payment' || order.status === 'expired' ? (
          <>
            <ActionButton
              title="Pay now"
              variant="accent"
              icon={Lock}
              loading={checkout.pending}
              onPress={() => void checkout.pay()}
            />
            <ActionButton
              title="Edit story"
              variant="outline"
              icon={Pencil}
              onPress={() => void checkout.reopen()}
            />
          </>
        ) : null}
        <ErrorText>{checkout.error}</ErrorText>
        <ActionButton
          title="Need help with this order?"
          variant="ghost"
          icon={LifeBuoy}
          onPress={() =>
            void WebBrowser.openBrowserAsync(
              `${appEnv().EXPO_PUBLIC_API_URL}/support?order=${order.orderNumber}`,
            )
          }
        />
      </View>
    </ScrollScreen>
  );
}
