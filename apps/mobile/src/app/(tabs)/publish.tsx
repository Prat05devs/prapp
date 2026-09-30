import { ArrowRight, Info } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { FEATURE_CONSENT_TEXT, formatMoney, type OrderContentInput } from '@prapp/shared';
import { PackagePicker } from '@/components/package-picker';
import { PublishSteps } from '@/components/publish-steps';
import { StoryFields } from '@/components/story-fields';
import {
  ActionButton,
  CheckRow,
  ErrorText,
  Icon,
  PageHeader,
  Panel,
  StepHeading,
  TabScreen,
  Text,
} from '@/components/ui';
import { useCatalogue } from '@/hooks/use-catalogue';
import { useCreateDraft } from '@/hooks/use-order-editor';

// Publish: package → story → (editor) images → review → pay (LLD §13).
export default function PublishScreen() {
  const catalogue = useCatalogue();
  const { pending, fieldErrors, error, create } = useCreateDraft();
  const [content, setContent] = useState<OrderContentInput>({
    packageId: '',
    headline: '',
    body: '',
    instagramHandle: '',
    featureConsent: false,
    declarationAccepted: false,
  });
  // Default to the first package until the user picks one (derived, not synced in an effect).
  const packageId = content.packageId || catalogue.data?.packages[0]?.id || '';
  const selected = catalogue.data?.packages.find((p) => p.id === packageId);
  const update = (patch: Partial<OrderContentInput>) => setContent((c) => ({ ...c, ...patch }));

  return (
    <TabScreen>
      <View className="gap-5">
        <PageHeader
          eyebrow="Publish your story"
          title="Get your story published."
          lede={`Our team posts it on our news portals and Instagram news page within 24 hours of payment.${
            catalogue.data?.portals.length
              ? ` Our portals: ${catalogue.data.portals.map((p) => p.name).join(', ')}.`
              : ''
          }`}
        />
        <PublishSteps current={1} />
      </View>

      <View className="gap-4">
        <StepHeading step="01" title="Your story" />
        <Panel>
          <StoryFields value={content} onChange={update} errors={fieldErrors} />
        </Panel>
        <Panel tone="subtle">
          <CheckRow
            checked={content.featureConsent ?? false}
            onChange={(featureConsent) => update({ featureConsent })}
          >
            {FEATURE_CONSENT_TEXT}
          </CheckRow>
        </Panel>
      </View>

      <View className="gap-4">
        <StepHeading step="02" title="Pick a package" aside="Taxes included" />
        {catalogue.data ? (
          <PackagePicker
            packages={catalogue.data.packages}
            value={packageId}
            onChange={(packageId) => update({ packageId })}
          />
        ) : null}
      </View>

      <Panel tone="subtle">
        <View className="flex-row items-center justify-between">
          <Text variant="muted">Package</Text>
          <Text variant="label">{selected?.name ?? '-'}</Text>
        </View>
        <View className="flex-row items-center justify-between border-t border-hairline pt-4">
          <Text variant="label">Total</Text>
          <Text className="font-display text-headline-sm text-ink">
            {selected ? formatMoney(selected.priceInrPaise) : '-'}
          </Text>
        </View>
        <ErrorText>{error ?? fieldErrors.packageId}</ErrorText>
        <ActionButton
          title="Save and add images"
          variant="accent"
          icon={ArrowRight}
          loading={pending}
          onPress={() => void create({ ...content, packageId })}
        />
        <View className="flex-row items-start gap-2">
          <Icon as={Info} size={14} className="mt-0.5 text-slate" />
          <Text className="flex-1 font-mono text-code text-slate">
            You pay after adding photos and reviewing your story.
          </Text>
        </View>
      </Panel>
    </TabScreen>
  );
}
