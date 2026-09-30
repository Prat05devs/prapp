import { View } from 'react-native';
import { INSTAGRAM_COLLAB_HINT, LIMITS, type OrderContentInput } from '@prapp/shared';
import { Field } from '@/components/ui';

export function StoryFields({
  value,
  onChange,
  errors,
  editable = true,
}: {
  value: OrderContentInput;
  onChange: (patch: Partial<OrderContentInput>) => void;
  errors: Partial<Record<keyof OrderContentInput, string>>;
  editable?: boolean;
}) {
  const headlineLen = value.headline.trim().length;
  const bodyLen = value.body.trim().length;
  return (
    <View className="gap-5">
      <Field
        label="Headline"
        aside={`${headlineLen} / ${LIMITS.headlineMax}`}
        asideOk={headlineLen > 0 && headlineLen <= LIMITS.headlineMax}
        value={value.headline}
        onChangeText={(headline) => onChange({ headline })}
        placeholder="What happened, in one line"
        editable={editable}
        error={errors.headline}
      />
      <Field
        label="Article"
        aside={`${bodyLen.toLocaleString('en-IN')} · min ${LIMITS.bodyMin}`}
        asideOk={bodyLen >= LIMITS.bodyMin}
        value={value.body}
        onChangeText={(body) => onChange({ body })}
        multiline
        className="min-h-52"
        editable={editable}
        error={errors.body}
      />
      <Field
        label="Instagram handle (optional)"
        value={value.instagramHandle ?? ''}
        onChangeText={(instagramHandle) => onChange({ instagramHandle })}
        autoCapitalize="none"
        placeholder="@yourhandle"
        className="font-mono"
        editable={editable}
        error={errors.instagramHandle}
        hint={INSTAGRAM_COLLAB_HINT}
      />
    </View>
  );
}
