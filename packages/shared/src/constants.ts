// Values here mirror the enums and CHECK constraints in
// supabase/migrations/20260927000000_init.sql. The SQL is the source of truth:
// if you change one side, change the other in a new migration.

// Confirmed brand name; every user-facing mention reads this.
export const BRAND_NAME = 'NewsVio';
export const APP_SCHEME = 'newsvio';
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

/** Customer-facing labels (LLD §13; wording from VERBAL_SYSTEM.md §12, §16). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  pending_payment: 'Awaiting payment',
  paid: 'In editorial review',
  in_progress: 'Being published',
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

export const PLACEMENT_CHANNELS = ['portal', 'instagram', 'facebook'] as const;
export type PlacementChannel = (typeof PLACEMENT_CHANNELS)[number];

/** Names for the social placements (portals are named by the portal itself). */
export const SOCIAL_CHANNEL_LABELS: Record<Exclude<PlacementChannel, 'portal'>, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
};

/** What one placement on each social channel is. */
export const SOCIAL_CHANNEL_POSTS: Record<Exclude<PlacementChannel, 'portal'>, string> = {
  instagram: 'Collaboration post',
  facebook: 'Page post',
};

/** Domain an editor's pasted link should be on, per social channel (mirrors the SQL check). */
export const SOCIAL_CHANNEL_DOMAINS: Record<Exclude<PlacementChannel, 'portal'>, string> = {
  instagram: 'instagram.com',
  facebook: 'facebook.com',
};

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

/** What each verdict means (VERBAL_SYSTEM.md §10). Same words on the site, app and reports. */
export const FC_VERDICT_DEFINITIONS: Record<FcVerdict, string> = {
  likely_false: 'Reliable sources contradict the main claim.',
  misleading:
    'The claim contains some truth but leaves out context, exaggerates, or presents old material as current.',
  likely_true: 'Reliable sources support the main claim.',
  unverified: 'There is not enough reliable evidence to support or reject the claim.',
};

/** Result lead for a report: a headline sentence, then what to do next (VERBAL_SYSTEM.md §10). */
export const FC_VERDICT_RESULTS: Record<FcVerdict, { headline: string; detail: string }> = {
  likely_true: {
    headline: 'This claim is likely true.',
    detail:
      'Reliable and current sources support its main points. Review the evidence below for the full context.',
  },
  misleading: {
    headline: 'This claim is misleading.',
    detail:
      'It includes accurate information but leaves out context that changes how it should be understood.',
  },
  likely_false: {
    headline: 'This claim is likely false.',
    detail: 'Reliable sources contradict its main points. See the evidence below.',
  },
  unverified: {
    headline: 'This claim is currently unverified.',
    detail:
      'We could not find enough reliable evidence to confirm or reject it. Treat it with caution and check again as new information becomes available.',
  },
};

export const FC_CONFIDENCES = ['low', 'medium', 'high'] as const;
export type FcConfidence = (typeof FC_CONFIDENCES)[number];

export const FC_MODES = ['full', 'reduced'] as const;
export type FcMode = (typeof FC_MODES)[number];

export const SOURCE_TIERS = ['tier1', 'tier2', 'unknown'] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

export const FC_DISCLAIMER =
  'AI-assisted analysis of public sources available at the time of checking. Not an official or legal determination.';

/**
 * The third-party AI services a fact check's text, link or screenshot may be sent to: Gemini
 * first, then the fallbacks (packages/fact-check router). Named to users before the first
 * check (App Store guideline 5.1.2(i)). Keep in step with the providers the worker configures.
 */
export const FC_AI_PROVIDERS = ['Google Gemini', 'Groq', 'OpenRouter'] as const;

/** Asking permission before a fact check sends anything to those providers. */
export const FC_AI_CONSENT = {
  title: 'Send this to our AI checkers?',
  body: `To check a claim, we send what you submit (text, link or screenshot) to ${FC_AI_PROVIDERS.slice(0, -1).join(', ')} or ${FC_AI_PROVIDERS.at(-1)} to read it and weigh the evidence, and search it on news and fact-check sources. Their free tiers may use it to improve their models, so leave out anything private.`,
  allow: 'Allow and check',
  decline: 'Not now',
  settingLabel: 'AI processing for fact checks',
  settingHint: 'Needed to run a fact check. Turn off to stop sending anything.',
} as const;

/** Why a check failed, and what to do next (VERBAL_SYSTEM.md §17). Keyed by fact_checks.error. */
export const FC_FAILURE_MESSAGES: Record<string, string> = {
  no_text_in_image:
    "We couldn't read enough text from this image. Upload a clearer screenshot or type the claim.",
  url_unreachable:
    "We couldn't read this link. Check that it is public, or paste the claim as text.",
  no_claims:
    "We couldn't find a checkable claim in this. Paste the specific statement you want to check.",
};
export const FC_SIGNED_IN_LIMIT_MESSAGE =
  "You've used today's free checks. Come back tomorrow to check another claim.";

export const FC_SLOW_MESSAGE = 'This check has not returned a result yet. Please try again later.';

export const FC_FAILURE_FALLBACK = "We couldn't complete this check. Please try again.";

/** Correction route on every report (VERBAL_SYSTEM.md §13). */
export const FC_CORRECTION_PROMPT =
  'Found an error or a stronger source? Send us the report link, the disputed statement and your supporting source.';

// ---- Brand lines (VERBAL_SYSTEM.md §23). Use these rather than retyping them. ----
export const BRAND_LINE = 'Check the news. Share your story.';
export const BRAND_DESCRIPTOR = 'Fact-checking and self-service PR, made simple.';
export const TRUST_LINE =
  'Evidence shown for every fact-check. Editorial review for every sponsored story.';
/** Disclosure wherever paid publishing is offered or shown. */
export const SPONSORED_DISCLOSURE =
  'Sponsored publishing. Subject to editorial approval. Distribution does not guarantee reach, rankings, sales or endorsement.';

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
  guestFactChecksPerDay: 2,
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
  google_news: 'Searched Indian and international news coverage (Google News)',
  fact_checker_search: 'Searched Indian fact-checkers (PIB, Alt News, BOOM, Factly and others)',
  gdelt: 'Checked news coverage via GDELT',
  wikipedia: 'Looked up background on Wikipedia',
  llm_judge: 'Compared the claim with the evidence found',
};

export const PIB_FACT_CHECK_NOTE =
  'You can also report this to PIB Fact Check (WhatsApp +91 8799711259).';
