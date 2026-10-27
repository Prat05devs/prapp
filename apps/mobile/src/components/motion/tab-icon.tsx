import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '@/lib/theme';

/**
 * Tab bar icon: when its tab becomes active a soft pill grows behind it and the glyph gives a
 * small spring, so the switch is felt as well as seen.
 */
export function TabIcon({
  glyph: Glyph,
  color,
  focused,
}: {
  glyph: LucideIcon;
  color: string;
  focused: boolean;
}) {
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.set(withSpring(focused ? 1 : 0, { damping: 12, stiffness: 260, mass: 0.7 }));
  }, [on, focused]);

  const pill = useAnimatedStyle(() => ({
    opacity: on.get(),
    transform: [{ scaleX: interpolate(on.get(), [0, 1], [0.4, 1]) }],
  }));
  const icon = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(on.get(), [0, 0.6, 1], [1, 1.12, 1]) }],
  }));

  return (
    <Animated.View
      style={{ width: 52, height: 28, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 52,
            height: 28,
            borderRadius: 14,
            backgroundColor: COLORS.brandTint,
          },
          pill,
        ]}
      />
      <Animated.View style={icon}>
        <Glyph color={color} size={22} strokeWidth={focused ? 2.25 : 1.75} />
      </Animated.View>
    </Animated.View>
  );
}
