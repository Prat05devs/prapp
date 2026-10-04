import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MeResponse } from '@prapp/shared';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface AuthState {
  /** true until the stored session (and profile, if signed in) has loaded */
  loading: boolean;
  session: Session | null;
  me: MeResponse | null;
  /** couldn't load the profile (network / API down) while signed in */
  meError: string | null;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') {
        // Clear per-user caches. Device-token cleanup is added with push in P5 (LLD §6.3).
        setMe(null);
        setMeError(null);
      }
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  const refreshMe = useCallback(async () => {
    if (!userId) return;
    try {
      setMe(await api.me.get());
      setMeError(null);
    } catch (e) {
      setMeError(e instanceof Error ? e.message : 'Could not load your profile.');
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api.me.get().then(
      (next) => {
        if (cancelled) return;
        setMe(next);
        setMeError(null);
      },
      (e: unknown) => {
        if (!cancelled) setMeError(e instanceof Error ? e.message : 'Could not load your profile.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo<AuthState>(
    () => ({
      loading: !sessionLoaded || (Boolean(userId) && me?.id !== userId && !meError),
      session,
      me: userId && me?.id === userId ? me : null,
      meError,
      refreshMe,
    }),
    [sessionLoaded, userId, me, meError, session, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
