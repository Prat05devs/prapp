import { INSTAGRAM_COLLAB_HINT, LIMITS, type OrderContentInput } from '@prapp/shared';
import { Field, Input, Textarea } from '@/components/ui';
import type { OrderFieldErrors } from '@/lib/form-errors';

export function StoryFields({
  value,
  onChange,
  errors,
  disabled,
}: {
  value: OrderContentInput;
  onChange: (patch: Partial<OrderContentInput>) => void;
  errors: OrderFieldErrors;
  disabled?: boolean;
}) {
  const headlineLen = value.headline.trim().length;
  const bodyLen = value.body.trim().length;
  const count = (ok: boolean, text: string) => (
    <span className={ok ? 'text-emerald-strong' : ''}>{text}</span>
  );
  return (
    <div className="flex flex-col gap-6">
      <Field
        label="Headline"
        error={errors.headline}
        aside={count(
          headlineLen > 0 && headlineLen <= LIMITS.headlineMax,
          `${headlineLen} / ${LIMITS.headlineMax} chars`,
        )}
      >
        <Input
          value={value.headline}
          maxLength={LIMITS.headlineMax + 20}
          disabled={disabled}
          placeholder="What happened, in one line"
          onChange={(e) => onChange({ headline: e.target.value })}
        />
      </Field>
      <Field
        label="Article"
        error={errors.body}
        aside={count(
          bodyLen >= LIMITS.bodyMin,
          `${bodyLen.toLocaleString('en-IN')} chars · min ${LIMITS.bodyMin}`,
        )}
      >
        <Textarea
          className="min-h-72"
          value={value.body}
          maxLength={LIMITS.bodyMax + 100}
          disabled={disabled}
          onChange={(e) => onChange({ body: e.target.value })}
        />
      </Field>
      <Field
        label="Instagram handle (optional)"
        error={errors.instagramHandle}
        hint={INSTAGRAM_COLLAB_HINT}
      >
        <Input
          className="font-mono"
          value={value.instagramHandle ?? ''}
          placeholder="@yourhandle"
          disabled={disabled}
          onChange={(e) => onChange({ instagramHandle: e.target.value })}
        />
      </Field>
    </div>
  );
}
