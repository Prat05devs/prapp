import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowUpRight, Download, LifeBuoy, Lock, Pencil } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { formatIST, formatMoney } from '@prapp/shared';
import { OrderTimeline } from '@/components/order-timeline';
import { PressableScale } from '@/components/motion/pressable-scale';
import { StatusBadge } from '@/components/status-badge';
import {
  ActionButton,
  Badge,
  Card,
  Centered,
  ErrorText,
  Group,
  HeaderButton,
  Icon,
  Notice,
  Row,
  ScrollScreen,
  Section,
  Text,
} from '@/components/ui';
import { useCheckout } from '@/hooks/use-checkout';
import { useOrder } from '@/hooks/use-order';
import { appEnv, siteUrl } from '@/lib/env';
import { api } from '@/lib/api';

// Order detail (LLD §13, wireframe in docs/MOBILE-UX.md): status, links + report after publish,
// edit & resubmit on changes. The action for the order's status sits in the bottom bar.
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
    ['Package', order.packageName ?? 'Package'],
    [
      'Amount',
      order.amountMinor != null && order.currency
        ? formatMoney(order.amountMinor, order.currency)
        : '-',
    ],
    ['Created', formatIST(order.createdAt)],
    ...(order.paidAt ? [['Paid', formatIST(order.paidAt)] as [string, string]] : []),
    ...(order.deadlineAt && ['paid', 'in_progress'].includes(order.status)
      ? [['Expected live by', formatIST(order.deadlineAt)] as [string, string]]
      : []),
    ...(order.publishedAt ? [['Published', formatIST(order.publishedAt)] as [string, string]] : []),
  ];

  const showPayLink = Boolean(payLink && order.status === 'paid' && order.amountMinor);
  const reportReady = order.status === 'published' && order.reportStatus === 'ready';
  const action = showPayLink ? (
    <ActionButton
      title={`Pay ${formatMoney(order.amountMinor ?? 0, order.currency ?? 'INR')} on Razorpay`}
      variant="accent"
      icon={ArrowUpRight}
      onPress={() => payLink && void WebBrowser.openBrowserAsync(payLink)}
    />
  ) : reportReady ? (
    <ActionButton
      title="Download PDF report"
      variant="accent"
      icon={Download}
      onPress={() => void openReport()}
    />
  ) : order.status === 'draft' ? (
    <ActionButton title="Continue editing" variant="accent" icon={Pencil} onPress={edit} />
  ) : order.status === 'changes_requested' ? (
    <ActionButton title="Edit and resubmit" variant="accent" icon={Pencil} onPress={edit} />
  ) : order.status === 'pending_payment' || order.status === 'expired' ? (
    <View className="flex-row gap-2">
      <ActionButton
        title="Edit"
        variant="outline"
        icon={Pencil}
        onPress={() => void checkout.reopen()}
      />
      <ActionButton
        title="Pay now"
        variant="accent"
        icon={Lock}
        className="flex-1"
        loading={checkout.pending}
        onPress={() => void checkout.pay()}
      />
    </View>
  ) : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton
              icon={LifeBuoy}
              label="Help with this order"
              onPress={() =>
                void WebBrowser.openBrowserAsync(`${siteUrl()}/support?order=${order.orderNumber}`)
              }
            />
          ),
        }}
      />
      <ScrollScreen
        refreshing={loading}
        onRefresh={() => void refresh()}
        footer={
          action ? (
            <>
              <ErrorText>{checkout.error}</ErrorText>
              {action}
            </>
          ) : undefined
        }
      >
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2">
            <StatusBadge status={order.status} />
            <Text className="font-mono text-code text-slate">{order.orderNumber}</Text>
          </View>
          <Text className="font-display text-headline-md text-ink">
            {order.headline || 'Untitled story'}
          </Text>
        </View>

        {payment && unpaid ? (
          payment === 'failed' ? (
            <Notice tone="danger" title="Payment was not completed">
              {`${reason ? `${reason}. ` : ''}No charge was confirmed. Try again or choose another payment method.`}
            </Notice>
          ) : (
            <Notice title="Confirming your payment…" />
          )
        ) : null}
        {showPayLink ? (
          <Notice
            tone={payment === 'link' ? 'success' : 'info'}
            title={payment === 'link' ? 'Order received: complete your payment' : 'Payment'}
          >
            {`Pay ${formatMoney(order.amountMinor ?? 0, order.currency ?? 'INR')} on our Razorpay page and write your order number ${order.orderNumber} in the note. We check every payment and then publish your story. Already paid? Nothing more to do.`}
          </Notice>
        ) : null}
        {payment && !unpaid && !payLink ? (
          <Notice tone="success" title="Your story is with our editorial team.">
            {`We have received your submission${order.amountMinor === 0 ? '' : ' and payment'}. We will review the story before publication and notify you when the links are live.`}
          </Notice>
        ) : null}
        {order.status === 'changes_requested' ? (
          <Notice tone="warn" title="Your story needs a few changes before publication">
            {order.changesRequestedReason}
          </Notice>
        ) : null}
        {order.status === 'rejected' ? (
          <Notice tone="danger" title="We can't publish this story">
            {`${order.rejectionReason ?? ''}\nWe have started a full refund. Banks can take 5–7 working days to show it.`}
          </Notice>
        ) : null}
        {order.status === 'published' && order.reportStatus !== 'ready' ? (
          <Notice>
            Your delivery report is being prepared. We&apos;ll notify you when it&apos;s ready.
          </Notice>
        ) : null}

        {[
          'draft',
          'pending_payment',
          'paid',
          'in_progress',
          'changes_requested',
          'published',
        ].includes(order.status) ? (
          <Section title="Progress">
            <Card>
              <OrderTimeline status={order.status} />
            </Card>
          </Section>
        ) : null}

        {placements.length ? (
          <Section title="Your story is live." footer="Every live link included in your package.">
            <Group>
              {placements.map((p) => (
                <PressableScale
                  scaleTo={0.985}
                  key={p.id}
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(p.liveUrl)}
                  className="flex-row items-center gap-3 px-4 py-3 active:bg-subtle"
                >
                  <View className="flex-1 gap-0.5">
                    <Text className="font-sans-medium text-[16px] text-ink">{p.platform}</Text>
                    <Text numberOfLines={1} className="font-mono text-code text-slate">
                      {p.liveUrl}
                    </Text>
                  </View>
                  <Icon as={ArrowUpRight} size={18} className="text-faint" />
                </PressableScale>
              ))}
            </Group>
          </Section>
        ) : null}

        <Section title="Details">
          <Group>
            {facts.map(([k, v]) => (
              <Row key={k} label={k} value={v} />
            ))}
          </Group>
        </Section>

        {refunds.length ? (
          <Section title="Refunds">
            <Group>
              {refunds.map((r) => (
                <Row
                  key={r.id}
                  label={formatMoney(r.amountMinor, order.currency ?? 'INR')}
                  trailing={
                    <Badge>
                      <Text>{r.status}</Text>
                    </Badge>
                  }
                />
              ))}
            </Group>
          </Section>
        ) : null}
      </ScrollScreen>
    </>
  );
}
