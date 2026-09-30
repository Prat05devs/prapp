import { useLocalSearchParams } from 'expo-router';
import { CircleCheck, Info, Lock, ShieldCheck, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';
import type { CustomerOrder } from '@prapp/api-client';
import { getOrder } from '@prapp/api-client';
import { DECLARATION_TEXT, FEATURE_CONSENT_TEXT, formatMoney } from '@prapp/shared';
import { ImageSlots } from '@/components/image-slots';
import { PackagePicker } from '@/components/package-picker';
import { PublishSteps } from '@/components/publish-steps';
import { StatusBadge } from '@/components/status-badge';
import { StoryFields } from '@/components/story-fields';
import {
  ActionButton,
  Centered,
  CheckRow,
  ErrorText,
  Icon,
  Notice,
  Panel,
  ScrollScreen,
  StepHeading,
  Text,
} from '@/components/ui';
import { useFocusedData } from '@/hooks/use-async';
import { useCatalogue } from '@/hooks/use-catalogue';
import { useCheckout } from '@/hooks/use-checkout';
import { useOrderEditor, type SaveState } from '@/hooks/use-order-editor';
import { appEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const SAVE: Record<SaveState, string> = {
  saved: 'All changes saved',
  saving: 'Saving…',
  unsaved: 'Saving soon…',
  invalid: 'Not saved: fix the highlighted fields',
  error: 'Not saved',
};

export default function EditOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useFocusedData(() => getOrder(supabase, id), id);
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

  return (
    <ScrollScreen>
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-headline-sm text-ink">{order.orderNumber}</Text>
          <StatusBadge status={ed.status} />
        </View>
        <View className="flex-row items-center gap-1.5">
          {ed.saveState === 'saved' ? (
            <Icon as={CircleCheck} size={12} className="text-emerald-strong" />
          ) : null}
          <Text
            className={`font-mono text-code uppercase ${
              ed.saveState === 'saved'
                ? 'text-emerald-strong'
                : ed.saveState === 'invalid' || ed.saveState === 'error'
                  ? 'text-danger'
                  : 'text-slate'
            }`}
          >
            {SAVE[ed.saveState]}
          </Text>
        </View>
        {!changes ? <PublishSteps current={ed.images.length ? 3 : 2} /> : null}
      </View>

      {changes ? (
        <Notice tone="warn" title="Our team asked for changes">
          {order.changesRequestedReason}
        </Notice>
      ) : null}

      <View className="gap-4">
        <StepHeading step="01" title="Your story" />
        <Panel>
          <StoryFields value={ed.content} onChange={ed.update} errors={ed.fieldErrors} />
        </Panel>
      </View>

      <View className="gap-4">
        <StepHeading step="02" title="Photos" />
        <ImageSlots
          images={ed.images}
          busy={ed.imageBusy}
          editable={ed.editable}
          onPick={(p) => void ed.addImage(p)}
          onRemove={(img) => void ed.removeImage(img)}
        />
      </View>

      {catalogue.data ? (
        <View className="gap-4">
          <StepHeading
            step="03"
            title="Package"
            aside={ed.packageLocked ? 'Locked after payment' : 'Taxes included'}
          />
          <PackagePicker
            packages={catalogue.data.packages}
            value={ed.content.packageId}
            onChange={(packageId) => ed.update({ packageId })}
            disabled={ed.packageLocked}
          />
        </View>
      ) : null}

      <Panel tone="subtle">
        <Text variant="label">Review</Text>
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
          <View className="gap-1.5 rounded-xl border border-hairline bg-canvas p-3">
            {ed.readiness.problems.map((p) => (
              <View key={p} className="flex-row items-start gap-2">
                <Icon as={Info} size={14} className="mt-0.5 text-warn" />
                <Text className="flex-1 text-body-sm text-body">{p}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {!changes && pkg ? (
          <View className="flex-row items-center justify-between border-t border-hairline pt-4">
            <Text variant="label">Total</Text>
            {freeCheckout ? (
              <View className="flex-row items-baseline gap-2">
                <Text className="text-body-sm text-slate line-through">
                  {formatMoney(pkg.priceInrPaise)}
                </Text>
                <Text className="font-display text-headline-sm text-ink">{formatMoney(0)}</Text>
              </View>
            ) : (
              <Text className="font-display text-headline-sm text-ink">
                {formatMoney(pkg.priceInrPaise)}
              </Text>
            )}
          </View>
        ) : null}
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
          <ActionButton
            title={
              freeCheckout ? 'Confirm order' : pkg ? `Pay ${formatMoney(pkg.priceInrPaise)}` : 'Pay'
            }
            variant="accent"
            icon={freeCheckout ? undefined : Lock}
            loading={checkout.pending}
            disabled={
              !ed.readiness.ready || ed.saveState === 'saving' || ed.saveState === 'unsaved'
            }
            onPress={() => void checkout.pay()}
          />
        )}
        {ed.status === 'draft' ? (
          <ActionButton
            title="Discard draft"
            variant="destructive-outline"
            icon={Trash2}
            onPress={() => void ed.discard()}
          />
        ) : null}
        {!changes ? (
          <View className="flex-row items-start gap-2">
            <Icon as={ShieldCheck} size={14} className="mt-0.5 text-slate" />
            <Text className="flex-1 font-mono text-code text-slate">
              Paid securely with Razorpay: UPI, card or net banking.
            </Text>
          </View>
        ) : null}
      </Panel>
    </ScrollScreen>
  );
}
