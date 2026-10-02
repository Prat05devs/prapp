'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@prapp/api-client';
import { completeProfileSchema, type CompleteProfileInput } from '@prapp/shared';
import { api } from '@/lib/api';

export type FieldErrors = Partial<Record<'fullName' | 'phone' | 'country', string>>;

/** Saves name + phone directly under RLS (column grants allow only these fields). */
export function useCompleteProfile(next: string) {
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
    try {
      await api.me.update(parsed.data);
    } catch (e) {
      setPending(false);
      setError(e instanceof ApiError ? e.message : 'Could not save your details.');
      return false;
    }
    setPending(false);
    router.replace(next);
    router.refresh();
    return true;
  }

  return { pending, fieldErrors, error, submit };
}
