import {
  ArrowUpRight,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  RefreshControl,
  ScrollView,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Enter, Pop } from '@/components/motion/enter';
import { PressableScale } from '@/components/motion/pressable-scale';
import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button, type ButtonProps } from './button';
import { Checkbox } from './checkbox';
import { Icon } from './icon';
import { Input } from './input';
import { Text } from './text';
import { Textarea } from './textarea';

// App-level building blocks for the mobile app (docs/MOBILE-UX.md on top of docs/DESIGN.md),
// composed from the React Native Reusables components in this folder.

export { Badge } from './badge';
export { Button } from './button';
export { Icon } from './icon';
export { Input } from './input';
export { RadioGroup, RadioGroupItem } from './radio-group';
export { Separator } from './separator';
export { Text } from './text';

type ScrollProps = {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** pinned under the scroll: the screen's main action (see BottomBar) */
  footer?: ReactNode;
  /** add the home-indicator inset under the footer (screens outside the tab bar) */
  footerInset?: boolean;
  /** fade each top-level child in, one after another, when the screen mounts (default on) */
  animateIn?: boolean;
  /**
   * A tab's own header, drawn in the scroll right under the status bar (docs/MOBILE-UX.md). Use it
   * on tab roots whose native header is hidden (TAB_ROOT): it replaces the large-title bar.
   */
  header?: ScreenHeaderProps;
};

type ScreenHeaderProps = {
  title: string;
  /** a short line above the title ("Namaste, Prateek") */
  kicker?: string;
  /** a sentence under the title */
  lede?: string;
  /** buttons on the right of the title row */
  right?: ReactNode;
};

/** Compact tab header: kicker, serif title and actions on one row, then an optional lede. */
function ScreenHeader({ title, kicker, lede, right }: ScreenHeaderProps) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-0.5">
          {kicker ? <Text className="text-[14px] text-slate">{kicker}</Text> : null}
          <Text
            accessibilityRole="header"
            className="font-display-bold text-[30px] leading-9 tracking-[-0.3px] text-ink"
          >
            {title}
          </Text>
        </View>
        {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
      </View>
      {lede ? <Text className="text-body-md text-body">{lede}</Text> : null}
    </View>
  );
}

/** Wraps each child in an entrance, keyed by its place so siblings that come and go don't replay. */
function staggered(children: ReactNode) {
  return Children.toArray(children).map((child, i) => (
    <Enter key={isValidElement(child) ? (child.key ?? i) : i} index={i}>
      {child}
    </Enter>
  ));
}

/**
 * A screen under a native stack header. The ScrollView comes first so the iOS large title
 * collapses on scroll; the footer stays above the keyboard and the tab bar.
 */
export function ScrollScreen({
  children,
  refreshing,
  onRefresh,
  footer,
  footerInset,
  animateIn = true,
  header,
}: ScrollProps) {
  const insets = useSafeAreaInsets();
  const content = header ? [<ScreenHeader key="header" {...header} />, children] : children;
  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1 bg-canvas"
        contentInsetAdjustmentBehavior={header ? 'never' : 'automatic'}
        style={header ? { marginTop: insets.top } : undefined}
        contentContainerClassName={header ? 'gap-6 px-4 pb-10 pt-2' : 'gap-7 px-4 pb-10 pt-3'}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
        {animateIn ? staggered(content) : content}
      </ScrollView>
      {footer ? <BottomBar inset={footerInset}>{footer}</BottomBar> : null}
    </KeyboardAvoidingView>
  );
}

/** Bar pinned to the bottom of a screen for its main action, within thumb reach. */
function BottomBar({ children, inset }: { children: ReactNode; inset?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="border-t border-rule bg-paper px-4 pt-3"
      style={{ paddingBottom: inset ? Math.max(insets.bottom, 12) : 12 }}
    >
      <Enter index={2} style={{ gap: 8 }}>
        {children}
      </Enter>
    </View>
  );
}

/** Full-screen modal page (sign in, profile setup): its own safe area, no navigation bar. */
export function ModalScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-canvas">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-5 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
        {footer ? <View className="gap-2 px-5 pb-2 pt-3">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-4 bg-canvas p-6">{children}</View>;
}

/** Serif title block for modal pages, where there is no navigation bar to carry the title. */
export function ModalTitle({ title, lede }: { title: ReactNode; lede?: ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="h1">{title}</Text>
      {lede ? <Text className="text-body-md text-body">{lede}</Text> : null}
    </View>
  );
}

/** Round icon button for the navigation bar (bell, new, help). */
export function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      scaleTo={0.88}
      haptic="tap"
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full active:bg-elevated"
    >
      <Icon as={icon} size={22} className="text-ink" />
    </PressableScale>
  );
}

/**
 * A block of content with a short sentence-case label above it (and an optional action on the
 * right) and an optional note below, like a settings section.
 */
export function Section({
  title,
  action,
  footer,
  children,
}: {
  title?: string;
  action?: { label: string; onPress: () => void };
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      {title || action ? (
        <View className="min-h-6 flex-row items-end justify-between px-1">
          {title ? (
            <Text accessibilityRole="header" className="font-sans-semibold text-[15px] text-ink">
              {title}
            </Text>
          ) : null}
          {action ? (
            <PressableScale
              accessibilityRole="button"
              hitSlop={10}
              scaleTo={0.92}
              onPress={action.onPress}
            >
              <Text className="font-sans-semibold text-label-sm text-brand">{action.label}</Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
      {children}
      {footer ? <Text className="px-1 text-label-sm text-slate">{footer}</Text> : null}
    </View>
  );
}

/** A white sheet on the canvas for free-form content (forms, a summary). */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn('gap-4 rounded-lg border border-hairline bg-paper p-4', className)}>
      {children}
    </View>
  );
}

/** Rounded group of rows separated by inset hairlines. */
export function Group({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="overflow-hidden rounded-lg border border-hairline bg-paper">
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View className="ml-4 h-px bg-divider" /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * A row in a Group: optional icon, label (+ subtitle), value on the right, and a chevron when it
 * navigates (or an arrow when it leaves the app). Without onPress it's a read-only row.
 */
export function Row({
  icon,
  iconColor,
  label,
  subtitle,
  value,
  mono,
  trailing,
  onPress,
  external,
  destructive,
  disabled,
}: {
  icon?: LucideIcon;
  /** a meaningful colour for the icon (a verdict); slate otherwise */
  iconColor?: string;
  label: string;
  subtitle?: string;
  value?: string;
  /** set the value in the data font (order numbers, URLs) */
  mono?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  external?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const Glyph = icon;
  const content = (
    <>
      {Glyph && iconColor ? <Glyph size={20} color={iconColor} /> : null}
      {Glyph && !iconColor ? (
        <Icon as={Glyph} size={20} className={destructive ? 'text-danger' : 'text-slate'} />
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text
          className={cn(
            'font-sans-medium text-[16px] leading-[22px]',
            destructive ? 'text-danger' : 'text-ink',
          )}
        >
          {label}
        </Text>
        {subtitle ? <Text className="text-label-sm text-slate">{subtitle}</Text> : null}
      </View>
      {value ? (
        <Text
          numberOfLines={1}
          className={cn(
            'max-w-[58%] text-right',
            mono ? 'font-mono text-code text-body' : 'text-[15px] text-slate',
          )}
        >
          {value}
        </Text>
      ) : null}
      {trailing}
      {onPress && !destructive ? (
        <Icon as={external ? ArrowUpRight : ChevronRight} size={18} className="text-faint" />
      ) : null}
    </>
  );
  const className = cn(
    'min-h-[52px] flex-row items-center gap-3 px-4 py-3',
    disabled && 'opacity-50',
  );
  return onPress ? (
    <PressableScale
      accessibilityRole={external ? 'link' : 'button'}
      disabled={disabled}
      scaleTo={0.985}
      onPress={onPress}
      className={cn(className, 'active:bg-subtle')}
    >
      {content}
    </PressableScale>
  ) : (
    <View className={className}>{content}</View>
  );
}

/** iOS-style segmented control: the selected thumb slides between options with a spring. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(
    options.findIndex((o) => o.value === value),
    0,
  );
  const segment = width / options.length;
  const x = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (!segment) return;
    // Jump into place on first layout; slide after that.
    x.set(placed.current ? withSpring(index * segment, SEGMENT_SPRING) : index * segment);
    placed.current = true;
  }, [x, index, segment]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-md bg-elevated p-1"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}
    >
      {segment ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: 4,
              width: segment,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.hairline,
              backgroundColor: COLORS.paper,
            },
            thumb,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            scaleTo={0.95}
            onPress={() => {
              if (!selected) haptics.select();
              onChange(o.value);
            }}
            className="h-9 flex-1 flex-row items-center justify-center gap-1.5"
          >
            {o.icon ? (
              <Icon as={o.icon} size={15} className={selected ? 'text-ink' : 'text-slate'} />
            ) : null}
            <Text
              className={cn(
                'font-sans-semibold text-label-sm',
                selected ? 'text-ink' : 'text-slate',
              )}
            >
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const SEGMENT_SPRING = { damping: 20, stiffness: 260, mass: 0.8 } as const;

/** Centred state for an empty list or a gated screen: icon, title, line of text, actions. */
export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <View className="items-center gap-4 px-4 py-12">
      <Pop delay={120} bounce={14}>
        <View className="h-16 w-16 items-center justify-center rounded-full bg-elevated">
          <Icon as={icon} size={28} className="text-slate" />
        </View>
      </Pop>
      <View className="items-center gap-1.5">
        <Text className="text-center font-display text-headline-sm text-ink">{title}</Text>
        {body ? <Text className="text-center text-body-md text-slate">{body}</Text> : null}
      </View>
      {children ? <View className="w-full gap-2 pt-2">{children}</View> : null}
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
        <ActivityIndicator color={light ? COLORS.paper : COLORS.ink} />
      ) : (
        <>
          {leading}
          <Text>{title}</Text>
          {icon ? <Icon as={icon} size={18} /> : null}
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
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="font-sans-semibold text-label-md text-ink">{label}</Text>
        {aside ? (
          <Text
            className={cn('text-label-sm tabular-nums', asideOk ? 'text-verified' : 'text-slate')}
          >
            {aside}
          </Text>
        ) : null}
      </View>
      {multiline ? (
        <Textarea className={cn(error && 'border-danger', className)} {...props} />
      ) : (
        <Input className={cn(error && 'border-danger', className)} {...props} />
      )}
      {hint ? <Text className="text-label-sm text-slate">{hint}</Text> : null}
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
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      scaleTo={0.985}
      haptic="select"
      onPress={() => onChange(!checked)}
      className="flex-row items-start gap-3 py-1"
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-0.5"
      />
      <Text className="flex-1 text-body-sm text-body">{children}</Text>
    </PressableScale>
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
