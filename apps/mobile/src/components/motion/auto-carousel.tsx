import { Image, type ImageSource } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Icon, Text } from '@/components/ui';
import { COLORS } from '@/lib/theme';
import { PressableScale } from './pressable-scale';

export type CarouselSlide = {
  key: string;
  image: ImageSource;
  /** describes the photo for screen readers */
  alt: string;
  kicker?: string;
  title: string;
  cta?: string;
  /** without it the slide is a picture, not a button */
  onPress?: () => void;
};

/** How far a slide's photo lags behind the swipe (parallax), as a share of the slide width. */
const PARALLAX = 0.2;
/** Slow zoom on the photo while its slide is showing. */
const ZOOM = 0.06;

function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // react-native-web can't tell and always answers yes; the app ships on iOS and Android.
    if (Platform.OS === 'web') return;
    void AccessibilityInfo.isScreenReaderEnabled().then(setOn);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/**
 * Full-width photo slides that advance on their own (docs/DESIGN.md, Motion). Swipe to move,
 * tap a progress bar or dot to jump. Holding a slide pauses it; leaving the screen stops it.
 * With Reduce Motion or a screen reader on, slides only change when the user swipes.
 * Text sits on a dark scrim at the bottom of the photo so it stays readable on any image.
 */
export function AutoCarousel({
  slides,
  height,
  interval = 4000,
  indicator = 'bars',
}: {
  slides: CarouselSlide[];
  height: number;
  interval?: number;
  /** story-style progress bars over the photo, or dots under it */
  indicator?: 'bars' | 'dots';
}) {
  const { width: screen } = useWindowDimensions();
  const width = screen - 32; // the screen's 16pt gutters
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const progress = useSharedValue(0);
  const activeIndex = useSharedValue(0);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [focused, setFocused] = useState(true);
  const reduced = useReducedMotion();
  const screenReader = useScreenReader();
  const still = reduced || screenReader;
  const autoplay = !held && focused && !still && slides.length > 1;

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const goTo = useCallback(
    (i: number) => {
      scrollRef.current?.scrollTo({ x: i * width, animated: true });
      setActive(i);
    },
    [scrollRef, width],
  );

  useEffect(() => {
    activeIndex.set(active);
    if (!autoplay) {
      if (still) progress.set(1);
      else cancelAnimation(progress);
      return;
    }
    progress.set(0);
    progress.set(withTiming(1, { duration: interval, easing: Easing.linear }));
    const timer = setTimeout(() => goTo((active + 1) % slides.length), interval);
    return () => clearTimeout(timer);
  }, [active, autoplay, still, interval, slides.length, goTo, activeIndex, progress]);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });

  return (
    <View className="gap-2.5">
      <View style={{ height, borderRadius: 20, overflow: 'hidden', backgroundColor: COLORS.ink }}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => setHeld(true)}
          onMomentumScrollEnd={(e) => {
            setActive(Math.round(e.nativeEvent.contentOffset.x / width));
            setHeld(false);
          }}
        >
          {slides.map((s, i) => (
            <Slide
              key={s.key}
              slide={s}
              index={i}
              width={width}
              height={height}
              x={x}
              progress={progress}
              activeIndex={activeIndex}
              onHold={setHeld}
            />
          ))}
        </Animated.ScrollView>
        {indicator === 'bars' && slides.length > 1 ? (
          <View className="absolute left-3 right-3 top-3 flex-row gap-1">
            {slides.map((s, i) => (
              <StoryBar
                key={s.key}
                index={i}
                count={slides.length}
                progress={progress}
                activeIndex={activeIndex}
                onPress={() => goTo(i)}
              />
            ))}
          </View>
        ) : null}
      </View>
      {indicator === 'dots' && slides.length > 1 ? (
        <View className="flex-row justify-center gap-1.5">
          {slides.map((s, i) => (
            <Dot
              key={s.key}
              index={i}
              count={slides.length}
              x={x}
              width={width}
              onPress={() => goTo(i)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Slide({
  slide,
  index,
  width,
  height,
  x,
  progress,
  activeIndex,
  onHold,
}: {
  slide: CarouselSlide;
  index: number;
  width: number;
  height: number;
  x: SharedValue<number>;
  progress: SharedValue<number>;
  activeIndex: SharedValue<number>;
  onHold: (held: boolean) => void;
}) {
  const at = index * width;
  const photo = useAnimatedStyle(() => ({
    transform: [
      { translateX: (x.get() - at) * PARALLAX },
      { scale: activeIndex.get() === index ? 1 + ZOOM * progress.get() : 1 },
    ],
  }));
  const copy = useAnimatedStyle(() => {
    const range = [at - width * 0.6, at, at + width * 0.6];
    return {
      opacity: interpolate(x.get(), range, [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(x.get(), range, [18, 0, 18], Extrapolation.CLAMP) }],
    };
  });

  return (
    <PressableScale
      accessibilityRole={slide.onPress ? 'button' : 'image'}
      accessibilityLabel={[slide.kicker, slide.title, slide.cta].filter(Boolean).join('. ')}
      accessibilityHint={slide.alt}
      scaleTo={slide.onPress ? 0.985 : 1}
      haptic={slide.onPress ? 'tap' : false}
      onPressIn={() => onHold(true)}
      onPressOut={() => onHold(false)}
      onPress={slide.onPress}
      style={{ width, height, overflow: 'hidden' }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: -width * PARALLAX,
            width: width * (1 + 2 * PARALLAX),
          },
          photo,
        ]}
      >
        <Image
          source={slide.image}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
      <Scrim />
      <Animated.View
        style={[{ position: 'absolute', left: 16, right: 16, bottom: 16, gap: 8 }, copy]}
      >
        {slide.kicker ? (
          <View className="self-start rounded-full bg-paper/90 px-2.5 py-1">
            <Text className="font-sans-semibold text-[12px] text-ink">{slide.kicker}</Text>
          </View>
        ) : null}
        <Text className="font-display text-[25px] leading-[30px] text-white">{slide.title}</Text>
        {slide.cta ? (
          <View className="mt-1 h-10 flex-row items-center gap-1.5 self-start rounded-full bg-paper px-4">
            <Text className="font-sans-semibold text-[14px] text-ink">{slide.cta}</Text>
            <Icon as={ArrowRight} size={16} className="text-ink" />
          </View>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

/** Dark gradient behind the slide's text, so white type reads on any photo. */
function Scrim() {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="65%"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
    >
      <Defs>
        <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COLORS.ink} stopOpacity={0} />
          <Stop offset="1" stopColor={COLORS.ink} stopOpacity={0.85} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
    </Svg>
  );
}

function StoryBar({
  index,
  count,
  progress,
  activeIndex,
  onPress,
}: {
  index: number;
  count: number;
  progress: SharedValue<number>;
  activeIndex: SharedValue<number>;
  onPress: () => void;
}) {
  const fill = useAnimatedStyle(() => {
    const a = activeIndex.get();
    const done = index < a ? 1 : index === a ? progress.get() : 0;
    return { width: `${done * 100}%` };
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show slide ${index + 1} of ${count}`}
      hitSlop={{ top: 10, bottom: 14 }}
      onPress={onPress}
      className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35"
    >
      <Animated.View style={[{ height: '100%', backgroundColor: COLORS.paper }, fill]} />
    </Pressable>
  );
}

function Dot({
  index,
  count,
  x,
  width,
  onPress,
}: {
  index: number;
  count: number;
  x: SharedValue<number>;
  width: number;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const t = interpolate(
      x.get() / width,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return {
      width: 6 + 16 * t,
      backgroundColor: t > 0.5 ? COLORS.ink : COLORS.hairline,
    };
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show slide ${index + 1} of ${count}`}
      hitSlop={10}
      onPress={onPress}
      className="py-1"
    >
      <Animated.View style={[{ height: 6, borderRadius: 3 }, style]} />
    </Pressable>
  );
}
