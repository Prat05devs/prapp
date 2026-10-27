import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui';
import { COLORS } from '@/lib/theme';

const SIZE = 240;
/** where each source chip sits on the orbit, in degrees from the top */
const ANGLES = [0, 90, 180, 270];

/**
 * The fact check at work: a page being scanned while the places we look circle it. It is
 * deliberately indeterminate: the API reports "checking" or "done", not which step it is on.
 */
export function ScanOrb({ sources }: { sources: string[] }) {
  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);
  const scan = useSharedValue(0);

  useEffect(() => {
    spin.set(withRepeat(withTiming(360, { duration: 18_000, easing: Easing.linear }), -1));
    breathe.set(
      withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    scan.set(
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [spin, breathe, scan]);

  const orbit = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  const outer = useAnimatedStyle(() => ({
    opacity: 0.9 - breathe.get() * 0.45,
    transform: [{ scale: 1 + breathe.get() * 0.04 }],
  }));
  const inner = useAnimatedStyle(() => ({
    opacity: 0.45 + breathe.get() * 0.45,
    transform: [{ scale: 1.04 - breathe.get() * 0.04 }],
  }));
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: scan.get() * 84 }] }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Checking"
      style={{
        width: SIZE,
        height: SIZE,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={[ring(SIZE - 4), outer]} />
      <Animated.View style={[ring(SIZE - 72), inner]} />
      <Animated.View style={[{ position: 'absolute', width: SIZE, height: SIZE }, orbit]}>
        {sources.slice(0, ANGLES.length).map((label, i) => (
          <OrbitChip key={label} label={label} angle={ANGLES[i]} spin={spin} />
        ))}
      </Animated.View>
      <View className="h-[108px] w-[84px] gap-[7px] overflow-hidden rounded-md border border-input bg-paper px-2.5 py-3.5">
        {[90, 70, 80, 55, 75].map((w, i) => (
          <View key={i} className="h-[5px] rounded-full bg-elevated" style={{ width: `${w}%` }} />
        ))}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 6,
              right: 6,
              top: 10,
              height: 2,
              borderRadius: 1,
              backgroundColor: COLORS.brand,
            },
            line,
          ]}
        />
      </View>
    </View>
  );
}

function ring(size: number) {
  return {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  };
}

/** A chip on the orbit that turns back against the spin so its label stays upright. */
function OrbitChip({
  label,
  angle,
  spin,
}: {
  label: string;
  angle: number;
  spin: SharedValue<number>;
}) {
  const r = SIZE / 2 - 14;
  const rad = (angle * Math.PI) / 180;
  const upright = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.get()}deg` }] }));
  return (
    <View
      style={{
        position: 'absolute',
        left: SIZE / 2 + r * Math.sin(rad),
        top: SIZE / 2 - r * Math.cos(rad),
        width: 0,
        height: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={[{ position: 'absolute', width: 120, alignItems: 'center' }, upright]}>
        <View className="rounded-full border border-hairline bg-paper px-2.5 py-1">
          <Text className="font-sans-semibold text-[12px] text-ink">{label}</Text>
        </View>
      </Animated.View>
    </View>
  );
}
