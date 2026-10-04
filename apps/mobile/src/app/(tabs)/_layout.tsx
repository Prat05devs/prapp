import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { House, Receipt, SearchCheck, Send, User, type LucideIcon } from 'lucide-react-native';
import { COLORS } from '@/lib/theme';

function icon(Glyph: LucideIcon) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Glyph color={color as string} size={size - 2} />;
  }
  return TabIcon;
}

// Tabs: Home · Fact check · Publish · Orders · Profile (LLD §13). Each tab root draws the
// app bar itself, so the native header is hidden.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.slate,
        tabBarLabelStyle: { fontFamily: 'PublicSans_600SemiBold', fontSize: 11 },
        tabBarStyle: { borderTopColor: COLORS.hairline, backgroundColor: COLORS.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon(House) }} />
      <Tabs.Screen
        name="fact-check"
        options={{ title: 'Fact check', tabBarIcon: icon(SearchCheck) }}
      />
      <Tabs.Screen name="publish" options={{ title: 'Publish', tabBarIcon: icon(Send) }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: icon(Receipt) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon(User) }} />
    </Tabs>
  );
}
