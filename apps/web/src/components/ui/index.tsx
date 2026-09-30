import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Badge, type badgeVariants } from './badge';
import { Card as ShadcnCard } from './card';
import { Checkbox } from './checkbox';
import { Label } from './label';
import type { VariantProps } from 'class-variance-authority';

// App-level building blocks for the Stitch design system (Obsidian & Emerald Minimalist),
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

/** Label + control + hint/error, with an optional mono counter on the right. */
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
        {aside ? <span className="font-mono text-code text-slate uppercase">{aside}</span> : null}
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

/** Flat card: white (or subtle) plane with a hairline border, no shadow. */
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
        'block gap-0 rounded-2xl border-hairline p-5 shadow-none sm:p-6',
        tone === 'subtle' ? 'bg-subtle' : 'bg-card',
        className,
      )}
    >
      {children}
    </ShadcnCard>
  );
}

/** Mono micro-label, e.g. "01 / Paste the forward". */
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
    <span
      className={cn(
        'font-mono text-label-sm tracking-wider uppercase',
        accent ? 'text-emerald-strong' : 'text-slate',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Numbered section heading used across Stitch screens: [01] Title. */
export function StepHeading({
  step,
  title,
  aside,
}: {
  step: string;
  title: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 font-display text-headline-sm text-ink">
        <Badge variant="ink" className="rounded-md px-1.5 text-code tracking-normal">
          {step}
        </Badge>
        {title}
      </h2>
      {aside ? <Eyebrow>{aside}</Eyebrow> : null}
    </div>
  );
}

/** Emerald dot with a soft ping ring. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-2 w-2', className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
    </span>
  );
}

/** Pill with a live dot, used for hero kickers. */
export function LivePill({ children }: { children: ReactNode }) {
  return (
    <Badge variant="outline" className="gap-2 bg-subtle px-3 py-1 text-label-sm tracking-wider">
      <LiveDot />
      {children}
    </Badge>
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

/** Page title block: mono eyebrow, Manrope headline, slate lede. */
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
