// Error code catalogue (LLD §16). SQL functions raise these codes as the
// exception message; the API returns them as { error: { code, message } }.

export const ERROR_MESSAGES = {
  not_authenticated: 'Please sign in to continue.',
  not_authorized: "You don't have access to this.",
  profile_incomplete: 'Add your name and phone number to continue.',
  too_many_orders_today: "You've created too many orders today. Try again tomorrow.",
  package_unavailable: "This package isn't available right now. Pick another.",
  package_locked_after_payment: "The package can't be changed after payment.",
  order_locked: "This order can't be edited right now.",
  order_not_found: 'Order not found.',
  invalid_storage_path: 'You can upload up to 2 images.',
  too_many_images: 'You can upload up to 2 images.',
  image_required: 'Add at least one image.',
  declaration_required: 'Please accept the declaration to continue.',
  order_not_payable: "This order can't be paid.",
  payment_already_made: "We've already received a payment for this order.",
  order_not_reopenable: "This order can't be edited now.",
  order_not_cancellable: 'Only drafts can be cancelled.',
  order_not_resubmittable: "This order isn't waiting for changes.",
  illegal_transition: "That action isn't allowed for this order's current status.",
  order_not_claimable: 'Someone else already picked up this order.',
  order_not_releasable: 'This order is assigned to another editor.',
  order_assigned_to_someone_else: 'This order is assigned to another editor.',
  order_not_in_progress: 'Claim the order first.',
  placement_not_found: 'This placement was replaced. Refresh.',
  placement_swapped: 'This placement was replaced. Refresh.',
  choose_portal_first: 'Choose a portal for this slot first.',
  invalid_url: 'Paste the full link starting with https://',
  placement_already_live: 'This portal already has a live link.',
  portal_unavailable: "That portal can't be used.",
  not_a_portal_placement: "That portal can't be used.",
  reason_required: 'Please write a clear reason (at least 10 characters).',
  order_not_editable: "Changes can't be requested at this stage.",
  placements_pending: 'Some placements still need links.',
  placements_failed: 'Replace the failed portals, or ask an admin to publish as partial.',
  nothing_published: 'Add at least one live link before publishing.',
  empty_note: 'Write a note first.',
  not_a_staff_member: "That user isn't an active staff member.",
  order_not_assignable: "That action isn't available for this order.",
  order_not_rejectable: "That action isn't available for this order.",
  order_not_published: "That action isn't available for this order.",
  cannot_remove_last_admin: "You can't remove the only admin.",
  cannot_deactivate_yourself: "You can't deactivate your own account.",
  user_not_found: 'User not found.',
  invalid_push_token: 'Invalid push token.',
  account_has_active_orders:
    "You have an active order. You can delete your account once it's completed.",
  fact_check_limit_reached: "You've used today's free checks. Sign in for more, or try tomorrow.",
  no_text_in_image: "We couldn't find any text in this image.",
  checkout_link_expired: 'This payment link expired. Tap Pay again.',
  // DECISION: the catalogue has no generic codes for bad input, rate limits or
  // unexpected failures; the API needs them, so they are added here.
  staff_email_taken:
    'An account with this email already exists. Search for it below and change its role instead.',
  user_not_staff: 'Passwords can only be set for team accounts (editors and admins).',
  validation_failed: 'Please check the highlighted fields.',
  rate_limited: 'Too many requests. Please wait a moment and try again.',
  internal_error: 'Something went wrong. Please try again.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

const HTTP_STATUS: Partial<Record<ErrorCode, number>> = {
  not_authenticated: 401,
  not_authorized: 403,
  order_not_found: 404,
  user_not_found: 404,
  placement_not_found: 404,
  validation_failed: 422,
  too_many_orders_today: 429,
  fact_check_limit_reached: 429,
  rate_limited: 429,
  internal_error: 500,
};

export function isErrorCode(value: string): value is ErrorCode {
  return Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, value);
}

export function errorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code];
}

/** 4xx for every business-rule error; conflicts (state machine) are 409. */
export function httpStatusFor(code: ErrorCode): number {
  return HTTP_STATUS[code] ?? 409;
}

export function apiErrorBody(code: ErrorCode, details?: unknown): ApiErrorBody {
  return {
    error: { code, message: errorMessage(code), ...(details === undefined ? {} : { details }) },
  };
}

interface DbErrorLike {
  code?: string | null;
  message?: string | null;
}

/**
 * Maps a Postgres / PostgREST error to a catalogue code.
 * SQL raises e.g. `order_locked` or `illegal_transition draft -> paid`
 * (the first word is the code).
 */
export function errorCodeFromDb(err: DbErrorLike | null | undefined): ErrorCode {
  const message = (err?.message ?? '').trim();
  const firstWord = message.split(/\s/, 1)[0] ?? '';
  if (isErrorCode(firstWord)) return firstWord;
  // 42501 = insufficient_privilege (RLS / missing column grant)
  if (err?.code === '42501') return 'not_authorized';
  // 23514 = check_violation, 22P02 = invalid_text_representation, 23502 = not_null_violation
  if (err?.code === '23514' || err?.code === '22P02' || err?.code === '23502') {
    return 'validation_failed';
  }
  return 'internal_error';
}
