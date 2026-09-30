'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  completeProfileSchema,
  errorCodeFromDb,
  errorMessage,
  type CompleteProfileInput,
} from '@prapp/shared';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export type FieldErrors = Partial<Record<'fullName' | 'phone' | 'country', string>>;

/** Saves name + phone directly under RLS (column grants allow only these fields). */
export function useCompleteProfile(userId: string, next: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  async function submit(input: CompleteProfileInput): Promise<boolean> {
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
    const { error: err } = await createBrowserSupabase()
      .from('profiles')
      .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
      .eq('id', userId);
    setPending(false);
    if (err) {
      setError(errorMessage(errorCodeFromDb(err)));
      return false;
    }
    router.replace(next);
    router.refresh();
    return true;
  }

  return { pending, fieldErrors, error, submit };
}
