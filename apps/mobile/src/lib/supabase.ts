import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import type { Database } from '@prapp/db-types';
import { appEnv } from './env';
import { LargeSecureStore } from './large-secure-store';

const env = appEnv();

/** Customer-only client (anon key + user session). RLS applies to everything it does. */
export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      // Web (expo start --web) has no SecureStore; supabase-js falls back to localStorage.
      ...(Platform.OS === 'web' ? {} : { storage: new LargeSecureStore() }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Refresh tokens only while the app is in the foreground (Supabase RN guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
