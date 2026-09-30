import { useState } from 'react';
import {
  completeProfileSchema,
  errorCodeFromDb,
  errorMessage,
  type CompleteProfileInput,
} from '@prapp/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export type FieldErrors = Partial<Record<'fullName' | 'phone' | 'country', string>>;

/** Saves name + phone directly under RLS (column grants allow only these fields). */
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
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
      .eq('id', me.id);
    if (err) {
      setPending(false);
      setError(errorMessage(errorCodeFromDb(err)));
      return false;
    }
    await refreshMe(); // profileComplete flips → the router guard moves to the tabs
    setPending(false);
    return true;
  }

  return { initialName: me?.fullName ?? '', pending, fieldErrors, error, submit };
}
