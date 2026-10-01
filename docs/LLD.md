# Low-Level Design — PR + Fact-check platform

Status: **LOCKED v1.0** (2026-09-27). Changes need an entry in §21 (changelog).
Companion files: `CONTEXT.md` (rules) and `supabase/migrations/20260927000000_init.sql` (database, source of truth).

## Contents
1. Scope
2. Glossary
3. Architecture and hosting
4. Libraries
5. Environment variables
6. Authentication and profile
7. Data model summary
8. API contract
9. PR order and payment flow
10. Admin panel (web only)
11. Fact-check system
12. Notifications
13. Screens and pages inventory
14. Scheduled jobs
15. Security checklist
16. Error code catalogue
17. Testing strategy
18. Build phases and acceptance criteria
19. Seed data
20. Open decisions and defaults
21. Changelog

---

## 1. Scope

### In scope (v1)
- Sign-in with Google and with email OTP; phone number required before any order
- Fact checker: text, link or screenshot; verdict + sources + tools used; share link, share image and PDF; guest limits
- PR: draft → pay (Razorpay) → manual posting by editors → PDF delivery report
- Customer order history, order detail, report download
- Notifications: in-app list, push (app), email
- Support contacts (call, email, WhatsApp) from settings
- Admin panel (web): order queue, claiming, placements, image download, request changes,
  publish, reject/refund, payments view (live from Razorpay), portals, packages, staff,
  showcase stories, settings, attention list
- Website landing page: fact-check hero, PR section with portal names, weekly showcase,
  how it works, footer
- Account deletion (store requirement)

### Out of scope (v2, do not build)
- Trending fact checks feed (needs its own ingestion job)
- Live per-portal progress for customers (customers see status only; links appear at publish)
- Automated posting to portals or Instagram
- Phone OTP / SMS
- Multiple admins with granular permissions (only `user`, `editor`, `admin`)
- Coupons, wallets, subscriptions, invoices/GST automation
- Hindi UI translation (content can be Hindi; UI is English for v1, but keep strings in one file)

## 2. Glossary

| Term | Meaning |
|---|---|
| Order | One PR submission (`public.orders`) |
| Intent | One Razorpay order created for an order (`payment_intents`). Retrying checkout can create a new intent |
| Payment | One Razorpay payment attempt on an intent (`payments`) |
| Placement | One destination to publish on: a portal or our Instagram (`order_placements`) |
| Editor | Data-entry staff member who posts stories |
| Report | For PR, the PDF delivery report with all links. For fact-checks, the verdict report (web page / image / PDF) |
| Backend | Next.js route handlers or Edge Functions using the service role key |

## 3. Architecture and hosting

```
 Expo app ──HTTPS (Bearer JWT)──┐
                                ├──> Next.js on Vercel  (/api/*, /pay/*, /r/*, website, /admin)
 Browser  ──cookies────────────┘          │  service role (server only)
                                          ▼
                        Supabase: Postgres (RLS) · Auth · Storage · pg_cron · Edge Functions
                                          ▲                                  │
 Razorpay ──webhooks──> /api/webhooks/razorpay                               │
 Razorpay <──Orders/Payments/Refunds API── Next.js                           ▼
                                             fact-check-worker (Edge Fn) ──> Gemini, Google Fact Check,
                                             send-notifications (Edge Fn) ─> Expo push, email   GDELT, Wikipedia, RDAP
```

- **Vercel:** Hobby while building. **Pro is required before accepting real payments**
  (Hobby is non-commercial only).
- **Supabase:** Free while building. **Pro recommended at launch** (free projects pause after
  7 days of inactivity and have no backups). Until then, run a daily `pg_dump` from a GitHub Action.
- **Route handlers that use Node APIs** (PDF, crypto HMAC) must set `export const runtime = 'nodejs'`.
- **Region:** choose Mumbai (`ap-south-1`) for Supabase and `bom1` for Vercel functions.

## 4. Libraries

| Purpose | Package |
|---|---|
| Supabase (web SSR) | `@supabase/ssr`, `@supabase/supabase-js` |
| Supabase (mobile) | `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `expo-secure-store` (LargeSecureStore pattern from Supabase docs), `react-native-url-polyfill` |
| Google sign-in (mobile) | `@react-native-google-signin/google-signin` → `supabase.auth.signInWithIdToken` |
| Payments | `razorpay` (Node SDK, server only); Razorpay `checkout.js` on the `/pay` page |
| Browser for checkout (mobile) | `expo-web-browser` (`openAuthSessionAsync`) + `expo-linking` |
| Push | `expo-notifications`, `expo-device`; server sends via Expo push HTTP API |
| Images (mobile) | `expo-image-picker`, `expo-image-manipulator` (resize + re-encode strips EXIF) |
| Images (web) | `browser-image-compression` (strips EXIF), or a canvas re-encode |
| Validation | `zod` |
| PDF | `@react-pdf/renderer` |
| Share image | `next/og` |
| QR code | `qrcode` |
| Phone | `libphonenumber-js` |
| Article extraction | `@mozilla/readability` + `linkedom` (Edge-compatible DOM) |
| OCR fallback | `tesseract.js` (worker only) |
| Admin UI tables/forms (web) | `shadcn/ui` + `@tanstack/react-table` + `react-hook-form` |
| Tests | `vitest`, SQL tests in `/test` |

## 5. Environment variables

Commit `.env.example` with these names. `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` are public; everything else is secret.

| Name | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | web | publishable key |
| `SUPABASE_SECRET_KEY` | web server | secret API key (server only) |
| `NEXT_PUBLIC_SITE_URL` | web | e.g. `https://example.in` |
| `RAZORPAY_KEY_ID` | web server | also sent to the /pay page (public by design) |
| `RAZORPAY_KEY_SECRET` | web server | signature verification + API |
| `RAZORPAY_WEBHOOK_SECRET` | web server | webhook signature |
| `RAZORPAY_LIVEMODE` | web server | `true`/`false`, stored on intents |
| `CHECKOUT_TOKEN_SECRET` | web server | HMAC secret for `/pay/[token]` links |
| `CRON_SECRET` | web server + Vault | protects `/api/cron/*` |
| `GEMINI_API_KEY` | edge fn | Gemini |
| `GOOGLE_FACTCHECK_API_KEY` | edge fn | Fact Check Tools API |
| `GROQ_API_KEY`, `CLOUDFLARE_AI_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `OPENROUTER_API_KEY` | edge fn | LLM fallbacks (optional) |
| `SEARXNG_URL` | edge fn | optional self-hosted search fallback |
| `EMAIL_API_KEY`, `EMAIL_FROM` | edge fn, web server | transactional email |
| `EXPO_ACCESS_TOKEN` | edge fn | Expo push (recommended) |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | mobile | Supabase |
| `EXPO_PUBLIC_API_URL` | mobile | = site URL |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | mobile | Google sign-in |

---

## 6. Authentication and profile

### 6.1 Providers (Supabase Auth)
- **Google.** Web uses the OAuth redirect (`signInWithOAuth`, callback route `/auth/callback`
  exchanges the code). Mobile uses native Google sign-in → `signInWithIdToken({ provider: 'google', token: idToken })`.
  In Supabase, set the Web client ID plus the iOS/Android client IDs as authorised client IDs.
- **Email OTP.** Call `signInWithOtp({ email, options: { shouldCreateUser: true } })`, then
  `verifyOtp({ email, token, type: 'email' })`. Edit the Supabase "Magic Link" email template to show
  `{{ .Token }}` (a 6-digit code), not a link. OTP expiry is 600 s. Configure custom SMTP (the built-in
  mailer is for testing only). Keep Supabase's built-in rate limits on.
- The same email means the same user. Enable automatic identity linking in Supabase.

### 6.2 Profile
- The trigger `on_auth_user_created` creates the `profiles` row (name from Google metadata if present).
- `GET /api/me` returns `{ id, fullName, email, phone, role, profileComplete }`.
  `profileComplete = fullName !== '' && phone !== null`.
- **Complete profile screen** (shown once): full name (prefilled), phone with country picker
  (default +91). Validate with `libphonenumber-js` and store E.164 (`+919876543210`). The DB CHECK
  enforces the format. Phone numbers are **not unique** (families share them) and **not verified** by SMS.
- Any order action with an incomplete profile fails with `profile_incomplete`. Clients route to the complete-profile screen.

### 6.3 Sessions
- Web: `@supabase/ssr` cookies. `middleware.ts` refreshes the session on every request and protects
  `/orders/*`, `/account/*` and `/admin/*` (admin also checks role server-side; RLS still enforces it).
- Mobile: supabase-js with the LargeSecureStore adapter; `autoRefreshToken: true`. On
  `SIGNED_OUT`, clear caches and the device token registration.
- Sign out: `supabase.auth.signOut()` (revokes the refresh token server-side).

### 6.4 Roles
- `user` (default), `editor`, `admin`. **Bootstrap:** after your first login, run once in the SQL editor:
  `update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';`
  After that, use `admin_set_role` from the Staff screen. The last admin cannot be demoted.

### 6.5 Account deletion (`DELETE /api/me`)
1. Call `svc_can_delete_user(uid)`. If false, return 409 `account_has_active_orders`.
2. Delete the user's storage objects in `fact-check-uploads` (their order images and reports stay, for records).
3. `auth.admin.deleteUser(uid)`. The FKs cascade profile, notifications and device tokens; orders
   keep a contact snapshot with `user_id = null`; fact checks set `user_id = null`.
4. Web and app sign out locally.

---

## 7. Data model summary

Full definitions are in the migration. Key tables:

| Table | Purpose | Who writes |
|---|---|---|
| `profiles` | user info + role | trigger; user (name, phone, avatar); admin via RPC (role) |
| `app_settings` | support contacts, limits | admin |
| `portals`, `packages`, `package_portals` | catalogue | admin |
| `orders` | PR submission + lifecycle | user (content columns only); RPCs; backend |
| `order_images` | 1–2 images per order | user while editable |
| `payment_intents` | one per Razorpay order | backend (`svc_create_payment_intent`) |
| `payments` | one per Razorpay payment | backend (`svc_apply_payment`) |
| `refunds` | refunds | backend (`svc_apply_refund`) |
| `webhook_events` | webhook idempotency | backend |
| `order_placements` | per portal / Instagram | created on payment; editors via RPC |
| `order_events` | audit trail | triggers + RPCs |
| `notifications`, `device_tokens` | messaging | triggers/backend; user registers token via RPC |
| `showcase_stories` | website "recently published" | staff |
| `trusted_sources` | fact-check source tiers | admin |
| `fact_checks`, `fact_check_claims`, `fact_check_sources`, `fact_check_tool_runs` | fact-check results | backend worker |
| `usage_counters`, `provider_usage` | rate limits, AI quota | backend |

### 7.1 Order state machine (enforced by trigger `orders_before_update`)

```
draft ──checkout──> pending_payment ──captured──> paid ──claim──> in_progress ──publish──> published
  │                    │   ▲                        │  ▲              │   │                    │
  │cancel              │   └─reopen(edit)─ draft    │  └─release──────┘   │                    │ admin reopen
  ▼                    ▼                            ▼                     ▼                    ▼
cancelled           expired (24h, no payment)   changes_requested <───────┘              in_progress
   │                    │                           │ user resubmit → paid (new 24h deadline)
   └──late capture──────┴──> paid                   │
                                        admin reject from paid/in_progress/changes_requested → rejected ──full refund──> refunded
                                        backend full refund from paid/in_progress/changes_requested/published → refunded
```

Allowed transitions per actor are listed in `private.transition_allowed`. Side effects:
- → `paid` (from payment): `paid_at`, `deadline_at = paid_at + package turnaround`; placements created.
- `changes_requested` → `paid`: new `deadline_at = now() + turnaround`.
- `in_progress` → `paid` (release): `assigned_to` cleared.
- → `published`: `published_at`, `report_status = 'generating'`.

### 7.2 Storage buckets

| Bucket | Public | Path | Access |
|---|---|---|---|
| `order-images` | no | `{user_id}/{order_id}/{uuid}.{ext}` | owner uploads/deletes while draft/changes_requested; owner + staff read |
| `reports` | no | `{user_id}/{order_id}/report-v{n}.pdf` | backend writes; owner + staff read (signed URLs) |
| `fact-check-uploads` | no | `{device_or_user}/{fact_check_id}.{ext}` | backend only; delete after 30 days |
| `fact-check-share` | no | `{report_id}/share.png`, `{report_id}/report.pdf` | backend only; served via `/r/*` routes |
| `public-assets` | yes | `portals/{id}.png`, `showcase/{id}.jpg` | staff write; anyone read |

---

## 8. API contract

All routes live under `apps/web/src/app/api`. Auth is cookie (web) or `Authorization: Bearer` (mobile).
Every body is validated with zod. Errors use the format `{ error: { code, message } }`.

Clients may read and write some things **directly via supabase-js under RLS** (marked "direct").
Everything involving money, secrets or other users goes through the API.

### 8.1 Customer

| Method & path | Auth | Purpose | Notes |
|---|---|---|---|
| direct `profiles` select/update | user | read/update name, phone | column grants restrict fields |
| `GET /api/me` | user | profile + `profileComplete` | |
| `DELETE /api/me` | user | delete account | §6.5 |
| direct `packages`, `portals` select | anon | catalogue | |
| direct `app_settings` select | anon | support contacts, limits | `is_public` only |
| direct `orders` insert/update/delete | user | draft CRUD | content columns only |
| direct Storage upload + `order_images` insert/delete | user | images | §9.3 |
| `POST /api/orders/:id/checkout` | user | start/reuse payment | §9.4 |
| `POST /api/orders/:id/reopen` | user | edit an unpaid order | §9.4 |
| `GET /api/orders/:id` | user | order + status + (if published) placements + signed report URL | |
| direct RPC `user_cancel_order`, `user_resubmit_order` | user | | |
| `GET /api/orders/:id/report` | user/staff | 302 to a 5-minute signed URL of the latest PDF | |
| direct `notifications` select, update `read_at` | user | | |
| direct RPC `register_device_token` | user | on app start / login | |

### 8.2 Payment (server + Razorpay)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /pay/[token]` (page) | checkout token | hosted Razorpay checkout page (web + app) |
| `POST /api/payments/callback` | Razorpay POST (form) | Razorpay `callback_url`; verifies, applies, redirects |
| `POST /api/webhooks/razorpay` | HMAC signature | webhooks |
| `POST /api/cron/reconcile-payments` | `CRON_SECRET` | every 10 min |

### 8.3 Admin / staff (all under `/api/admin/*`; server checks role, RLS enforces too)

| Method & path | Role | Purpose |
|---|---|---|
| direct `orders`/`order_placements`/`order_images`/`order_events` select | editor+ | queue, detail |
| direct RPC `staff_*` | editor+ | claim, release, links, swap, fail, request changes, publish, notes |
| `POST /api/admin/orders/:id/publish` | editor+ | calls `staff_mark_published` → generates PDF → `svc_set_report` |
| `POST /api/admin/orders/:id/regenerate-report` | admin | retries PDF |
| `GET /api/admin/orders/:id/images.zip` | editor+ | zips the order's images (optional convenience) |
| `GET /api/admin/orders/:id/payment` | admin | live Razorpay data: intents → Razorpay order + payments |
| `POST /api/admin/orders/:id/reject` | admin | `admin_reject_order` (as user) → full refund via Razorpay (service) |
| `POST /api/admin/orders/:id/refund` | admin | partial/duplicate refund `{ paymentId, amountMinor, reason }` |
| direct RPC `admin_*` | admin | assign, reopen, clear attention, set role, activate staff |
| direct CRUD `portals`, `packages`, `package_portals`, `app_settings`, `trusted_sources` | admin | |
| direct CRUD `showcase_stories` + upload to `public-assets` | editor+ | |

### 8.4 Fact-check

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/fact-checks` | guest (device id) or user | submit; returns `{ id, reportId, status }` |
| `GET /api/fact-checks/:id` | owner (user or same device id) | poll result |
| `GET /api/me/fact-checks` | user | history (or direct select) |
| `PATCH /api/fact-checks/:id` | owner | `{ isPublic }` |
| `GET /r/[reportId]` (page) | public if `is_public` | report page with OG tags |
| `GET /r/[reportId]/image.png` | public if `is_public` | share image (cached in `fact-check-share`) |
| `GET /r/[reportId]/report.pdf` | public if `is_public` | PDF (cached) |
| `GET /api/cron/pending-fact-checks` | `CRON_SECRET` | re-run reduced checks after quota reset |

---

## 9. PR order and payment flow

> **DECISION (owner, 2026-09-30): free checkout during testing.** With `PAYMENTS_MODE=free`
> (server) and `EXPO_PUBLIC_PAYMENTS_MODE=free` (app labels), checkout runs every check in §9.4
> and then calls `svc_confirm_free_order` (migration `20260930000000_free_checkout.sql`)
> instead of creating a Razorpay order. The order becomes `paid` at `amount_minor = 0`, with no
> `payment_intents` or `payments` rows. Deadline, placements, notifications and the staff queue
> work as for a paid order. This is a deliberate exception to golden rule 2. Unset or
> `razorpay` restores the flow below unchanged.

### 9.1 Packages and pricing
- Packages come from the DB (`price_inr_paise`, optional `price_usd_cents`, `portal_count`,
  `includes_instagram`, `turnaround_hours`, default 24). The entry package is ₹499 = `49900`.
- Currency: **INR only in v1** unless Razorpay international payments are activated
  (then show USD for non-IN users and use `price_usd_cents`).
- The public listing shows portal names (`portals.show_publicly`) for credibility; never promise a fixed count like "150+".

### 9.2 Submission form (client validation mirrors DB constraints)

| Field | Rule |
|---|---|
| Headline | 10–150 chars (trimmed) |
| Article | 300–20,000 chars; plain text with paragraphs (store as text; no HTML) |
| Images | 1 required, max 2; jpg/png/webp; ≤ 5 MB after compression; client resizes to max 2000 px on the long edge, JPEG q≈0.85, EXIF stripped |
| Instagram handle | optional; `^[A-Za-z0-9._]{1,30}$` (strip leading `@`) |
| Package | required, active |
| Feature consent | optional checkbox: "You may feature my story on your website" |
| Declaration | required checkbox: "This content is mine and accurate, and I understand it will be published as sponsored content" → sets `declaration_accepted_at` |

Show under the Instagram field: "We'll invite you as a collaborator. Accept the request within 24 hours or the post goes out with a tag only."

### 9.3 Draft and images sequence
1. Insert the `orders` row (direct, RLS). Get `id`, `order_number`.
2. For each image: upload to `order-images/{uid}/{orderId}/{uuid}.{ext}` → insert `order_images`
   (`position` 1 or 2, `mime_type`, `size_bytes`, `width`, `height`, `original_filename`).
   If the row insert fails, delete the uploaded object.
3. Replacing an image: delete the row + object, then upload the new one.
4. Drafts save automatically (debounced update of content columns).

### 9.4 Checkout — `POST /api/orders/:id/checkout`
Server steps:
1. Load the order as the user (RLS). It must be `draft`, `pending_payment` or `expired`.
2. Validate server-side: profile complete, declaration set, 1–2 images present, **and each image
   exists in Storage** (list the folder).
3. Load the package (service client). It must be active. Compute `amount_minor` and `currency`
   from the DB. Build `package_snapshot = { id, code, name, price_inr_paise, price_usd_cents, portal_count, includes_instagram, turnaround_hours }`.
4. **Reuse** the current intent if one exists with the same amount/currency, is less than 12 h old,
   and has status `created`/`attempted`. Otherwise:
   - If an old intent exists, fetch its payments from Razorpay. If any is `authorized`/`captured`,
     apply them via `svc_apply_payment` and return `409 payment_already_made`. Otherwise continue.
   - Create a Razorpay order: `{ amount, currency, receipt: order_number, notes: { order_id, user_id, app: 'prapp' } }`.
   - `svc_create_payment_intent(order_id, rzp_order_id, amount, currency, snapshot, livemode)`.
5. Create a **checkout token**: HMAC-signed `{ orderId, intentId, exp: now+30min }` (base64url payload + signature).
6. Respond: `{ checkoutUrl: SITE/pay/<token>, razorpayOrderId, amountMinor, currency }`.

`POST /api/orders/:id/reopen` (customer wants to edit while `pending_payment`/`expired`):
fetch the Razorpay payments of the current intent. If any is authorized/captured, apply it and return 409.
Otherwise call `svc_reopen_order`.

### 9.5 Paying — hosted `/pay/[token]` page (same for web and app)
- Server component: verify the token (signature + expiry) and load the intent + order summary with the
  service client. If the order is already `paid` or later, redirect to the result.
- Render the order summary + a "Pay ₹499" button that opens Razorpay Standard Checkout (`checkout.js`) with:
  `key, amount, currency, order_id, name, description (order_number), prefill { name, email, contact }, notes { order_id }, theme, callback_url: SITE/api/payments/callback?t=<token>, redirect: true`.
  Using `callback_url` + `redirect` makes UPI app switching work in mobile browsers.
- **Web:** navigate the tab to `/pay/[token]`.
- **App:** `WebBrowser.openAuthSessionAsync(checkoutUrl, 'prapp://payment-result')`. The callback
  redirects to `prapp://payment-result?order=<id>&status=<success|failed|pending>`, which closes the browser.
  If the user closes it manually, treat the result as "unknown" and poll.

### 9.6 Callback — `POST /api/payments/callback?t=<token>`
Razorpay posts `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` on success, or `error[...]` fields on failure.
1. Verify the token. Verify the signature: `HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET) == signature` (timing-safe compare).
2. **Fetch the payment from the Razorpay API** (never trust posted data alone). If it's `authorized` and
   not captured, capture it (`payments.capture(id, amount, currency)`) and refetch.
3. `svc_apply_payment(rzp_order_id, payment_id, status, amount, currency, method, error_code, error_desc, captured_at, raw)`.
4. Redirect: web → `/orders/:id?payment=success|failed|pending`; app → `prapp://payment-result?...`.
   On failure, redirect with `status=failed&reason=<error.description>`.

### 9.7 Webhooks — `POST /api/webhooks/razorpay` (`runtime = 'nodejs'`)
Subscribe to: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`,
`refund.created`, `refund.processed`, `refund.failed`, `payment.dispute.created`.
```
raw = await req.text()                              // raw body, before JSON.parse
verify HMAC_SHA256(raw, WEBHOOK_SECRET) == header 'x-razorpay-signature'   else 400
eventId = header 'x-razorpay-event-id'
if !(await rpc('svc_record_webhook', {eventId, type, payload})) return 200   // duplicate
try:
  if payload.notes?.app !== 'prapp' (check payment.entity.notes / order.entity.notes): finish, return 200
  switch type:
    payment.* / order.paid → p = payload.payment.entity
        if p.status == 'authorized' → capture via API, refetch
        svc_apply_payment(p.order_id, p.id, p.status, p.amount, p.currency, p.method, p.error_code, p.error_description, p.captured_at, p)
    refund.*            → r = payload.refund.entity
        svc_apply_refund(r.payment_id, r.id, r.amount, map(r.status), reason from notes, null, r)
    payment.dispute.created → set orders.needs_attention='dispute_opened' (service update) + email admin
  svc_finish_webhook(eventId, null)
catch e: svc_finish_webhook(eventId, e.message); return 200   // log it; reconciliation will fix state
```
Respond within 5 s (Razorpay retries for 24 h and disables the webhook after continuous failure).
Map `svc_apply_payment` results to logs: `paid`, `already_paid`, `duplicate` (email admin),
`amount_mismatch` (email admin), `unknown_intent` (ignore).

### 9.8 Reconciliation — `POST /api/cron/reconcile-payments` (pg_cron every 10 min)
1. Intents with status `created`/`attempted`, created in the last 72 h, whose order is not yet paid
   (plus all orders in `pending_payment`/`expired`). For each: `GET /orders/:rzp_order_id/payments`.
   Capture any `authorized` ones. Apply each via `svc_apply_payment`.
2. Refunds in `pending` for more than 30 min: fetch from Razorpay and apply via `svc_apply_refund`.
3. Return counts. Keep it idempotent and time-boxed (stop after 50 s).

### 9.9 Refunds
- **Rejection (admin):** `/api/admin/orders/:id/reject` → RPC `admin_reject_order` with the admin's
  JWT (the audit log records the admin) → Razorpay `payments.refund(paid_payment_id, { amount: full, notes: { order_id, reason } })`
  → `svc_apply_refund(..., status 'pending', reason, admin_id)`. The webhook later moves it to processed → order `refunded`.
- **Duplicate payment:** attention list → "Refund duplicate" → refund that payment in full. The order is unaffected; the attention flag clears automatically.
- **Partial delivery:** admin enters the amount → partial refund on `paid_payment_id`. The order stays `published`. Clear the attention flag with a note.
- Tell customers that refunds take 5–7 working days to reach their bank.

### 9.10 Payment and order edge cases (all must be handled)

| # | Case | Handling |
|---|---|---|
| 1 | Double tap Pay | checkout reuses the intent (§9.4 step 4) |
| 2 | Callback and webhook both arrive | `svc_apply_payment` idempotent → `already_paid` |
| 3 | App/browser closed after paying | webhook or reconciliation marks paid; app polls `GET /api/orders/:id` on focus |
| 4 | Callback never arrives (network) | same as 3 |
| 5 | Webhooks duplicated or out of order | event-id dedupe; payment status only moves forward |
| 6 | Payment failed | order stays `pending_payment`; user can retry on the same intent |
| 7 | UPI fails then succeeds late | failed → captured allowed; order paid even if `expired`/`cancelled` |
| 8 | Paid twice (two attempts or two intents) | 2nd = `duplicate`, attention flag, admin refunds |
| 9 | Tampered amount | amount from DB; captured ≠ intent amount → `amount_mismatch`, not paid, admin alerted |
| 10 | Authorized, not captured | auto-capture ON in Razorpay settings; callback/webhook/reconcile capture it |
| 11 | Price changed after checkout | intent snapshot is honoured; re-checkout after 12 h creates a new intent at the new price |
| 12 | Edit during pending payment | blocked; "Edit" → `/reopen` (checks Razorpay first) |
| 13 | Package or portal deactivated after purchase | snapshot keeps the package; editor swaps portals |
| 14 | Not enough active default portals | empty slots (`portal_id null`) for the editor to fill |
| 15 | Portal down | editor marks failed → swap; if impossible, admin publishes partial + partial refund |
| 16 | Wrong link pasted | domain mismatch warning; editable until publish; admin can reopen after publish (report v2) |
| 17 | Two editors on one order | claim lock (`staff_claim_order`); editor deactivated → their orders released |
| 18 | Deadline near/missed | staff warned 2 h before; customer gets one delay message |
| 19 | Content problem (blurry image, typo) | request changes → customer edits → resubmit (new 24 h) |
| 20 | Unpublishable content | admin reject → automatic full refund |
| 21 | Dispute/chargeback | attention flag + admin email |
| 22 | Draft spam | max 10 new orders per user per 24 h; drafts untouched for 7 days **with no payment intents** deleted by cleanup cron (images first, then row) |
| 23 | Account deletion with active order | blocked (409) |
| 24 | Webhook for another app on the same Razorpay account | `notes.app` check → ignored |
| 25 | Test vs live keys | `livemode` stored on intents; separate env per deployment |
| 26 | Checkout token expired | `/pay` shows "Link expired", button calls checkout again |
| 27 | PDF generation fails | order `published` with `report_status='failed'`; admin "Regenerate"; customer notified only when ready |
| 28 | Instagram collab not accepted / handle invalid | post with a tag only; editor adds a note on the placement |

### 9.11 PR delivery report (PDF)
Template `packages/report-templates/pr-report.tsx` (@react-pdf):
1. Header: brand, "Publication report", `order_number`, published date (IST)
2. Customer name, headline, package name
3. Table: # · Platform (portal name / "Instagram @page") · Live link (clickable) · Published at (IST)
4. Note: "Sponsored content published by <brand> on its partner network."
5. Footer: support phone/email/WhatsApp, "Report version n", generated timestamp

Generation (in `/api/admin/orders/:id/publish`, after `staff_mark_published`):
render → upload `reports/{user_id}/{order_id}/report-v{version+1}.pdf` → `svc_set_report(order_id, 'ready', path)`.
The trigger then notifies the customer. Email includes the PDF as an attachment (≤ 2 MB) or a link to `/orders/:id`.

---

## 10. Admin panel (web only, `/admin`)

Layout guard: server-side `getUser()` + profile role ∈ {editor, admin}, else 404.
Admin-only sections are hidden for editors **and** the DB rejects them anyway.

### 10.1 Screens

| Route | Role | Content & actions |
|---|---|---|
| `/admin` | editor+ | Counters: Paid (unclaimed), In progress (mine / all), Due < 6 h, Overdue, Changes requested, Needs attention (admin) |
| `/admin/orders` | editor+ | Table: order no., headline, package, status, assigned to, deadline countdown (red < 6 h, overdue), created. Filters: status, mine, overdue. Default sort: deadline ascending. Realtime refresh (Supabase Realtime on `orders`) or poll every 30 s |
| `/admin/orders/[id]` | editor+ | See 10.2 |
| `/admin/attention` | admin | Orders with `needs_attention`: reason, actions (refund duplicate, partial refund, clear with note) |
| `/admin/payments` | admin | Recent payments/refunds from DB; per-order "Check with Razorpay" |
| `/admin/portals` | admin | CRUD, active/public toggles, sort, logo upload |
| `/admin/packages` | admin | CRUD, default portals (multi-select), price in ₹ (store paise) |
| `/admin/staff` | admin | Search users by email → set role editor/user; activate/deactivate |
| `/admin/showcase` | editor+ | Add/remove/reorder weekly stories (title, portal, URL, image) |
| `/admin/settings` | admin | Support phone/email/WhatsApp/hours, limits |
| `/admin/trusted-sources` | admin | Fact-check source tiers |

### 10.2 Order detail (the data-entry workspace)
- **Header:** order number, status badge, deadline countdown, assigned editor, Claim / Release buttons.
- **Content panel:** headline and article with **Copy** buttons (copy article as plain text preserving paragraphs); Instagram handle with Copy + "open profile" link; feature consent flag.
- **Images:** thumbnails; **Download** (signed URL with `download: <original filename>`) per image; "Download all" (zip route). Show resolution and size.
- **Customer:** name, email, phone (click-to-call, WhatsApp link) from the order snapshot.
- **Posting checklist** (static reminder): mark as sponsored/partner content; `rel="sponsored"` on outbound links; tag @handle and send collab invite on Instagram.
- **Placements:** one row per placement: platform · status · link input · Save.
  - Save → `staff_set_placement_link`. If it returns `true`, show "Link domain doesn't match <portal>. Double-check."
  - Empty slot → portal picker (`staff_swap_placement` with the current id).
  - "Portal down" → `staff_mark_placement_failed(note)` → then "Replace" (portal picker → `staff_swap_placement`).
- **Actions:** Request changes (reason ≥ 10 chars) · Publish (enabled when no pending; calls `/api/admin/orders/:id/publish`) · Admin: Reject & refund, Reassign, Reopen (published), Regenerate report, Publish partial.
- **Payment panel (admin):** DB summary + "Refresh from Razorpay" (`GET /api/admin/orders/:id/payment`) showing Razorpay order status, payments (id, method, status, amount, captured at), refunds. Mismatches between Razorpay and DB are highlighted.
- **Timeline:** `order_events` (who, what, when, details). Add note → `staff_add_note`.

---

## 11. Fact-check system

### 11.1 Submit — `POST /api/fact-checks`
Body: `{ type: 'text'|'url'|'image', text?, url?, imageBase64? | uploadPath?, deviceId }` (images ≤ 5 MB; client compresses).
1. Identify the caller: user (JWT) or guest (`deviceId` + IP).
2. Limits (`svc_consume_quota`): guest `guest_device:<id>` and `guest_ip:<ip>` ≤ `factcheck.guest_daily_limit` (3); user ≤ `factcheck.user_daily_limit` (20). Over the limit → 429 `fact_check_limit_reached` (guests are told to log in for more).
3. Normalise the input (trim, collapse whitespace, lowercase for the hash; for URLs strip tracking params) → `input_hash = sha256(type + normalised)`.
4. Cache: a `done` fact check with the same hash in the last 7 days → create a new row copying the result (so the user gets their own report id/history) and return `done` immediately. It does not count against the limit.
5. Otherwise insert `fact_checks` (`status='queued'`), upload the image to `fact-check-uploads`, and return `{ id, reportId, status: 'queued' }`.
   A DB webhook on insert invokes the `fact-check-worker` Edge Function; pg_cron also invokes it every minute as a sweeper.
6. The client polls `GET /api/fact-checks/:id` every 2 s (max 60 s).

### 11.2 Worker pipeline (`packages/fact-check`, run by the Edge Function)
Loop: `svc_claim_fact_check()` until none are left or 50 s pass. For each job (timeout 60 s):
1. **Normalise**
   - URL: fetch (10 s timeout, max 2 MB), Readability → title + text. Record `input_domain`, tier from `trusted_sources`, domain age via RDAP (`https://rdap.org/domain/<domain>`).
   - Image: OCR via Gemini Flash-Lite (fallback `tesseract.js` eng+hin). No text → `failed` with `no_text_in_image` (refund the quota: decrement the counter).
   - Image also → Fact Check API **image search**.
2. **Extract claims** (LLM, JSON mode): up to 3 claims, language, `is_government_related`.
3. **Existing fact checks:** Google Fact Check Tools `claims:search` per claim (`languageCode` hi/en). Matches become sources with `is_existing_fact_check=true`, `rating`, `publisher`.
4. **Evidence** (in parallel, skip Gemini Search if step 3 found a strong match):
   - Gemini + Google Search grounding → cited URLs only
   - GDELT DOC API (last 30 days, the claim's keywords) → which outlets covered it
   - Wikipedia REST (entity summaries) → context
5. **Score sources:** tier from `trusted_sources` (tier1 = govt + fact-checkers, tier2 = major news, else unknown). Drop URLs that return 4xx/5xx. The LLM may cite only URLs we retrieved.
6. **Verdict** (per claim, then overall = worst claim):
   - existing fact check found → map its rating (False/Fake → likely_false; Misleading/Partly false → misleading; True → likely_true)
   - else LLM judges using only the evidence → verdict + confidence
   - no tier1/tier2 evidence **or** confidence low → `unverified`
7. Write claims, sources and `fact_check_tool_runs` (one row per tool actually run, with status), then `summary`, `verdict`, `confidence`, `status='done'`, `completed_at`.

### 11.3 Providers and quota fallback
`interface LLM { extractClaims; judge; ocr }` and `interface Search { find }`. A router picks the first provider
with quota (`provider_usage` vs `daily_quota`):
- LLM: Gemini → Groq → Cloudflare Workers AI → OpenRouter free models. A fallback verdict lowers confidence one level, and the report names the model used.
- OCR: Gemini Flash-Lite → tesseract.js.
- Search: Gemini grounding → SearXNG (optional) → GDELT only.

At 80 % of the Gemini daily quota: guests get checks without web search; users keep full checks; admin gets an email.
When everything is exhausted: **reduced mode** (Fact Check API + GDELT + Wikipedia + RDAP + OCR). With no existing fact check, the verdict is `unverified`, `mode='reduced'`, `full_check_status='queued'`, and the report says "Full check pending".
Cron after the Gemini daily reset (13:15 IST) re-runs queued reduced checks, updates the same `report_id`, and notifies logged-in owners.

### 11.4 Report (web page, image, PDF — all from the same data)
Contents in this order: brand · report id · checked at (IST) · claim (verbatim) · verdict + confidence ·
2–3 sentence summary (claim language) · existing fact checks (publisher, rating, link) · evidence list
(title, site, tier badge, supports/refutes, link) · **How we checked this** (from `fact_check_tool_runs`, e.g.
"Searched Google Fact Check Tools for existing reviews", "Searched live web sources with Gemini + Google Search",
"Checked news coverage via GDELT", "Looked up website age via RDAP") · mode line if reduced · for government
claims: "You can also report this to PIB Fact Check (WhatsApp +91 8799711259)" · disclaimer: "AI-assisted
analysis of publicly available sources at the time of checking. Not an official or legal determination." ·
QR code + `SITE/r/<reportId>` verification link.

- `/r/[reportId]`: server-rendered, service client, 404 if missing or `is_public=false` (the owner can still view via the app/history). `generateMetadata` sets `og:image` = `/r/<id>/image.png` so WhatsApp shows a rich card.
- `image.png`: `ImageResponse` 1080×1350 (claim, verdict, top 2 sources, QR, brand). Cache in `fact-check-share`, regenerate if the report changes.
- `report.pdf`: @react-pdf; cached the same way.
- Share buttons: app uses `expo-sharing` / `Share` (link + image); mobile web uses the Web Share API; desktop offers copy link + download.

---

## 12. Notifications

- **Source of truth:** rows in `public.notifications` (created by DB triggers and backend code). `channels` ⊆ {`in_app`, `push`, `email`}.
- **Sender:** Supabase Database Webhook on `INSERT` into `notifications` → Edge Function `send-notifications`:
  - push: all `device_tokens` of the user → Expo push API (batch ≤ 100); remove tokens that return `DeviceNotRegistered`; set `push_sent_at`
  - email: via the email provider using templates per `type`; set `email_sent_at`
  - errors → `delivery_error` + `delivery_attempts += 1`; pg_cron retries unsent rows older than 5 min while `delivery_attempts < 3`
- **Tap target:** `data.deep_link` (`/orders/<id>`), which the app maps to its route.

| type | Trigger | Channels |
|---|---|---|
| `order_paid` | order → paid (from payment) | in_app, push, email |
| `staff_new_order` | same, to every active staff member | in_app |
| `order_changes_requested` | → changes_requested | in_app, push, email |
| `order_published` | `report_status` → ready | in_app, push, email (+ PDF) |
| `order_rejected` | → rejected | in_app, push, email |
| `order_refunded` | → refunded | in_app, push, email |
| `order_delayed` | deadline passed | in_app, push, email |
| `staff_deadline_warning` | 2 h before deadline, to admin + assignee | in_app, email |
| `fact_check_full_ready` | reduced → full check done (logged-in owner) | in_app, push |

Mobile: request push permission after the first successful action (not on launch), then `register_device_token(ExponentPushToken[...], platform)`.

---

## 13. Screens and pages inventory (system level; visual design comes from Stitch)

### Website (Next.js)
- `/` landing: fact-check hero (text / link / screenshot) · PR section (₹499, portal names) · recently published (showcase) · how it works · footer (support, terms, privacy)
- `/fact-check` (full checker + history for logged-in users) · `/r/[reportId]` public report
- `/publish` (package picker → form → review) · `/orders` · `/orders/[id]` · `/pay/[token]`
- `/login` · `/auth/callback` · `/complete-profile` · `/account` (profile, notifications, delete account) · `/support`
- `/terms` · `/privacy` (mention AI processing by third-party providers and data retention) · `/methodology` (tools + trusted sources list)
- `/admin/**` (§10)

### Mobile app (Expo Router)
- Tabs: **Home · Fact check · Publish · Orders · Profile**
- Home: compact fact-check card · active order card (status only) · publish banner with portal names
- Fact check: input (text / link / screenshot) → progress → result → share
- Publish: package → form → review → pay (browser) → result
- Orders: list → detail (status timeline, links + report after publish, "edit & resubmit" when changes are requested)
- Profile: details, notifications list, support (call / email / WhatsApp with order id prefilled), terms, privacy, sign out, delete account
- Auth: welcome (Google / email) → OTP → complete profile

Order status shown to customers: Draft · Awaiting payment · Received (paid) · In progress · Changes needed · Published · Rejected · Refunded · Cancelled · Expired.
("In progress" covers both `paid` and `in_progress` if you prefer fewer states: show `paid` as "Received".)

---

## 14. Scheduled jobs (pg_cron; HTTP jobs use pg_net + a Vault secret)

| Job | Schedule | What |
|---|---|---|
| `expire-pending-orders` | every 30 min | `svc_expire_pending_orders()` (in migration) |
| `deadline-sweep` | every 10 min | `svc_deadline_sweep()` (in migration) |
| `cleanup-usage-counters` | daily 03:15 UTC | delete counters > 30 days (in migration) |
| `reconcile-payments` | every 10 min | POST `/api/cron/reconcile-payments` |
| `cleanup` | daily | POST `/api/cron/cleanup`: drafts untouched 7 days (delete images + rows), fact-check uploads > 30 days, orphan storage objects |
| `notifications-retry` | every 5 min | invoke `send-notifications` for unsent rows |
| `fact-check-sweeper` | every minute | invoke `fact-check-worker` |
| `pending-fact-checks` | daily 07:45 UTC (13:15 IST) | POST `/api/cron/pending-fact-checks` |
| `db-backup` | daily | GitHub Action `pg_dump` → private storage (until Supabase Pro) |

---

## 15. Security checklist
- [ ] RLS on every public table (migration does this; keep it that way)
- [ ] Only `NEXT_PUBLIC_`/`EXPO_PUBLIC_` vars in clients; service key only in `apps/web/src/server/**` and edge functions
- [ ] Razorpay signature checks use raw bodies and timing-safe compare
- [ ] Checkout tokens are HMAC-signed, expire in 30 min, and are bound to order + intent
- [ ] `/api/cron/*` requires `Authorization: Bearer CRON_SECRET`
- [ ] Rate limits: fact-check (DB), order creation (DB), OTP (Supabase), and a simple IP limit on `/api/fact-checks` and `/api/orders/*/checkout`
- [ ] Signed URLs for private files expire in ≤ 1 h (5 min for reports opened from email)
- [ ] Image uploads re-encoded on the client (EXIF/location stripped); bucket MIME/size limits enforced by Storage
- [ ] URL fetches in the worker: block private IP ranges/localhost (SSRF), 10 s timeout, 2 MB cap
- [ ] Admin routes check role server-side; never rely on hidden buttons
- [ ] Logs never contain full Razorpay payloads with PII in plain text outside the DB `raw` column
- [ ] Privacy policy covers: data collected, AI providers (free tiers may use inputs to improve models), retention, deletion

---

## 16. Error code catalogue (SQL/API code → user message)

| Code | Message |
|---|---|
| `not_authenticated` | Please sign in to continue. |
| `not_authorized` | You don't have access to this. |
| `profile_incomplete` | Add your name and phone number to continue. |
| `too_many_orders_today` | You've created too many orders today. Try again tomorrow. |
| `package_unavailable` | This package isn't available right now. Pick another. |
| `package_locked_after_payment` | The package can't be changed after payment. |
| `order_locked` | This order can't be edited right now. |
| `order_not_found` | Order not found. |
| `invalid_storage_path` / `too_many_images` | You can upload up to 2 images. |
| `image_required` | Add at least one image. |
| `declaration_required` | Please accept the declaration to continue. |
| `order_not_payable` | This order can't be paid. |
| `payment_already_made` | We've already received a payment for this order. |
| `order_not_reopenable` | This order can't be edited now. |
| `order_not_cancellable` | Only drafts can be cancelled. |
| `order_not_resubmittable` | This order isn't waiting for changes. |
| `illegal_transition` | That action isn't allowed for this order's current status. |
| `order_not_claimable` | Someone else already picked up this order. |
| `order_not_releasable` / `order_assigned_to_someone_else` | This order is assigned to another editor. |
| `order_not_in_progress` | Claim the order first. |
| `placement_not_found` / `placement_swapped` | This placement was replaced. Refresh. |
| `choose_portal_first` | Choose a portal for this slot first. |
| `invalid_url` | Paste the full link starting with https:// |
| `placement_already_live` | This portal already has a live link. |
| `portal_unavailable` / `not_a_portal_placement` | That portal can't be used. |
| `reason_required` | Please write a clear reason (at least 10 characters). |
| `order_not_editable` | Changes can't be requested at this stage. |
| `placements_pending` | Some placements still need links. |
| `placements_failed` | Replace the failed portals, or ask an admin to publish as partial. |
| `nothing_published` | Add at least one live link before publishing. |
| `empty_note` | Write a note first. |
| `not_a_staff_member` | That user isn't an active staff member. |
| `order_not_assignable` / `order_not_rejectable` / `order_not_published` | That action isn't available for this order. |
| `cannot_remove_last_admin` | You can't remove the only admin. |
| `cannot_deactivate_yourself` | You can't deactivate your own account. |
| `user_not_found` | User not found. |
| `invalid_push_token` | (silent, log only) |
| `account_has_active_orders` | You have an active order. You can delete your account once it's completed. |
| `fact_check_limit_reached` | You've used today's free checks. Sign in for more, or try tomorrow. |
| `no_text_in_image` | We couldn't find any text in this image. |
| `checkout_link_expired` | This payment link expired. Tap Pay again. |

---

## 17. Testing strategy
- **SQL behaviour tests** (`test/01_behaviour_tests.sql`, run with `bash test/run.sh` against plain Postgres + `test/00_supabase_stub.sql`): currently **105 passing**. Add a test for every new DB rule. CI job: Postgres 16 service + run.sh must report `failed = 0`.
- **Unit (vitest):** zod schemas, money/time utils, Razorpay signature verify, checkout token sign/verify, webhook handler (with recorded fixture payloads), verdict mapping, provider router.
- **Integration (local Supabase):** checkout → callback (Razorpay test mode) → paid; webhook replay; reconcile; publish → PDF; notifications rows created.
- **Razorpay test mode:** use test cards/UPI (`success@razorpay`, `failure@razorpay`) and dashboard webhook test events. Test a UPI failure followed by a manual capture.
- **Manual checklist before launch:** every row of §9.10.

---

## 18. Build phases and acceptance criteria

**P0 — Foundation.** Turborepo + pnpm, apps/web, apps/mobile, packages, ESLint/Prettier/TS strict, env handling, Supabase local, migration applied, `pnpm db:types`, CI (lint, typecheck, vitest, SQL tests).
✅ `supabase db reset` works; CI green; web and app start.

**P1 — Auth & profile.** Web Google + email OTP; mobile native Google + email OTP; complete profile; middleware; `/api/me`; sign out.
✅ New user → profile row → forced to complete profile → can reach home on web and app; role cannot be self-edited.

**P2 — Catalogue & PR drafts.** Package listing with portal names, publish form, image upload/compress/replace, autosave, orders list/detail (customer).
✅ Draft with 1–2 images saved; validation matches the DB; other users can't see it.

**P3 — Payments.** Checkout route, `/pay/[token]`, callback, webhook, reconcile cron, reopen, customer result screens (web + app deep link), admin payment panel, refunds.
✅ Test-mode payment marks paid via callback **and** via webhook alone (callback disabled); duplicate/late/mismatch cases produce the right DB state; §9.10 rows 1–12, 24–26 verified.

**P4 — Admin panel.** All §10 screens; claim lock; placements; image download; request changes; publish; reject.
✅ Two editors can't work the same order; publish is blocked until every placement is live/swapped; editors can't reach admin-only actions (UI and DB).

**P5 — Reports & notifications.** PR PDF, `svc_set_report`, send-notifications function (push + email + in-app), device token registration, notification list, deadline/delay flows.
✅ Customer receives push + email when the report is ready; PDF opens with correct links; delay message fires once.

**P6 — Fact checker.** Submit API, limits, cache, worker pipeline, provider router + fallbacks, reduced mode, report page/image/PDF, sharing, history, methodology page.
✅ Text, link and screenshot each produce a report with sources and a "How we checked" section; the WhatsApp link shows a preview; guest limit enforced; reduced mode works with Gemini disabled.

**P7 — Website & polish.** Landing page, showcase, support, settings-driven contacts, terms/privacy, account deletion, cleanup cron.
✅ Lighthouse ≥ 90 performance on the landing page (mobile); account deletion rules enforced.

**P8 — Launch hardening.** Vercel Pro + Supabase Pro (or backups), live Razorpay keys + webhook, custom SMTP, store listings (account deletion, privacy labels), App Store payment-rule review (guideline 3.1), error monitoring.
✅ Full §9.10 manual checklist passed on production with a real ₹ payment and refund.

---

## 19. Seed data (`supabase/seed.sql`, dev only)
- 3–5 portals (real names later), packages: `starter` ₹499 (2 portals + Instagram), plus one larger package as an example
- `trusted_sources`: tier1 → `pib.gov.in`, `*.gov.in` domains you use, `factcheck.pib.gov.in`, recognised Indian fact-checkers (e.g. BOOM, Factly, Vishvas News, Alt News, NewsChecker); tier2 → major national outlets. The admin maintains the list.
- Support settings already seeded by the migration (replace placeholders).

## 20. Open decisions and defaults (use the default unless told otherwise)

| Decision | Default |
|---|---|
| App name / domain / deep link scheme | placeholder `prapp`; scheme `prapp://` |
| Guest fact-check limit | 3/day; logged-in 20/day (app_settings) |
| Phone unique per account? | No (shared numbers allowed) |
| Portal down | Editor swaps to a similar portal; partial delivery + partial refund only if no replacement |
| Currency | INR only until Razorpay international payments are activated |
| Prices incl. GST? | Show "inclusive of all taxes"; invoices out of scope for v1 |
| Checkout intent reuse window | 12 h |
| Pending payment expiry | 24 h (late payments still honoured) |
| Draft retention | 7 days untouched |
| Fact-check upload retention | 30 days |
| Report visibility | Public by default; owner can make it private |
| UI language | English (strings centralised for Hindi later) |

## 21. Changelog
- v1.0 (2026-09-27): initial locked spec. Migration `20260927000000_init.sql` (23 tables, 42 policies), SQL tests 105/105.
