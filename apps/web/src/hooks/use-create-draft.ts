'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, createDraft } from '@prapp/api-client';
import { orderContentSchema, type OrderContentInput } from '@prapp/shared';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { fieldErrorsFrom, type OrderFieldErrors } from '@/lib/form-errors';

/** /publish: validates the story and creates the draft, then continues to images + review. */
export function useCreateDraft() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<OrderFieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  async function create(input: OrderContentInput) {
    const parsed = orderContentSchema.safeParse(input);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setFieldErrors({});
    setError(null);
    setPending(true);
    try {
      const { id } = await createDraft(createBrowserSupabase(), input);
      router.push(`/orders/${id}/edit`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your story. Try again.');
      setPending(false);
    }
  }

  return { pending, fieldErrors, error, create };
}
