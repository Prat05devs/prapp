import { Stack, useLocalSearchParams } from 'expo-router';
import { CircleCheck, Info, Lock, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';
import type { CustomerOrder } from '@prapp/api-client';
import {
  DECLARATION_TEXT,
  FEATURE_CONSENT_TEXT,
  SPONSORED_DISCLOSURE,
  STORY_FORM_COPY,
  formatMoney,
} from '@prapp/shared';
import { ImageSlots } from '@/components/image-slots';
import { PackagePicker } from '@/components/package-picker';
import { PublishSteps } from '@/components/publish-steps';
import { StatusBadge } from '@/components/status-badge';
import { StoryFields } from '@/components/story-fields';
import {
  ActionButton,
  Card,
  Centered,
  CheckRow,
  ErrorText,
  Group,
  Icon,
  Notice,
  Row,
  ScrollScreen,
  Section,
  Text,
} from '@/components/ui';
import { useFocusedData } from '@/hooks/use-async';
import { useCatalogue } from '@/hooks/use-catalogue';
import { useCheckout } from '@/hooks/use-checkout';
import { useOrderEditor, type SaveState } from '@/hooks/use-order-editor';
import { appEnv } from '@/lib/env';
import { api } from '@/lib/api';

const SAVE: Record<SaveState, string> = {
  saved: 'All changes saved',
  saving: 'Saving…',
  unsaved: 'Saving soon…',
  invalid: 'Not saved: fix the highlighted fields',
  error: 'Not saved',
};

export default function EditOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useFocusedData(async () => (await api.orders.edit(id)).order, id);
  if (!order.data)
    return (
      <Centered>
        {order.error ? <ErrorText>{order.error}</ErrorText> : <Text variant="muted">Loading…</Text>}
      </Centered>
    );
  return <Editor key={order.data.id + order.data.status} order={order.data} />;
}

function Editor({ order }: { order: CustomerOrder }) {
  const ed = useOrderEditor(order);
  const checkout = useCheckout(order.id);
  const freeCheckout = appEnv().EXPO_PUBLIC_PAYMENTS_MODE === 'free';
  const catalogue = useCatalogue();
  const pkg = catalogue.data?.packages.find((p) => p.id === ed.content.packageId);
  const changes = ed.status === 'changes_requested';

  if (!ed.editable)
    return (
      <Centered>
        <Text variant="muted">This order can&apos;t be edited right now.</Text>
      </Centered>
    );

  const saveTone =
    ed.saveState === 'saved'
      ? 'text-verified'
      : ed.saveState === 'invalid' || ed.saveState === 'error'
        ? 'text-danger'
        : 'text-slate';

  const footer = (
    <>
      <ErrorText>{ed.error ?? checkout.error}</ErrorText>
      {changes ? (
        <ActionButton
          title="Resubmit for publishing"
          variant="accent"
          loading={ed.busy}
          disabled={!ed.readiness.ready}
          onPress={() => void ed.resubmit()}
        />
      ) : (
        <View className="flex-row items-center gap-4">
          <View className="gap-0.5">
            <Text className="text-[12px] text-slate">Total, GST included</Text>
            <View className="flex-row items-baseline gap-1.5">
              {freeCheckout && pkg ? (
                <Text className="text-body-sm tabular-nums text-slate line-through">
                  {formatMoney(pkg.priceInrPaise)}
                </Text>
              ) : null}
              <Text className="font-sans-semibold text-[19px] tabular-nums text-ink">
                {pkg ? formatMoney(freeCheckout ? 0 : pkg.priceInrPaise) : '-'}
              </Text>
            </View>
          </View>
          <ActionButton
            title={freeCheckout ? 'Confirm order' : 'Pay securely'}
            variant="accent"
            icon={freeCheckout ? undefined : Lock}
            className="flex-1"
            loading={checkout.pending}
            disabled={
              !ed.readiness.ready || ed.saveState === 'saving' || ed.saveState === 'unsaved'
            }
            onPress={() => void checkout.pay()}
          />
        </View>
      )}
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: changes ? 'Edit and resubmit' : 'Review and pay' }} />
      <ScrollScreen footer={footer}>
        <View className="gap-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="font-mono text-code text-slate">{order.orderNumber}</Text>
              <StatusBadge status={ed.status} />
            </View>
            <View className="flex-row items-center gap-1.5">
              {ed.saveState === 'saved' ? (
                <Icon as={CircleCheck} size={13} className="text-verified" />
              ) : null}
              <Text className={`text-label-sm ${saveTone}`}>{SAVE[ed.saveState]}</Text>
            </View>
          </View>
          {!changes ? <PublishSteps current={ed.images.length ? 3 : 2} /> : null}
        </View>

        {changes ? (
          <Notice tone="warn" title="Your story needs a few changes before publication">
            {order.changesRequestedReason}
          </Notice>
        ) : null}

        <Section title="Your story">
          <Card>
            <StoryFields value={ed.content} onChange={ed.update} errors={ed.fieldErrors} />
          </Card>
        </Section>

        <Section title={STORY_FORM_COPY.imagesLabel}>
          <ImageSlots
            orderId={order.id}
            images={ed.images}
            busy={ed.imageBusy}
            editable={ed.editable}
            onPick={(p) => void ed.addImage(p)}
            onRemove={(img) => void ed.removeImage(img)}
          />
        </Section>

        {catalogue.data ? (
          <Section
            title="Package"
            footer={ed.packageLocked ? 'The package is locked after payment.' : undefined}
          >
            <PackagePicker
              packages={catalogue.data.packages}
              value={ed.content.packageId}
              onChange={(packageId) => ed.update({ packageId })}
              disabled={ed.packageLocked}
            />
          </Section>
        ) : null}

        <Section
          title="Review your package before you pay"
          footer={
            changes
              ? undefined
              : `${SPONSORED_DISCLOSURE} Paid securely with Razorpay: UPI, card or net banking.`
          }
        >
          <Card className="gap-3">
            <CheckRow
              checked={ed.content.featureConsent ?? false}
              onChange={(featureConsent) => ed.update({ featureConsent })}
            >
              {FEATURE_CONSENT_TEXT}
            </CheckRow>
            <CheckRow
              checked={ed.content.declarationAccepted ?? false}
              onChange={(declarationAccepted) => ed.update({ declarationAccepted })}
            >
              {DECLARATION_TEXT} <Text className="text-danger">*</Text>
            </CheckRow>
            {ed.readiness.problems.length ? (
              <View className="gap-1.5 rounded-md bg-warn-tint p-3">
                {ed.readiness.problems.map((p) => (
                  <View key={p} className="flex-row items-start gap-2">
                    <Icon as={Info} size={14} className="mt-0.5 text-warn-deep" />
                    <Text className="flex-1 text-body-sm text-warn-deep">{p}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        </Section>

        {ed.status === 'draft' ? (
          <Group>
            <Row
              icon={Trash2}
              label="Discard draft"
              destructive
              onPress={() => void ed.discard()}
            />
          </Group>
        ) : null}
      </ScrollScreen>
    </>
  );
}
