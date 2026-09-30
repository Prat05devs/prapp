import { z } from 'zod';
import { LIMITS, PATTERNS } from '../constants.ts';

// PR submission form (LLD §9.2). Mirrors the CHECK constraints on public.orders and
// public.order_images, so anything that passes here is accepted by the database.

/** "@my.handle" → "my.handle"; "" → null. */
export function normalizeInstagramHandle(input: string | null | undefined): string | null {
  const v = (input ?? '').trim().replace(/^@+/, '');
  return v === '' ? null : v;
}

export const headlineSchema = z
  .string()
  .trim()
  .min(LIMITS.headlineMin, `Headline must be at least ${LIMITS.headlineMin} characters`)
  .max(LIMITS.headlineMax, `Headline must be at most ${LIMITS.headlineMax} characters`);

export const articleSchema = z
  .string()
  .trim()
  .min(LIMITS.bodyMin, `Article must be at least ${LIMITS.bodyMin} characters`)
  .max(
    LIMITS.bodyMax,
    `Article must be at most ${LIMITS.bodyMax.toLocaleString('en-IN')} characters`,
  );

export const instagramHandleSchema = z
  .string()
  .nullish()
  .transform(normalizeInstagramHandle)
  .refine((v) => v === null || PATTERNS.instagramHandle.test(v), {
    message: 'Use letters, numbers, dots and underscores (max 30)',
  });

/** Content columns a customer may write (column grants on public.orders). */
export const orderContentSchema = z.object({
  packageId: z.uuid('Pick a package'),
  headline: headlineSchema,
  body: articleSchema,
  instagramHandle: instagramHandleSchema,
  featureConsent: z.boolean().default(false),
  declarationAccepted: z.boolean().default(false),
});

export type OrderContentInput = z.input<typeof orderContentSchema>;
export type OrderContent = z.output<typeof orderContentSchema>;

/** Row for insert/update. declaration_accepted_at is overwritten with now() by the DB trigger. */
export function toOrderRow(content: OrderContent) {
  return {
    package_id: content.packageId,
    headline: content.headline,
    body: content.body,
    instagram_handle: content.instagramHandle,
    feature_consent: content.featureConsent,
    declaration_accepted_at: content.declarationAccepted ? new Date().toISOString() : null,
  };
}

export const IMAGE_MIME_TYPES = LIMITS.imageMimeTypes;
export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export function isAllowedImageType(mime: string): mime is ImageMimeType {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export const IMAGE_EXTENSIONS: Record<ImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Metadata stored in public.order_images after the upload (LLD §9.3). */
export const orderImageMetaSchema = z.object({
  mimeType: z.enum(IMAGE_MIME_TYPES, 'Use a JPG, PNG or WebP image'),
  sizeBytes: z.number().int().positive().max(LIMITS.imageMaxBytes, 'Image must be 5 MB or smaller'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  position: z.union([z.literal(1), z.literal(2)]),
  originalFilename: z.string().max(LIMITS.originalFilenameMax).optional(),
});

export type OrderImageMeta = z.infer<typeof orderImageMetaSchema>;

/** {user_id}/{order_id}/{uuid}.{ext} (storage policy + order_images trigger). */
export function orderImagePath(
  userId: string,
  orderId: string,
  fileId: string,
  mime: ImageMimeType,
) {
  return `${userId}/${orderId}/${fileId}.${IMAGE_EXTENSIONS[mime]}`;
}

/**
 * Review step: everything the checkout needs. Checkout re-checks all of it on the
 * server (LLD §9.4), this only gives early feedback.
 */
export function checkoutReadiness(input: {
  content: OrderContentInput;
  imageCount: number;
  profileComplete: boolean;
}): { ready: boolean; problems: string[] } {
  const problems: string[] = [];
  const parsed = orderContentSchema.safeParse(input.content);
  if (!parsed.success) problems.push(...parsed.error.issues.map((i) => i.message));
  if (input.imageCount < LIMITS.imagesMin) problems.push('Add at least one image.');
  if (input.imageCount > LIMITS.imagesMax) problems.push('You can upload up to 2 images.');
  if (!input.content.declarationAccepted)
    problems.push('Please accept the declaration to continue.');
  if (!input.profileComplete) problems.push('Add your name and phone number to continue.');
  return { ready: problems.length === 0, problems };
}

export const DECLARATION_TEXT =
  'This content is mine and accurate, and I understand it will be published as sponsored content.';
export const FEATURE_CONSENT_TEXT = 'You may feature my story on your website.';
export const INSTAGRAM_COLLAB_HINT =
  "We'll invite you as a collaborator. Accept the request within 24 hours or the post goes out with a tag only.";
