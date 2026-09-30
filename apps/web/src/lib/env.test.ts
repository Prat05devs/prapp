import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseEnv } from './env';

describe('parseEnv', () => {
  const schema = z.object({ A: z.string().min(1), B: z.url() });

  it('returns parsed values', () => {
    expect(parseEnv(schema, { A: 'x', B: 'https://example.in' })).toEqual({
      A: 'x',
      B: 'https://example.in',
    });
  });

  it('names missing variables without echoing values', () => {
    expect(() => parseEnv(schema, { A: '', B: 'secret-not-a-url' })).toThrow(
      'Missing or invalid environment variables: A, B. See .env.example.',
    );
  });
});
