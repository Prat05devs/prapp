import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';

const EASE = Easing.out(Easing.cubic);

/**
 * A progress bar that grows from zero to `value` (0–1) and follows later changes. It only ever
 * shows what it is given: never progress the server hasn't reported.
 */
export function GrowBar({
  value,
  color,
  delay = 0,
  className,
}: {
  value: number;
  color: string;
  delay?: number;
  /** the track: height, radius and background */
  className?: string;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(value, { duration: 700, easing: EASE })));
  }, [progress, value, delay]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <View className={cn('h-1.5 overflow-hidden rounded-full bg-elevated', className)}>
      <Animated.View
        style={[{ height: '100%', borderRadius: 999, backgroundColor: color }, fill]}
      />
    </View>
  );
}

/**
 * Segments in proportion to their counts that grow in one after another (the source agreement
 * bar on a report). Segments with a zero count are left out.
 */
export function SegmentBar({
  segments,
  height = 14,
}: {
  segments: { key: string; count: number; color: string }[];
  height?: number;
}) {
  const shown = segments.filter((s) => s.count > 0);
  return (
    <View className="flex-row gap-[3px]" style={{ height }}>
      {shown.map((s, i) => (
        <Segment key={s.key} flex={s.count} color={s.color} delay={150 + i * 150} />
      ))}
    </View>
  );
}

function Segment({ flex, color, delay }: { flex: number; color: string; delay: number }) {
  const grown = useSharedValue(0);
  useEffect(() => {
    grown.set(withDelay(delay, withTiming(1, { duration: 700, easing: EASE })));
  }, [grown, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: grown.get() }] }));
  return (
    <View style={{ flex }} className="overflow-hidden rounded-[4px]">
      <Animated.View
        // grows from the left edge
        style={[{ flex: 1, backgroundColor: color, transformOrigin: 'left' }, style]}
      />
    </View>
  );
}

/** A bar for work of unknown length: a short fill that sweeps across, over and over. */
export function IndeterminateBar({ color }: { color: string }) {
  const [track, setTrack] = useState(0);
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1));
  }, [sweep]);
  const fill = useAnimatedStyle(() => ({
    transform: [{ translateX: -track * 0.35 + sweep.get() * track * 1.35 }],
  }));
  return (
    <View
      accessibilityRole="progressbar"
      className="h-1 overflow-hidden rounded-full bg-elevated"
      onLayout={(e) => setTrack(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[{ width: '35%', height: '100%', borderRadius: 999, backgroundColor: color }, fill]}
      />
    </View>
  );
}
