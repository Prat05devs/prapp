import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptIntegration, encryptIntegration } from './integration-crypto';

describe('integration secret envelope', () => {
  it('uses randomized authenticated encryption bound to the provider and environment', () => {
    const key = randomBytes(32).toString('base64');
    const input = { keySecret: 'private-value-that-must-not-be-stored-as-plaintext' };
    const a = encryptIntegration(input, 'razorpay:live', key);
    const b = encryptIntegration(input, 'razorpay:live', key);
    expect(a).not.toBe(b);
    expect(a).not.toContain(input.keySecret);
    expect(decryptIntegration(a, 'razorpay:live', key)).toEqual(input);
    expect(() => decryptIntegration(a, 'razorpay:test', key)).toThrow('could not be decrypted');
    expect(() =>
      decryptIntegration(a, 'razorpay:live', randomBytes(32).toString('base64')),
    ).toThrow();
    const parts = a.split('.');
    parts[3] = `${parts[3]![0] === 'A' ? 'B' : 'A'}${parts[3]!.slice(1)}`;
    expect(() => decryptIntegration(parts.join('.'), 'razorpay:live', key)).toThrow();
  });
  it('fails closed when the master key is missing or malformed', () => {
    for (const key of ['', 'short', randomBytes(31).toString('base64')]) {
      expect(() => encryptIntegration({}, 'gemini:project', key)).toThrow();
    }
  });
});
