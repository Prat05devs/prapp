import { useState } from 'react';
import { ApiError } from '@prapp/api-client';
import { completeProfileSchema, type CompleteProfileInput } from '@prapp/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export type FieldErrors = Partial<Record<'fullName' | 'phone' | 'country', string>>;

/** Saves name + phone through PATCH /api/me (runs as the user under RLS). */
export function useCompleteProfile() {
  const { me, refreshMe } = useAuth();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  async function submit(input: CompleteProfileInput): Promise<boolean> {
    if (!me) return false;
    const parsed = completeProfileSchema.safeParse(input);
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors | undefined;
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return false;
    }
    setFieldErrors({});
    setError(null);
    setPending(true);
    try {
      await api.me.update(parsed.data);
    } catch (e) {
      setPending(false);
      setError(e instanceof ApiError ? e.message : 'Could not save your details.');
      return false;
    }
    await refreshMe(); // profileComplete flips → the router guard moves to the tabs
    setPending(false);
    return true;
  }

  return { initialName: me?.fullName ?? '', pending, fieldErrors, error, submit };
}
