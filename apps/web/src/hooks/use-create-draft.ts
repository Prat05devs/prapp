'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@prapp/api-client';
import { orderContentSchema, type OrderContentInput } from '@prapp/shared';
import { api } from '@/lib/api';
import { fieldErrorsFrom, type OrderFieldErrors } from '@/lib/form-errors';

/** /publish: validates the story and creates the draft, then continues to images + review. */
export function useCreateDraft() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<OrderFieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  /** Field errors shown inline; true when the story is ready to save. */
  function validate(input: OrderContentInput): boolean {
    const parsed = orderContentSchema.safeParse(input);
    setFieldErrors(parsed.success ? {} : fieldErrorsFrom(parsed.error));
    return parsed.success;
  }

  async function create(input: OrderContentInput) {
    if (!validate(input)) return;
    setError(null);
    setPending(true);
    try {
      const { id } = await api.orders.create(input);
      router.push(`/orders/${id}/edit`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your story. Try again.');
      setPending(false);
    }
  }

  return { pending, fieldErrors, error, validate, create };
}
