import { router } from 'expo-router';
import type { AuthMode } from '@/hooks/use-password-auth';

/** Why we're asking: shown as the sign-in screen's lede, so the ask is never out of the blue. */
export const SIGN_IN_REASONS = {
  'fact-check':
    "You've used today's free checks. Log in or create a free account to keep checking.",
  publish: 'Log in or create an account to save your story, add photos and pay.',
  orders: 'Log in to see your orders and their delivery reports.',
  notifications: 'Log in to get updates about your orders and fact checks.',
} as const;

export type SignInReason = keyof typeof SIGN_IN_REASONS;

/**
 * Opens sign-in as a modal over the current screen. It closes by itself once the session exists
 * (Stack.Protected in the root layout), returning the user to where they were.
 */
export function promptSignIn(opts: { mode?: AuthMode; reason?: SignInReason } = {}) {
  router.push({
    pathname: '/sign-in',
    params: {
      ...(opts.mode ? { mode: opts.mode } : {}),
      ...(opts.reason ? { reason: opts.reason } : {}),
    },
  });
}
