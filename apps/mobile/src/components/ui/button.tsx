import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

// React Native Reusables button, restyled to the Stitch spec (same variants as the web app):
// 8px radius, obsidian primary, emerald accent for the main action, hairline outline.
const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-lg',
    Platform.select({
      web: 'whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none',
    }),
  ),
  {
    variants: {
      variant: {
        default: 'bg-ink active:bg-ink-soft',
        accent: 'bg-emerald-strong active:bg-emerald-deep',
        outline: 'border border-hairline bg-background active:border-ink active:bg-subtle',
        secondary: 'bg-elevated active:bg-hairline',
        ghost: 'active:bg-subtle',
        destructive: 'bg-danger active:bg-danger-deep',
        'destructive-outline': 'border border-danger/30 bg-background active:bg-danger-tint/40',
        link: '',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-9 gap-1.5 px-3',
        lg: 'h-12 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const buttonTextVariants = cva('font-sans-medium text-label-md text-ink', {
  variants: {
    variant: {
      default: 'text-white',
      accent: 'text-white',
      outline: 'text-ink',
      secondary: 'text-ink',
      ghost: 'text-body',
      destructive: 'text-white',
      'destructive-outline': 'text-danger',
      link: 'text-emerald-strong group-active:underline',
    },
    size: {
      default: '',
      sm: 'text-label-sm',
      lg: '',
      icon: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
