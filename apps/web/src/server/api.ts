import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorBody, errorCodeFromDb, httpStatusFor, type ErrorCode } from '@prapp/shared';

/** Throw from route handlers to return `{ error: { code, message } }` (CONTEXT §5). */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = 'AppError';
  }
}

export function jsonError(code: ErrorCode, details?: unknown): NextResponse {
  return NextResponse.json(apiErrorBody(code, details), { status: httpStatusFor(code) });
}

/** Throws AppError for a PostgREST/Postgres error, e.g. SQL `raise exception 'order_locked'`. */
export function throwDbError(err: { code?: string | null; message?: string | null }): never {
  throw new AppError(errorCodeFromDb(err));
}

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw new AppError('validation_failed', z.flattenError(result.error));
  return result.data;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError('validation_failed', { formErrors: ['Body must be JSON'] });
  }
}

/** Wraps a route handler: maps AppError to its status and anything else to 500. */
export function handleApi<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AppError) return jsonError(e.code, e.details);
      console.error('Unhandled API error', e instanceof Error ? e.message : e);
      return jsonError('internal_error');
    }
  };
}
