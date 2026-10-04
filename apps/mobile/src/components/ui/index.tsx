import { router } from 'expo-router';
import {
  ArrowRight,
  Bell,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { Children, Fragment, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_NAME } from '@prapp/shared';
import { promptSignIn } from '@/lib/sign-in-prompt';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button, type ButtonProps } from './button';
import { Checkbox } from './checkbox';
import { Icon } from './icon';
import { Input } from './input';
import { Text } from './text';
import { Textarea } from './textarea';

// App-level building blocks for the NewsVio design system (docs/DESIGN.md), composed from the
// React Native Reusables (shadcn for React Native) components in this folder.

export { Badge } from './badge';
export { Button } from './button';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
export { Checkbox } from './checkbox';
export { Icon } from './icon';
export { Input } from './input';
export { Label } from './label';
export { RadioGroup, RadioGroupItem } from './radio-group';
export { Separator } from './separator';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Text } from './text';
export { Textarea } from './textarea';
export { Alert, AlertDescription, AlertTitle } from './alert';

/** Top bar: serif wordmark + notifications bell (or "Log in" for guests). */
export function AppBar() {
  const { session } = useAuth();
  return (
    <View className="flex-row items-center justify-between border-b border-rule bg-canvas px-5 py-3">
      <Text className="font-display-bold text-[20px] leading-6 text-ink">{BRAND_NAME}</Text>
      {!session ? (
        <Button variant="ghost" size="sm" onPress={() => promptSignIn()}>
          <Text>Log in</Text>
        </Button>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={8}
          onPress={() => router.push('/notifications')}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-subtle"
        >
          <Icon as={Bell} size={20} className="text-ink" />
        </Pressable>
      )}
    </View>
  );
}

/** A tab root: safe area, the app bar, then scrolling content. */
export function TabScreen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <AppBar />
      <ScrollBody refreshing={refreshing} onRefresh={onRefresh}>
        {children}
      </ScrollBody>
    </View>
  );
}

/** Scrolling content for screens under a native stack header. */
export function ScrollScreen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <ScrollBody refreshing={refreshing} onRefresh={onRefresh}>
      {children}
    </ScrollBody>
  );
}

function ScrollBody({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 px-5 pb-12 pt-6"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={COLORS.slate}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Full-screen, safe-area page for flows outside the tabs (sign in, profile setup). */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-12 pt-8"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-4 bg-canvas p-6">{children}</View>;
}

/** Short sentence-case kicker above a heading. Use only when it adds information. */
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
    <Text variant="eyebrow" className={cn(accent && 'text-brand', className)}>
      {children}
    </Text>
  );
}

/** Screen title block: optional kicker, serif headline, lede. */
export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <View className="gap-2">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Text variant="h1">{title}</Text>
      {lede ? <Text variant="lead">{lede}</Text> : null}
    </View>
  );
}

/** Section heading with a hairline underneath and an optional note on the right. */
export function StepHeading({
  title,
  aside,
}: {
  /** kept for call sites; the publish progress bar already shows the step */
  step?: string;
  title: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <View className="flex-row items-baseline justify-between gap-3 border-b border-rule pb-3">
      <Text variant="h3">{title}</Text>
      {aside ? <Text variant="muted">{aside}</Text> : null}
    </View>
  );
}

/** Plain serif heading inside reports. `index` is ignored (no decorative numbering). */
export function SectionTitle({ children }: { index?: string; children: ReactNode }) {
  return <Text variant="h3">{children}</Text>;
}

/** Flat card: a white sheet on the paper canvas (or a tinted plane), 10px radius, no shadow. */
export function Panel({
  children,
  tone = 'canvas',
  className,
}: {
  children: ReactNode;
  tone?: 'canvas' | 'subtle';
  className?: string;
}) {
  return (
    <View
      className={cn(
        'gap-4 rounded-xl border p-5',
        tone === 'subtle' ? 'border-transparent bg-subtle' : 'border-hairline bg-paper',
        className,
      )}
    >
      {children}
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  return children ? (
    <Text accessibilityRole="alert" className="text-body-sm text-danger">
      {children}
    </Text>
  ) : null;
}

/** Button with a text label, optional trailing icon and a loading state. */
export function ActionButton({
  title,
  icon,
  leading,
  loading,
  disabled,
  variant = 'default',
  size = 'lg',
  className,
  ...props
}: Omit<ButtonProps, 'children'> & {
  title: string;
  icon?: LucideIcon;
  /** shown before the title, e.g. a brand mark */
  leading?: ReactNode;
  loading?: boolean;
}) {
  const light = variant === 'default' || variant === 'accent' || variant === 'destructive';
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={light ? '#ffffff' : COLORS.ink} />
      ) : (
        <>
          {leading}
          <Text>{title}</Text>
          {icon ? <Icon as={icon} size={16} /> : null}
        </>
      )}
    </Button>
  );
}

/** Label + input (or textarea) + hint/error, with an optional counter on the right. */
export function Field({
  label,
  error,
  hint,
  aside,
  asideOk,
  multiline,
  className,
  ...props
}: TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  aside?: string;
  asideOk?: boolean;
  className?: string;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text variant="label">{label}</Text>
        {aside ? (
          <Text className={cn('text-body-sm', asideOk ? 'text-verified' : 'text-slate')}>
            {aside}
          </Text>
        ) : null}
      </View>
      {multiline ? (
        <Textarea className={className} {...props} />
      ) : (
        <Input className={className} {...props} />
      )}
      {hint ? <Text variant="muted">{hint}</Text> : null}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

/** Checkbox + body text as one pressable row. */
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
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      className="flex-row items-start gap-3"
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-0.5"
      />
      <Text className="flex-1 text-body-sm text-body">{children}</Text>
    </Pressable>
  );
}

const NOTICE = {
  info: { variant: 'default', icon: Info },
  success: { variant: 'success', icon: CircleCheck },
  warn: { variant: 'warn', icon: TriangleAlert },
  danger: { variant: 'destructive', icon: CircleAlert },
} as const;

/** Reusables Alert with a semantic tone and matching icon. */
export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: keyof typeof NOTICE;
  title?: string;
  children?: ReactNode;
}) {
  const n = NOTICE[tone];
  return (
    <Alert variant={n.variant} icon={n.icon}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {children ? <AlertDescription>{children}</AlertDescription> : null}
    </Alert>
  );
}

/** Solid dot for work that is genuinely in progress (a running check). */
export function LiveDot() {
  return <View className="h-2 w-2 rounded-full bg-brand" />;
}

/** Settings-style row: icon, label, optional detail, chevron. */
export function ListRow({
  icon,
  label,
  detail,
  onPress,
  destructive,
}: {
  icon?: LucideIcon;
  label: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3.5 active:bg-subtle"
    >
      {icon ? (
        <Icon as={icon} size={18} className={destructive ? 'text-danger' : 'text-slate'} />
      ) : null}
      <Text
        className={cn(
          'flex-1 font-sans-semibold text-label-md',
          destructive ? 'text-danger' : 'text-ink',
        )}
      >
        {label}
      </Text>
      {detail ? <Text className="text-body-sm text-slate">{detail}</Text> : null}
      <Icon as={destructive ? ArrowRight : ChevronRight} size={16} className="text-faint" />
    </Pressable>
  );
}

/** Rounded group of rows separated by hairlines. */
export function ListGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="overflow-hidden rounded-xl border border-hairline bg-paper">
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View className="h-px bg-divider" /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}
