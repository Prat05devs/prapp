import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';

// Status label (docs/DESIGN.md): sentence case, sans, small. Tones only for real states.
const badgeVariants = cva(
  'shrink-0 flex-row items-center justify-center gap-1.5 self-start overflow-hidden rounded-sm border px-1.5 py-px',
  {
    variants: {
      variant: {
        neutral: 'border-hairline bg-subtle',
        verified: 'border-verified/25 bg-verified-tint',
        danger: 'border-danger/20 bg-danger-tint',
        warn: 'border-warn/25 bg-warn-tint',
        ink: 'border-ink bg-ink',
        outline: 'border-input bg-paper',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

const badgeTextVariants = cva('font-sans-semibold text-label-sm', {
  variants: {
    variant: {
      neutral: 'text-body',
      verified: 'text-verified-deep',
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
