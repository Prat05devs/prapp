import { describe, expect, it } from 'vitest';
import { bearerToken } from './auth';
import { safeNext } from './session';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/orders/1?x=1')).toBe('/orders/1?x=1');
  });
  it('rejects open redirects', () => {
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext(null, '/account')).toBe('/account');
  });
});

describe('bearerToken', () => {
  const req = (auth?: string) =>
    new Request('http://x', { headers: auth ? { Authorization: auth } : {} });
  it('extracts the token', () => {
    expect(bearerToken(req('Bearer abc.def'))).toBe('abc.def');
    expect(bearerToken(req('bearer abc'))).toBe('abc');
  });
  it('ignores other schemes', () => {
    expect(bearerToken(req())).toBeNull();
    expect(bearerToken(req('Basic abc'))).toBeNull();
  });
});
