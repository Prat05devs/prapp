import { cssInterop } from 'nativewind';
import type { ComponentProps } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptics, type HapticKind } from '@/lib/haptics';

// NativeWind resolves className on this thin wrapper; the animated style travels in its own prop
// so NativeWind never merges it. (Registering the Reanimated component itself makes NativeWind
// flatten the animated style together with the classes on native, and all of it is lost.)
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScalePressable({
  style,
  animatedStyle,
  ...props
}: Omit<ComponentProps<typeof Pressable>, 'style' | 'ref'> & {
  ref?: ComponentProps<typeof AnimatedPressable>['ref'];
  style?: StyleProp<ViewStyle>;
  animatedStyle: ComponentProps<typeof AnimatedPressable>['style'];
}) {
  return <AnimatedPressable {...props} style={[style, animatedStyle]} />;
}
cssInterop(ScalePressable, { className: 'style' });

/** Press feedback (docs/DESIGN.md, Motion): quick to sink, a little spring on release. */
const PRESS_SPRING = { damping: 18, stiffness: 380, mass: 0.6 } as const;

export type PressableScaleProps = Omit<ComponentProps<typeof Pressable>, 'style' | 'ref'> & {
  ref?: ComponentProps<typeof AnimatedPressable>['ref'];
  style?: StyleProp<ViewStyle>;
  /** scale while pressed; rows that span the screen use a smaller change */
  scaleTo?: number;
  /** haptic on press; off by default so lists of links stay quiet */
  haptic?: HapticKind | false;
};

/**
 * A Pressable that sinks slightly under the finger and springs back. Drop-in for Pressable:
 * same props and className, plus `scaleTo` and `haptic`.
 */
export function PressableScale({
  scaleTo = 0.97,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  style,
  disabled,
  ...props
}: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, scaleTo]) }],
  }));

  return (
    <ScalePressable
      {...props}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        pressed.set(withSpring(1, PRESS_SPRING));
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        pressed.set(withSpring(0, PRESS_SPRING));
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={style}
      animatedStyle={animated}
    />
  );
}
