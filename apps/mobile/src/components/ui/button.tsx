import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform } from 'react-native';
import { PressableScale, type PressableScaleProps } from '@/components/motion/pressable-scale';

// React Native Reusables button (docs/DESIGN.md, same variants as the web app; mobile shape from
// docs/MOBILE-UX.md): 12px radius, ink primary, brand blue for the one main action on a screen.
// Pressed state darkens the fill and the button sinks slightly (docs/DESIGN.md, Motion); filled
// buttons give a light haptic.
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
        accent: 'bg-brand active:bg-brand-deep',
        outline: 'border border-input bg-paper active:border-ink active:bg-subtle',
        secondary: 'bg-elevated active:bg-hairline',
        ghost: 'active:bg-subtle',
        destructive: 'bg-danger active:bg-danger-deep',
        'destructive-outline': 'border border-danger/30 bg-paper active:bg-danger-tint/40',
        link: '',
      },
      size: {
        default: 'h-12 px-5',
        sm: 'h-9 gap-1.5 rounded-md px-3',
        lg: 'h-[52px] px-6',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const buttonTextVariants = cva('font-sans-semibold text-label-md text-ink', {
  variants: {
    variant: {
      default: 'text-white',
      accent: 'text-white',
      outline: 'text-ink',
      secondary: 'text-ink',
      ghost: 'text-body',
      destructive: 'text-white',
      'destructive-outline': 'text-danger',
      link: 'text-brand underline',
    },
    size: {
      default: '',
      sm: 'text-label-sm',
      lg: 'text-[16px]',
      icon: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

type ButtonProps = PressableScaleProps & VariantProps<typeof buttonVariants>;

const FILLED = new Set(['default', 'accent', 'destructive']);

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <PressableScale
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        haptic={FILLED.has(variant ?? 'default') ? 'tap' : false}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
