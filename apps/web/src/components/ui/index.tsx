import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './alert';
import type { badgeVariants } from './badge';
import { Card as ShadcnCard } from './card';
import { Checkbox } from './checkbox';
import { Label } from './label';
import type { VariantProps } from 'class-variance-authority';

// App-level building blocks for the NewsVio design system (docs/DESIGN.md),
// composed from the shadcn/ui components in this folder. Import shadcn pieces directly
// (`@/components/ui/button` …) or the compositions below from `@/components/ui`.

export { Button, buttonVariants } from './button';
export { Badge } from './badge';
export { Input } from './input';
export { Textarea } from './textarea';
export { NativeSelect, NativeSelectOption } from './native-select';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { RadioGroup, RadioGroupItem } from './radio-group';
export { Separator } from './separator';
export { Alert, AlertDescription, AlertTitle } from './alert';
export { Checkbox } from './checkbox';
export { Label } from './label';

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

/** Label + control + hint/error, with an optional counter on the right. */
export function Field({
  label,
  error,
  hint,
  aside,
  children,
}: {
  label: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Label className="flex flex-col items-stretch gap-2 font-normal">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-label-md text-ink">{label}</span>
        {aside ? <span className="tabular text-body-sm text-slate">{aside}</span> : null}
      </span>
      {children}
      {hint ? <span className="text-body-sm text-slate">{hint}</span> : null}
      {error ? <span className="text-body-sm text-danger">{error}</span> : null}
    </Label>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? (
    <p role="alert" className="text-body-sm text-danger">
      {children}
    </p>
  ) : null;
}

/** Flat card: a white sheet on the paper canvas (or a tinted plane), hairline border, no shadow. */
export function Card({
  children,
  className,
  tone = 'canvas',
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'canvas' | 'subtle';
  as?: 'div' | 'section';
}) {
  return (
    <ShadcnCard
      role={as === 'section' ? 'region' : undefined}
      className={cn(
        'block gap-0 rounded-lg border-hairline p-5 shadow-none sm:p-6',
        tone === 'subtle' ? 'border-transparent bg-subtle' : 'bg-paper',
        className,
      )}
    >
      {children}
    </ShadcnCard>
  );
}

/**
 * Section kicker: a short sentence-case label above a heading. Sans, not mono; no caps or
 * tracking. Use it only when it adds information the heading doesn't.
 */
export function Eyebrow({
  children,
  accent = false,
  className,
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('text-label-sm', accent ? 'text-brand' : 'text-slate', className)}>
      {children}
    </span>
  );
}

/**
 * Heading for a section of a form. `step` is kept for the call sites but rendered as plain
 * "Step 1" text, only where the sequence is real (the publish flow).
 */
export function StepHeading({
  step,
  title,
  aside,
}: {
  step?: string;
  title: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-hairline pb-3">
      <h2 className="flex items-baseline gap-3 font-display text-headline-sm text-ink">
        {step ? (
          <span className="font-sans text-label-sm text-slate">Step {Number(step)}</span>
        ) : null}
        {title}
      </h2>
      {aside ? <span className="text-body-sm text-slate">{aside}</span> : null}
    </div>
  );
}

/** Solid dot for work that is genuinely in progress (a running check). No ping animation. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex h-2 w-2 shrink-0 rounded-full bg-brand', className)}
    />
  );
}

const NOTICE_VARIANT = {
  info: 'default',
  success: 'success',
  warn: 'warn',
  danger: 'destructive',
} as const;

/** shadcn Alert with an optional title; `role="alert"` only for danger. */
export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: keyof typeof NOTICE_VARIANT;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Alert
      variant={NOTICE_VARIANT[tone]}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={className}
    >
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {children ? <AlertDescription>{children}</AlertDescription> : null}
    </Alert>
  );
}

/** Page title block: optional kicker, serif headline, slate lede. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-3">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="font-display text-headline-lg-mobile text-ink sm:text-headline-lg">
          {title}
        </h1>
        {lede ? <p className="text-body-lg text-slate">{lede}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}

/** Standard page container. */
export function Page({
  children,
  width = 'md',
  className,
}: {
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const max = { sm: 'max-w-md', md: 'max-w-3xl', lg: 'max-w-5xl', xl: 'max-w-7xl' }[width];
  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14',
        max,
        className,
      )}
    >
      {children}
    </main>
  );
}

/** shadcn Checkbox + body text, as one clickable row. */
export function CheckRow({
  checked,
  onChange,
  children,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Label className="flex cursor-pointer items-start gap-3 text-body-sm font-normal text-body">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <span>{children}</span>
    </Label>
  );
}
