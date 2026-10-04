import '../../global.css';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
} from '@expo-google-fonts/public-sans';
import { SourceSerif4_600SemiBold, SourceSerif4_700Bold } from '@expo-google-fonts/source-serif-4';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import {
  Stack,
  ThemeProvider,
  router,
  useRootNavigationState,
  type ErrorBoundaryProps,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActionButton, Centered, Text } from '@/components/ui';
import { NAV_THEME, STACK_HEADER } from '@/lib/theme';
import { openDeepLink } from '@/lib/links';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

void SplashScreen.preventAutoHideAsync();

/** A render error on any screen lands here instead of crashing the app. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <Centered>
      <Text variant="h2">Something went wrong</Text>
      <Text variant="muted" className="text-center">
        {error.message}
      </Text>
      <ActionButton title="Try again" onPress={() => void retry()} />
    </Centered>
  );
}

export default function RootLayout() {
  // Type system (docs/DESIGN.md): Source Serif 4 headings, Public Sans body, Plex Mono for data.
  const [fontsLoaded, fontError] = useFonts({
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
    IBMPlexMono_500Medium,
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
 * Guests can use the whole app (client feedback, Oct 2026). Login is asked only where an account
 * is needed: the 3rd fact check of the day, saving a story to add photos and pay, orders and
 * notifications. Sign-in and profile completion open as modals over the tabs, so the screen the
 * user came from (and anything typed into it) is still there when they finish.
 * The API and RLS still enforce access.
 */
function RootNavigator() {
  const { loading, session, me, meError, refreshMe } = useAuth();
  const ready = Boolean(session) && Boolean(me?.profileComplete);
  const needsProfile = Boolean(session) && Boolean(me) && !me?.profileComplete;
  const lastResponse = Notifications.useLastNotificationResponse();
  const navReady = Boolean(useRootNavigationState()?.key);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  // Signed in without name/phone (new account, or Google sign-in): ask for them right away.
  useEffect(() => {
    if (navReady && needsProfile) router.push('/complete-profile');
  }, [navReady, needsProfile]);

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
      <Stack.Screen name="(tabs)" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen
          name="complete-profile"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen
          name="notifications"
          options={{ ...STACK_HEADER, headerShown: true, title: 'Notifications' }}
        />
        <Stack.Screen name="payment-result" />
      </Stack.Protected>
    </Stack>
  );
}
