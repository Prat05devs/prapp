import { describe, expect, it } from 'vitest';
import {
  checkoutReadiness,
  normalizeInstagramHandle,
  orderContentSchema,
  orderImageMetaSchema,
  orderImagePath,
  toOrderRow,
} from './order.ts';

const PKG = '0b8f7a4e-3f7e-4d3c-9a57-1d2f0c7c9a11';
const valid = {
  packageId: PKG,
  headline: 'Dehradun school wins state science fair',
  body: 'x'.repeat(300),
  instagramHandle: '@doon.times',
  featureConsent: true,
  declarationAccepted: true,
};

describe('orderContentSchema (mirrors orders CHECKs)', () => {
  it('accepts valid content and strips @ from the handle', () => {
    expect(orderContentSchema.parse(valid).instagramHandle).toBe('doon.times');
  });
  it('measures length after trimming like the DB', () => {
    expect(orderContentSchema.safeParse({ ...valid, headline: '   short    ' }).success).toBe(
      false,
    );
    expect(orderContentSchema.safeParse({ ...valid, headline: 'a'.repeat(150) }).success).toBe(
      true,
    );
    expect(orderContentSchema.safeParse({ ...valid, headline: 'a'.repeat(151) }).success).toBe(
      false,
    );
    expect(orderContentSchema.safeParse({ ...valid, body: ` ${'x'.repeat(299)} ` }).success).toBe(
      false,
    );
    expect(orderContentSchema.safeParse({ ...valid, body: 'x'.repeat(20001) }).success).toBe(false);
  });
  it('validates the Instagram handle', () => {
    expect(orderContentSchema.parse({ ...valid, instagramHandle: '' }).instagramHandle).toBeNull();
    expect(
      orderContentSchema.parse({ ...valid, instagramHandle: undefined }).instagramHandle,
    ).toBeNull();
    expect(orderContentSchema.safeParse({ ...valid, instagramHandle: 'bad handle' }).success).toBe(
      false,
    );
    expect(
      orderContentSchema.safeParse({ ...valid, instagramHandle: 'a'.repeat(31) }).success,
    ).toBe(false);
  });
  it('requires a package id', () => {
    expect(orderContentSchema.safeParse({ ...valid, packageId: '' }).success).toBe(false);
  });
});

describe('helpers', () => {
  it('normalises handles', () => {
    expect(normalizeInstagramHandle('  @@abc ')).toBe('abc');
    expect(normalizeInstagramHandle(null)).toBeNull();
  });
  it('maps to snake_case columns', () => {
    const row = toOrderRow(orderContentSchema.parse({ ...valid, declarationAccepted: false }));
    expect(row).toMatchObject({
      package_id: PKG,
      instagram_handle: 'doon.times',
      feature_consent: true,
    });
    expect(row.declaration_accepted_at).toBeNull();
  });
  it('builds the storage path the RLS policy expects', () => {
    expect(orderImagePath('u1', 'o1', 'f1', 'image/jpeg')).toBe('u1/o1/f1.jpg');
  });
  it('validates image metadata against order_images CHECKs', () => {
    expect(
      orderImageMetaSchema.safeParse({ mimeType: 'image/gif', sizeBytes: 10, position: 1 }).success,
    ).toBe(false);
    expect(
      orderImageMetaSchema.safeParse({
        mimeType: 'image/jpeg',
        sizeBytes: 5 * 1024 * 1024 + 1,
        position: 1,
      }).success,
    ).toBe(false);
    expect(
      orderImageMetaSchema.safeParse({ mimeType: 'image/webp', sizeBytes: 1000, position: 3 })
        .success,
    ).toBe(false);
    expect(
      orderImageMetaSchema.safeParse({ mimeType: 'image/webp', sizeBytes: 1000, position: 2 })
        .success,
    ).toBe(true);
  });
});

describe('checkoutReadiness', () => {
  it('is ready with valid content, 1 image, declaration and profile', () => {
    expect(checkoutReadiness({ content: valid, imageCount: 1, profileComplete: true })).toEqual({
      ready: true,
      problems: [],
    });
  });
  it('lists every problem', () => {
    const r = checkoutReadiness({
      content: { ...valid, declarationAccepted: false },
      imageCount: 0,
      profileComplete: false,
    });
    expect(r.ready).toBe(false);
    expect(r.problems).toEqual([
      'Add at least one image.',
      'Please accept the declaration to continue.',
      'Add your name and phone number to continue.',
    ]);
  });
});
