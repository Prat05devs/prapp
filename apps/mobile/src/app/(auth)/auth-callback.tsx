import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ActionButton, Centered, ErrorText, Text } from '@/components/ui';
import { completeSignInFromUrl } from '@/lib/auth-link';
import { COLORS } from '@/lib/theme';

/**
 * newsvio://auth-callback: where the sign-in email link lands. The auth provider finishes the
 * session; once it exists the router guard moves on. This shows progress or the link error.
 */
export default function AuthCallbackScreen() {
  const url = Linking.useLinkingURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void completeSignInFromUrl(url).then((r) => {
      if (r && r !== 'ok') setError(r);
    });
  }, [url]);

  return (
    <Centered>
      {error ? (
        <>
          <Text variant="h3">Sign-in link didn&apos;t work</Text>
          <ErrorText>{error}</ErrorText>
          <ActionButton title="Back to sign in" onPress={() => router.replace('/sign-in')} />
        </>
      ) : (
        <>
          <ActivityIndicator color={COLORS.ink} />
          <Text variant="muted">Signing you in…</Text>
        </>
      )}
    </Centered>
  );
}
