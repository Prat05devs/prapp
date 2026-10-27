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
  .min(LIMITS.headlineMin, `Write a headline of at least ${LIMITS.headlineMin} characters.`)
  .max(LIMITS.headlineMax, `Keep the headline to ${LIMITS.headlineMax} characters or fewer.`);

export const articleSchema = z
  .string()
  .trim()
  .min(
    LIMITS.bodyMin,
    `Add more detail before continuing: at least ${LIMITS.bodyMin} characters covering who, what, when, where and why.`,
  )
  .max(
    LIMITS.bodyMax,
    `Keep your story to ${LIMITS.bodyMax.toLocaleString('en-IN')} characters or fewer.`,
  );

export const instagramHandleSchema = z
  .string()
  .nullish()
  .transform(normalizeInstagramHandle)
  .refine((v) => v === null || PATTERNS.instagramHandle.test(v), {
    message: 'Use only letters, numbers, dots and underscores (up to 30).',
  });

/** Content columns a customer may write (column grants on public.orders). */
export const orderContentSchema = z.object({
  packageId: z.uuid('Choose a package.'),
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
  if (input.imageCount < LIMITS.imagesMin) problems.push('Add at least 1 supporting image.');
  if (input.imageCount > LIMITS.imagesMax) problems.push('You can add up to 2 images.');
  if (!input.content.declarationAccepted)
    problems.push('Confirm the editorial declaration to continue.');
  if (!input.profileComplete) problems.push('Add your name and phone number to continue.');
  return { ready: problems.length === 0, problems };
}

/** Editorial confirmation (VERBAL_SYSTEM.md §12). */
export const DECLARATION_TEXT =
  'I confirm that the information is accurate to the best of my knowledge, that I have permission to use the submitted images, and that I understand the story will be published as sponsored content if approved.';
export const FEATURE_CONSENT_TEXT =
  'NewsVio may show my published story as an example on its website and app.';
export const INSTAGRAM_COLLAB_HINT =
  'Add the account to tag or invite for collaboration. Accept our invite within 24 hours, or the post goes out with a tag only.';

/** Story form labels and helpers (VERBAL_SYSTEM.md §12), shared by the site and the app. */
export const STORY_FORM_COPY = {
  headlineLabel: 'Story headline',
  headlineHint: 'Write a clear headline in up to 150 characters.',
  bodyLabel: 'Your story',
  bodyHint:
    'Add the main facts, names, dates, location and supporting details. Minimum 300 characters.',
  imagesLabel: 'Supporting images',
  imagesHint: 'Add 1–2 clear images you have permission to publish.',
  handleLabel: 'Instagram handle (optional)',
} as const;
