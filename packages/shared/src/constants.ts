// Values here mirror the enums and CHECK constraints in
// supabase/migrations/20260927000000_init.sql. The SQL is the source of truth:
// if you change one side, change the other in a new migration.

// DECISION: app name / brand is TBD (LLD §20); every user-facing mention reads this.
export const BRAND_NAME = 'prapp';
export const APP_SCHEME = 'prapp';
export const DISPLAY_TIMEZONE = 'Asia/Kolkata';

export const APP_ROLES = ['user', 'editor', 'admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ORDER_STATUSES = [
  'draft',
  'pending_payment',
  'paid',
  'in_progress',
  'changes_requested',
  'published',
  'rejected',
  'refunded',
  'cancelled',
  'expired',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Customer-facing labels (LLD §13). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  pending_payment: 'Awaiting payment',
  paid: 'Received',
  in_progress: 'In progress',
  changes_requested: 'Changes needed',
  published: 'Published',
  rejected: 'Rejected',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/** Statuses in which the customer may edit content (orders_before_update). */
export const EDITABLE_ORDER_STATUSES = [
  'draft',
  'changes_requested',
] as const satisfies readonly OrderStatus[];

/** Statuses that block account deletion (svc_can_delete_user). */
export const ACTIVE_ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'in_progress',
  'changes_requested',
] as const satisfies readonly OrderStatus[];

export const PAYMENT_STATUSES = [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REFUND_STATUSES = ['pending', 'processed', 'failed'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const PLACEMENT_CHANNELS = ['portal', 'instagram'] as const;
export type PlacementChannel = (typeof PLACEMENT_CHANNELS)[number];

export const PLACEMENT_STATUSES = ['pending', 'live', 'failed', 'swapped'] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

export const REPORT_STATUSES = ['not_started', 'generating', 'ready', 'failed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const DEVICE_PLATFORMS = ['ios', 'android', 'web'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export const CURRENCIES = ['INR', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

// ---- Fact check ----
export const FC_INPUT_TYPES = ['text', 'url', 'image'] as const;
export type FcInputType = (typeof FC_INPUT_TYPES)[number];

export const FC_STATUSES = ['queued', 'processing', 'done', 'failed'] as const;
export type FcStatus = (typeof FC_STATUSES)[number];

export const FC_VERDICTS = ['likely_false', 'misleading', 'likely_true', 'unverified'] as const;
export type FcVerdict = (typeof FC_VERDICTS)[number];

/** Golden rule 9: never "FAKE". */
export const FC_VERDICT_LABELS: Record<FcVerdict, string> = {
  likely_false: 'Likely false',
  misleading: 'Misleading',
  likely_true: 'Likely true',
  unverified: 'Unverified',
};

export const FC_CONFIDENCES = ['low', 'medium', 'high'] as const;
export type FcConfidence = (typeof FC_CONFIDENCES)[number];

export const FC_MODES = ['full', 'reduced'] as const;
export type FcMode = (typeof FC_MODES)[number];

export const SOURCE_TIERS = ['tier1', 'tier2', 'unknown'] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

export const FC_DISCLAIMER =
  'AI-assisted analysis of publicly available sources at the time of checking. Not an official or legal determination.';

// ---- Limits (DB CHECK constraints + LLD §9.2) ----
export const LIMITS = {
  fullNameMax: 100,
  headlineMin: 10,
  headlineMax: 150,
  bodyMin: 300,
  bodyMax: 20_000,
  imagesMin: 1,
  imagesMax: 2,
  imageMaxBytes: 5 * 1024 * 1024,
  imageMaxEdgePx: 2000,
  imageJpegQuality: 0.85,
  imageMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  originalFilenameMax: 255,
  reasonMin: 10,
  factCheckTextMax: 10_000,
  factCheckImageMaxBytes: 5 * 1024 * 1024,
  guestFactChecksPerDay: 3,
  userFactChecksPerDay: 20,
  checkoutTokenTtlSeconds: 30 * 60,
  intentReuseHours: 12,
} as const;

export const PATTERNS = {
  /** E.164, e.g. +919876543210 (profiles.phone CHECK). */
  phoneE164: /^\+[1-9][0-9]{7,14}$/,
  /** orders.instagram_handle CHECK (without the leading @). */
  instagramHandle: /^[A-Za-z0-9._]{1,30}$/,
  /** register_device_token. */
  expoPushToken: /^Expo(nent)?PushToken\[.+\]$/,
} as const;

/** "How we checked this" lines, from fact_check_tool_runs.tool (LLD §11.4). Plain text, no logos. */
export const FC_TOOL_LABELS: Record<string, string> = {
  fetch_url: 'Read the linked article',
  rdap: 'Looked up website age via RDAP',
  ocr: 'Read the text in the screenshot',
  google_fact_check: 'Searched Google Fact Check Tools for existing reviews',
  google_fact_check_image: 'Searched Google Fact Check Tools for reviews of this image',
  claim_matching: 'Checked that candidate reviews cover the same claim',
  claim_extraction: 'Identified the checkable claims',
  gemini_search: 'Searched live web sources with Gemini + Google Search',
  searxng: 'Searched live web sources',
  gdelt: 'Checked news coverage via GDELT',
  wikipedia: 'Looked up background on Wikipedia',
  llm_judge: 'Compared the claim with the evidence found',
};

export const PIB_FACT_CHECK_NOTE =
  'You can also report this to PIB Fact Check (WhatsApp +91 8799711259).';
