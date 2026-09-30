import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@prapp/db-types';
import { errorCodeFromDb, errorMessage } from '@prapp/shared';
import { ApiError } from '../client';

/** A user-scoped Supabase client (anon key + session). RLS applies to everything here. */
export type Db = SupabaseClient<Database>;

interface DbErrorLike {
  code?: string | null;
  message?: string | null;
}

/** Converts a PostgREST/Storage error into the same ApiError the /api routes produce. */
export function toApiError(err: DbErrorLike): ApiError {
  const code = errorCodeFromDb(err);
  return new ApiError(code, 0, errorMessage(code));
}

export function unwrap<T>(result: { data: T | null; error: DbErrorLike | null }): T {
  if (result.error) throw toApiError(result.error);
  if (result.data === null)
    throw new ApiError('order_not_found', 404, errorMessage('order_not_found'));
  return result.data;
}

export function check(result: { error: DbErrorLike | null }): void {
  if (result.error) throw toApiError(result.error);
}
