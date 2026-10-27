import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@prapp/shared';
import { Icon, Text } from '@/components/ui';
import { COLORS } from '@/lib/theme';

const PATH: OrderStatus[] = ['draft', 'pending_payment', 'paid', 'in_progress', 'published'];
const DOT = 20;

/**
 * Happy-path progress (same rules as the web timeline); hidden for off-path statuses. The line
 * draws down to the current step, and the current step breathes while the order is with us.
 */
export function OrderTimeline({ status }: { status: string }) {
  const at = status === 'changes_requested' ? 3 : PATH.indexOf(status as OrderStatus);
  const reached = useSharedValue(0);
  useEffect(() => {
    if (at < 0) return;
    reached.set(
      withDelay(
        200,
        withTiming(at / (PATH.length - 1), { duration: 900, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [reached, at]);
  const line = useAnimatedStyle(() => ({ transform: [{ scaleY: reached.get() }] }));

  if (at < 0) return null;
  return (
    <View className="gap-[18px]">
      <View
        className="absolute bg-elevated"
        style={{ left: DOT / 2 - 1, width: 2, top: DOT / 2, bottom: DOT / 2 }}
      >
        <Animated.View
          style={[{ flex: 1, backgroundColor: COLORS.verified, transformOrigin: 'top' }, line]}
        />
      </View>
      {PATH.map((s, i) => {
        const done = i < at || (i === at && s === 'published');
        const current = i === at && s !== 'published';
        const label =
          current && status === 'changes_requested'
            ? ORDER_STATUS_LABELS.changes_requested
            : ORDER_STATUS_LABELS[s];
        const tone = status === 'changes_requested' ? COLORS.warn : COLORS.brand;
        return (
          <View key={s} className="flex-row items-center gap-3">
            <View style={{ width: DOT, height: DOT }}>
              {current ? <Breathe color={tone} /> : null}
              <View
                className={`h-5 w-5 items-center justify-center rounded-full ${
                  done ? 'bg-verified' : current ? '' : 'border border-input bg-paper'
                }`}
                style={current ? { backgroundColor: tone } : undefined}
              >
                {done ? <Icon as={Check} size={11} className="text-white" /> : null}
                {current ? <View className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </View>
            </View>
            <Text
              className={`text-label-md ${done || current ? 'font-sans-semibold text-ink' : 'text-slate'}`}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** A soft ring that swells and fades behind the current step. */
function Breathe({ color }: { color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1));
  }, [t]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - t.get()),
    transform: [{ scale: 1 + t.get() * 0.9 }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: DOT,
          height: DOT,
          borderRadius: DOT / 2,
          backgroundColor: color,
        },
        ring,
      ]}
    />
  );
}
