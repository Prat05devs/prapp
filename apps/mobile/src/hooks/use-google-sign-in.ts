import { useState } from 'react';
import { appEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';

/**
 * Native Google sign-in → signInWithIdToken (LLD §6.1). Needs a development build
 * (not Expo Go) and EXPO_PUBLIC_GOOGLE_* client IDs.
 */
export function useGoogleSignIn() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: webClientId,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: iosClientId,
  } = appEnv();
  const available = Boolean(webClientId);

  async function signInWithGoogle() {
    if (!webClientId) return;
    setPending(true);
    setError(null);
    try {
      // Loaded lazily: the native module is missing in Expo Go and would crash at import.
      const { GoogleSignin, isSuccessResponse } =
        await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId, iosClientId });
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // user cancelled
      const idToken = response.data.idToken;
      if (!idToken) throw new Error('Google did not return an ID token.');
      const { error: err } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (err) throw err;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setPending(false);
    }
  }

  return { available, pending, error, signInWithGoogle };
}
