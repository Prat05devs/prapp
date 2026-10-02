import { router } from 'expo-router';
import {
  ArrowRight,
  Bell,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  ShieldCheck,
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
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button, type ButtonProps } from './button';
import { Checkbox } from './checkbox';
import { Icon } from './icon';
import { Input } from './input';
import { Text } from './text';
import { Textarea } from './textarea';

// App-level building blocks for the Stitch design system, composed from the
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

/** Stitch mobile top bar: wordmark + notifications bell. */
export function AppBar() {
  return (
    <View className="flex-row items-center justify-between border-b border-hairline bg-canvas px-5 py-3">
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-ink">
          <Icon as={ShieldCheck} size={18} className="text-white" />
        </View>
        <View>
          <Text className="font-display-bold text-[17px] leading-5 text-ink">{BRAND_NAME}</Text>
          <Text className="font-mono text-[10px] uppercase leading-3 tracking-wider text-faint">
            Fact check · Publish
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={8}
        onPress={() => router.push('/notifications')}
        className="h-10 w-10 items-center justify-center rounded-full border border-hairline active:bg-subtle"
      >
        <Icon as={Bell} size={18} className="text-ink" />
      </Pressable>
    </View>
  );
}

/** A tab root: safe area, the Stitch app bar, then scrolling content. */
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

/** Mono micro-label, e.g. "01 / Paste the forward". */
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
    <Text variant="eyebrow" className={cn(accent && 'text-emerald-strong', className)}>
      {children}
    </Text>
  );
}

/** Screen title block: eyebrow, Manrope headline, slate lede. */
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

/** Numbered section heading: [01] Title … aside. */
export function StepHeading({
  step,
  title,
  aside,
}: {
  step: string;
  title: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-2.5">
        <View className="rounded-md bg-ink px-1.5 py-0.5">
          <Text className="font-mono text-code text-white">{step}</Text>
        </View>
        <Text variant="h3">{title}</Text>
      </View>
      {aside ? <Eyebrow>{aside}</Eyebrow> : null}
    </View>
  );
}

/** "01 / Title" heading used inside reports. */
export function SectionTitle({ index, children }: { index: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-2">
      <Eyebrow accent>{index}</Eyebrow>
      <Text className="text-xs text-faint">/</Text>
      <Text variant="h3">{children}</Text>
    </View>
  );
}

/** Flat Stitch card: hairline border, 16px radius, canvas or subtle plane. */
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
        'gap-4 rounded-2xl border border-hairline p-5',
        tone === 'subtle' ? 'bg-subtle' : 'bg-canvas',
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

/** Label + input (or textarea) + hint/error, with an optional mono counter on the right. */
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
          <Text
            className={cn(
              'font-mono text-code uppercase',
              asideOk ? 'text-emerald-strong' : 'text-slate',
            )}
          >
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

/** Reusables Alert with a Stitch tone and matching icon. */
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

/** Emerald dot, as in the Stitch live pills. */
export function LiveDot() {
  return <View className="h-2 w-2 rounded-full bg-emerald" />;
}

export function LivePill({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-2 self-start rounded-full border border-hairline bg-subtle px-3 py-1">
      <LiveDot />
      <Text className="font-mono text-label-sm uppercase tracking-wider text-ink">{children}</Text>
    </View>
  );
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
          'flex-1 font-sans-medium text-label-md',
          destructive ? 'text-danger' : 'text-ink',
        )}
      >
        {label}
      </Text>
      {detail ? <Text className="font-mono text-code text-slate">{detail}</Text> : null}
      <Icon as={destructive ? ArrowRight : ChevronRight} size={16} className="text-faint" />
    </Pressable>
  );
}

/** Rounded group of rows separated by hairlines. */
export function ListGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="overflow-hidden rounded-2xl border border-hairline bg-canvas">
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View className="h-px bg-divider" /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}
