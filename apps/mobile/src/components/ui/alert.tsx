import { Icon } from '@/components/ui/icon';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

// React Native Reusables alert with semantic tones (same as the web Notice).
const alertVariants = cva('relative w-full rounded-md border p-4', {
  variants: {
    variant: {
      default: 'border-hairline bg-subtle',
      success: 'border-verified/25 bg-verified-tint',
      warn: 'border-warn/25 bg-warn-tint',
      destructive: 'border-danger/20 bg-danger-tint/60',
    },
  },
  defaultVariants: { variant: 'default' },
});

const alertTextVariants = cva('text-body-sm', {
  variants: {
    variant: {
      default: 'text-ink',
      success: 'text-verified-deep',
      warn: 'text-warn-deep',
      destructive: 'text-danger-deep',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({
  className,
  variant,
  children,
  icon,
  iconClassName,
  ...props
}: React.ComponentProps<typeof View> &
  React.RefAttributes<View> &
  VariantProps<typeof alertVariants> & {
    icon?: LucideIcon;
    iconClassName?: string;
  }) {
  return (
    <TextClassContext.Provider value={alertTextVariants({ variant })}>
      <View role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
        {icon ? (
          <View className="absolute left-4 top-4">
            <Icon as={icon} size={16} className={iconClassName} />
          </View>
        ) : null}
        <View className={cn('gap-1', icon && 'pl-6')}>{children}</View>
      </View>
    </TextClassContext.Provider>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('font-sans-semibold text-label-md', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-body-sm', className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
