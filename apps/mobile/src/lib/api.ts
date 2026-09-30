import { createApiClient } from '@prapp/api-client';
import { appEnv } from './env';
import { supabase } from './supabase';

/** Calls the Next.js /api/* with `Authorization: Bearer <access token>` (CONTEXT §5). */
export const api = createApiClient({
  baseUrl: appEnv().EXPO_PUBLIC_API_URL,
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token,
});
