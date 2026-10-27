import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import {
  CircleUserRound,
  House,
  Newspaper,
  Receipt,
  SearchCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { TabIcon } from '@/components/motion';
import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/theme';

function icon(glyph: LucideIcon) {
  function Icon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <TabIcon glyph={glyph} color={color as string} focused={focused} />;
  }
  return Icon;
}

// Tabs: Home · Check · Publish · Orders · Profile (LLD §13). Each tab is its own native stack
// with a large title (docs/MOBILE-UX.md), so the tab bar's own header is off. Switching tabs
// gives a selection haptic and the active icon's pill springs in (docs/DESIGN.md, Motion).
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.slate,
        tabBarLabelStyle: { fontFamily: 'PublicSans_500Medium', fontSize: 11 },
        tabBarStyle: { borderTopColor: COLORS.hairline, backgroundColor: COLORS.paper },
        tabBarHideOnKeyboard: true,
      }}
      screenListeners={{ tabPress: () => haptics.select() }}
    >
      <Tabs.Screen name="(home)" options={{ title: 'Home', tabBarIcon: icon(House) }} />
      <Tabs.Screen name="fact-check" options={{ title: 'Check', tabBarIcon: icon(SearchCheck) }} />
      <Tabs.Screen name="publish" options={{ title: 'Publish', tabBarIcon: icon(Newspaper) }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: icon(Receipt) }} />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: icon(CircleUserRound) }}
      />
    </Tabs>
  );
}
