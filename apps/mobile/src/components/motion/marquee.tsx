import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** Points per second. Slow enough to read a name and tap it. */
const SPEED = 28;

/** Drift from wherever the row is now to the end of a lap, then loop. */
function drift(tx: SharedValue<number>, width: number) {
  const lap = (width / SPEED) * 1000;
  const remaining = ((width + tx.get()) / width) * lap;
  tx.set(
    withSequence(
      withTiming(-width, { duration: remaining, easing: Easing.linear }),
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(-width, { duration: lap, easing: Easing.linear }),
        ),
        -1,
      ),
    ),
  );
}

/**
 * A row that drifts sideways on a loop and bleeds to the screen edges (our publishing network).
 * Touching it stops it so a tile can be tapped. With Reduce Motion on it is a plain
 * horizontal scroller.
 */
export function Marquee({ children, gap = 10 }: { children: ReactNode; gap?: number }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const tx = useSharedValue(0);

  useEffect(() => {
    if (!width || reduced) return;
    tx.set(0);
    drift(tx, width);
    return () => cancelAnimation(tx);
  }, [tx, width, reduced]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }] }));

  if (reduced) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-4"
        contentContainerStyle={{ gap, paddingHorizontal: 16 }}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      className="-mx-4 overflow-hidden"
      onTouchStart={() => cancelAnimation(tx)}
      onTouchEnd={() => width && drift(tx, width)}
      onTouchCancel={() => width && drift(tx, width)}
    >
      <Animated.View style={[{ flexDirection: 'row', paddingLeft: 16 }, style]}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: 'row', gap, paddingRight: gap }}
        >
          {children}
        </View>
        {/* the second copy closes the loop; screen readers read the first only */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', gap, paddingRight: gap }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
