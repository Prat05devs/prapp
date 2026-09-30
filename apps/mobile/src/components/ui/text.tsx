import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

// React Native Reusables Text with the Stitch type scale: Manrope headings, Inter body,
// JetBrains Mono micro-labels. Custom fonts carry their weight in the family name.
const textVariants = cva(
  cn(
    'font-sans text-body-md text-ink',
    Platform.select({
      web: 'select-text',
    }),
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: 'font-display-bold text-display-mobile text-ink',
        h2: 'font-display text-headline-lg-mobile text-ink',
        h3: 'font-display text-headline-sm text-ink',
        h4: 'font-sans-semibold text-body-lg text-ink',
        p: 'text-body-md text-body',
        blockquote: 'border-l-2 border-hairline pl-3 font-display text-headline-sm text-ink',
        code: 'font-mono text-code text-slate',
        lead: 'text-body-lg text-slate',
        large: 'font-sans-semibold text-body-lg',
        small: 'font-sans-medium text-label-md',
        muted: 'text-body-sm text-slate',
        label: 'font-sans-medium text-label-md text-ink',
        eyebrow: 'font-mono text-label-sm uppercase tracking-wider text-slate',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, TextClassContext };
