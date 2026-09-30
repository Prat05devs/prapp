import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

// shadcn/ui badge as the Stitch status pill: mono caps, tinted planes.
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-0.5 font-mono text-[11px] leading-4 font-medium tracking-wide whitespace-nowrap uppercase [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'border-hairline bg-elevated text-slate',
        emerald: 'border-emerald/30 bg-emerald-tint text-emerald-deep',
        danger: 'border-danger/20 bg-danger-tint text-danger-deep',
        warn: 'border-warn/25 bg-warn-tint text-warn-deep',
        ink: 'border-ink bg-ink text-white',
        outline: 'border-hairline bg-background text-ink',
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
