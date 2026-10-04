import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

// shadcn/ui button (docs/DESIGN.md): 6px radius, ink primary, brand blue for the one main
// action on a screen, hairline outline that darkens on hover. No scale or glow on press.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-ink-soft',
        accent: 'bg-brand text-white hover:bg-brand-deep',
        outline: 'border border-input bg-paper text-ink hover:border-ink',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-body hover:bg-subtle hover:text-ink',
        destructive: 'bg-destructive text-white hover:bg-danger-deep',
        'destructive-outline':
          'border border-destructive/30 bg-background text-destructive hover:border-destructive hover:bg-danger-tint/40',
        link: 'text-brand underline underline-offset-4 decoration-brand-soft hover:decoration-brand',
      },
      size: {
        default: 'h-10 px-4 text-label-md',
        xs: 'h-6 gap-1 px-2 text-xs',
        sm: 'h-8 gap-1.5 px-3 text-label-sm',
        lg: 'h-12 px-6 text-label-md',
        icon: 'size-10',
        'icon-sm': 'size-8',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
