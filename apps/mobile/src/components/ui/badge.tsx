import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';

// React Native Reusables badge as the Stitch status pill: mono caps on tinted planes.
const badgeVariants = cva(
  'shrink-0 flex-row items-center justify-center gap-1.5 self-start overflow-hidden rounded-full border px-2.5 py-0.5',
  {
    variants: {
      variant: {
        neutral: 'border-hairline bg-elevated',
        emerald: 'border-emerald/30 bg-emerald-tint',
        danger: 'border-danger/20 bg-danger-tint',
        warn: 'border-warn/25 bg-warn-tint',
        ink: 'border-ink bg-ink',
        outline: 'border-hairline bg-background',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

const badgeTextVariants = cva('font-mono text-[11px] uppercase leading-4 tracking-wide', {
  variants: {
    variant: {
      neutral: 'text-slate',
      emerald: 'text-emerald-deep',
      danger: 'text-danger-deep',
      warn: 'text-warn-deep',
      ink: 'text-white',
      outline: 'text-ink',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

type BadgeProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    asChild?: boolean;
  } & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
  const Component = asChild ? Slot : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
