import { describe, expect, it } from 'vitest';
import { apiErrorBody, errorCodeFromDb, httpStatusFor } from './errors.ts';

describe('errorCodeFromDb', () => {
  it('reads the code raised by SQL', () => {
    expect(errorCodeFromDb({ code: 'P0001', message: 'order_locked' })).toBe('order_locked');
  });
  it('takes the first word of messages with details', () => {
    expect(errorCodeFromDb({ code: 'P0001', message: 'illegal_transition draft -> paid' })).toBe(
      'illegal_transition',
    );
  });
  it('maps privilege errors to not_authorized', () => {
    expect(errorCodeFromDb({ code: '42501', message: 'permission denied for table orders' })).toBe(
      'not_authorized',
    );
  });
  it('maps check violations to validation_failed', () => {
    expect(errorCodeFromDb({ code: '23514', message: 'new row violates check constraint' })).toBe(
      'validation_failed',
    );
  });
  it('falls back to internal_error', () => {
    expect(errorCodeFromDb({ code: 'XX000', message: 'boom' })).toBe('internal_error');
    expect(errorCodeFromDb(null)).toBe('internal_error');
  });
});

describe('http mapping', () => {
  it('uses specific statuses and 409 for business rules', () => {
    expect(httpStatusFor('not_authenticated')).toBe(401);
    expect(httpStatusFor('not_authorized')).toBe(403);
    expect(httpStatusFor('fact_check_limit_reached')).toBe(429);
    expect(httpStatusFor('order_locked')).toBe(409);
  });
  it('builds the API error body', () => {
    expect(apiErrorBody('order_locked')).toEqual({
      error: { code: 'order_locked', message: "This order can't be edited right now." },
    });
  });
});
