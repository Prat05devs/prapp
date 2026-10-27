import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** Entrances (docs/DESIGN.md, Motion): fade in and rise, 50 ms apart, the first 8 only. */
const STAGGER_MS = 50;
const MAX_STAGGERED = 8;
const RISE = 12;

// Driven by shared values rather than Reanimated layout animations ("entering"), which take
// views out of the layout while they run on web and leave nothing to animate on re-render.

/**
 * Fades its children in and up when it mounts. Nothing moves when the system's Reduce Motion
 * setting is on.
 */
export function Enter({
  index = 0,
  delay,
  children,
  style,
}: {
  index?: number;
  /** ms before it starts; defaults to the stagger for `index` */
  delay?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    shown.set(
      withDelay(
        delay ?? Math.min(index, MAX_STAGGERED) * STAGGER_MS,
        withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [shown, index, delay]);
  const animated = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: (1 - shown.get()) * RISE }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Pops its children in from nothing with a little overshoot: badges, step numbers, verdicts. */
export function Pop({
  delay = 0,
  from = 0,
  bounce = 12,
  children,
  style,
}: {
  delay?: number;
  /** starting scale; 0.94 for a large panel that should settle rather than pop */
  from?: number;
  /** spring damping: lower overshoots more */
  bounce?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    shown.set(withDelay(delay, withSpring(1, { damping: bounce, stiffness: 220, mass: 0.8 })));
  }, [shown, delay, bounce]);
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(shown.get() * 2, 1),
    transform: [{ scale: from + (1 - from) * shown.get() }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
