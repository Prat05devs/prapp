import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

// Status label (docs/DESIGN.md): sentence case, sans, small. Tones only for real states.
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm border px-1.5 py-px text-label-sm whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'border-hairline bg-subtle text-body',
        verified: 'border-verified/25 bg-verified-tint text-verified-deep',
        danger: 'border-danger/20 bg-danger-tint text-danger-deep',
        warn: 'border-warn/25 bg-warn-tint text-warn-deep',
        ink: 'border-ink bg-ink text-white',
        outline: 'border-input bg-paper text-ink',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

function Badge({
  className,
  variant = 'neutral',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
