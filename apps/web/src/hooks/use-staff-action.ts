'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@prapp/api-client';
import { errorCodeFromDb, errorMessage } from '@prapp/shared';

type DbResult = { error: { code?: string | null; message?: string | null } | null };

/**
 * Runs one staff action (RPC or API call), shows the catalogued error message on failure
 * and refreshes the server-rendered page on success.
 */
export function useStaffAction() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run<T>(
    key: string,
    fn: () => PromiseLike<T>,
    onDone?: (value: T) => string | void,
  ) {
    setPending(key);
    setError(null);
    setNotice(null);
    try {
      const value = await fn();
      const maybeDb = value as unknown as DbResult | undefined;
      if (maybeDb && typeof maybeDb === 'object' && 'error' in maybeDb && maybeDb.error) {
        setError(errorMessage(errorCodeFromDb(maybeDb.error)));
        return false;
      }
      const msg = onDone?.(value);
      if (msg) setNotice(msg);
      router.refresh();
      return true;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Something went wrong.',
      );
      return false;
    } finally {
      setPending(null);
    }
  }

  return { pending, error, notice, run, setError };
}
