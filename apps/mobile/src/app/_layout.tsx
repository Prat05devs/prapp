import '../../global.css';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, ThemeProvider, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActionButton, Centered, Text } from '@/components/ui';
import { NAV_THEME, STACK_HEADER } from '@/lib/theme';
import { openDeepLink } from '@/lib/links';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Stitch type system: Manrope headings, Inter body, JetBrains Mono labels.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Manrope_600SemiBold,
    Manrope_700Bold,
    JetBrainsMono_500Medium,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={NAV_THEME}>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <PortalHost />
    </ThemeProvider>
  );
}

/**
 * Auth gate (LLD §13): signed out → sign in; signed in without name/phone →
 * complete profile; otherwise the tabs. The API and RLS still enforce access.
 */
function RootNavigator() {
  const { loading, session, me, meError, refreshMe } = useAuth();
  const ready = Boolean(session) && Boolean(me?.profileComplete);
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  // Notification tap → data.deep_link (LLD §12)
  useEffect(() => {
    if (!ready || !lastResponse) return;
    void openDeepLink(lastResponse.notification.request.content.data?.deep_link, (href) =>
      router.push(href),
    );
  }, [ready, lastResponse]);

  if (loading) return null;

  if (session && !me) {
    return (
      <Centered>
        <Text variant="h2">Can&apos;t reach the server</Text>
        <Text variant="muted" className="text-center">
          {meError ?? 'Please check your connection.'}
        </Text>
        <ActionButton title="Try again" onPress={() => void refreshMe()} />
      </Centered>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session) && !me?.profileComplete}>
        <Stack.Screen name="complete-profile" />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="notifications"
          options={{ ...STACK_HEADER, headerShown: true, title: 'Notifications' }}
        />
        <Stack.Screen name="payment-result" />
      </Stack.Protected>
    </Stack>
  );
}
