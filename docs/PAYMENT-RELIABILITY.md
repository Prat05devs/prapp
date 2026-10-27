# Admin integrations and payment reliability

Owner requests, 26 October 2026: configure provider credentials in the admin dashboard;
support Razorpay test/live modes and client-owned Gemini keys; research and apply payment
reliability practices used by established payment platforms.

## Research and application

The sources below are provider documentation and OWASP guidance, reviewed on 26 October.
They describe payment-platform practices; they are not claims about an individual
retailer's internal architecture. No integration can guarantee that a bank or network
will never decline or interrupt a payment. The application must recover safely.

| Guidance | newsVio implementation |
|---|---|
| [Razorpay webhook best practices](https://razorpay.com/docs/webhooks/best-practices/): acknowledge promptly, expect retries, duplicates, and out-of-order delivery | Verify the raw-body HMAC, store an event once, acknowledge after storage, then claim/process it separately. A database failure returns 503 so Razorpay retries. |
| [Stripe webhook handling](https://docs.stripe.com/webhooks): process asynchronously and handle duplicate/stale events | Durable queue with worker leases, token-fenced completion, backoff, and current provider-state fetches before payment/refund updates. |
| [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) and [Adyen idempotency](https://docs.adyen.com/development-resources/api-idempotency): stable request identities across retries | Checkout leases serialize concurrent starts; refund requests are reserved under a payment-row lock and retain an immutable UUID across network failures. Provider mechanisms are used only where Razorpay documents support. |
| [Razorpay's idempotent refund API](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md): send `X-Refund-Idempotency` with an unchanged body | Send the stored request UUID in the header; keep the body stable. Search existing provider refunds by `notes.request_id` before another POST. Reserve outstanding amounts to prevent overlapping refunds from exceeding the captured balance. |
| [Razorpay secret rotation](https://razorpay.com/docs/webhooks/validate-test/): old retries may require the old webhook secret | Retain encrypted credential versions and webhook secrets. Each payment intent pins its API credential version; changing the active mode affects new checkouts. |
| [OWASP secrets management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html): control access, encrypt, audit, and preserve recovery capability | Server-only AES-256-GCM encryption, admin authorization at the page/API/DB boundaries, masked summaries, origin validation, immutable configuration versions, and audit records. |
| [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits): quota is per project, not per key | Named project configurations; project-scoped usage counters survive switching between keys for the same project. No automatic key rotation to bypass quotas. |

## Admin operation

1. Open **Admin → Integrations**. Editors and customers cannot use this page or its API.
2. Save a Razorpay configuration with its name, mode, key ID, key secret, and webhook secret.
   Saving does not activate it. The key ID prefix must match the selected mode.
3. Select **Use configuration**, review the mode, and confirm. Activation makes a read-only
   provider request to check API access. Live mode collects real money; managed test-mode
   checkout is restricted to admins. Existing orders cannot switch payment environments.
4. Register the webhook in Razorpay separately for each mode using the URL shown on the
   page. Store the exact same webhook secret there. A read-only API-key check cannot prove
   that the webhook secret or webhook registration is correct; verify actual event delivery.
5. For Gemini, save a project ID, key, text/OCR models, and request budget. Activation checks
   model access without generating content. Enable search grounding only for a project
   whose billing/access you have checked. Client-owned keys require permission for this
   application's processing. Select the configuration to use; switching is manual.

Secrets are never returned to the browser after saving. Update a key by creating and
activating a new version. The dashboard manages stored configurations; it does not create,
regenerate, revoke, or register credentials/webhooks inside the provider's own account.

`CONFIG_MASTER_KEY` must contain a base64-encoded 32-byte random key and be available to
both the web backend and fact-check worker. Keep it server-side and back it up separately
from the database. Losing it makes the saved credentials unreadable. Master-key rotation
requires a deliberate re-encryption procedure; changing the environment variable alone
will not rotate saved values. Existing environment credentials remain the fallback until
a dashboard configuration is activated; retain historical environment keys while legacy
payment intents are unsettled.

Do not revoke an old API key merely because another configuration was activated: older
intents and refunds are pinned to it. If a key is compromised, revoke it at the provider
and reconcile affected payments with replacement credentials as an operational incident.
Retaining an encrypted copy cannot make a revoked API key usable.

## Recovery and scheduling

- `POST /api/cron/payment-webhooks`: run every minute with `Authorization: Bearer CRON_SECRET`.
  It claims queued events, fetches current provider state, and calls existing `svc_*`
  business functions. Failed work remains queued with backoff; stale worker claims expire.
- `POST /api/cron/reconcile-payments`: retain the ten-minute schedule. It reconciles payments,
  pending refunds, and reserved refund requests whose response was lost. Recovery continues
  even if new checkout is switched to free/link mode.
- Rejection and its refundable balance reservation commit in one transaction. The worker
  can complete the refund after a process restart even if the route never reached Razorpay.
- After 24 hours, an unknown refund outcome that cannot be found at the provider is flagged
  for manual reconciliation; it is not blindly resubmitted indefinitely.
- Provider requests have timeouts; transient HTTP failures on GET requests receive a bounded
  retry with jitter. Payment creation and capture are not blindly retried as generic POSTs.

The scheduler must be running before deploying the asynchronous webhook handler. Hosted
transition migrations register its pg_cron job when available. The standalone deployment
still needs its own worker scheduler, monitoring, uptime checks, and backup/restore setup.

Monitor webhook queue age/errors, unresolved refund reservations, Razorpay webhook delivery
status, and the Admin attention list. An authenticated duplicate is safely acknowledged;
an error storing an event must not be acknowledged as success.

## Validation and remaining launch work

Local checks cover the schema on PostgreSQL 17, runtime role separation/RLS, pooled identity
isolation, credential encryption/tamper rejection, admin-only API access, input validation,
webhook deduplication/rotation/deferred processing, refund response-loss recovery, checkout
leases, and atomic rejection/refund reservations. The SQL runner now fails immediately on
migration or test SQL errors instead of hiding them behind its output filter.

Before production, complete the full LLD §9.10 scenarios against Razorpay test mode, including
concurrent requests, out-of-order events, process restarts, signature failures, mode changes,
and a timeout after the provider accepts a refund. Then perform a deliberately initiated,
small live payment and refund with the owner. No real charge/refund is part of automated
verification. Test keys and production deployment access have not been supplied in chat.

The full Supabase removal remains a separate implementation phase in `DEPLOYMENT.md`.
These changes must not be described as a completed server cutover.
