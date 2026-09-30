# CONTEXT.md — read this first

You are building a production app from a **locked specification**. Do not redesign it.
If something is ambiguous or missing, follow the "Open decisions" defaults in `docs/LLD.md` §20
and leave a `// DECISION:` comment. Do not invent features that are not in the spec.

**Read in this order before writing any code:**
1. This file (rules, stack, conventions)
2. `docs/LLD.md` — the full low-level design: every flow, API contract, edge case and build phase
3. `supabase/migrations/20260927000000_init.sql` — the database: schema, RLS, state machine and
   business functions. **It is the source of truth.** If the LLD and the SQL disagree, the SQL wins.
   Flag the mismatch; do not quietly change either.

---

## 1. What the product is

A web app plus mobile app (name TBD, placeholder `prapp`) for people in India, starting in
Dehradun/Uttarakhand, with two features:

1. **Fact checker (the hero feature, free).** A user pastes text or a link, or uploads a
   screenshot of a forward. We check it using only free tools (Google Fact Check Tools API,
   Gemini with Google Search grounding, GDELT, Wikipedia, RDAP) and return a verdict with
   sources. The report can be shared as a link, an image or a PDF. Every report states which
   tools were used, so the verdict is visibly evidence-based and not the app's own opinion.
2. **Self-serve PR ("Publish your story", paid, from ₹499).** A user submits a headline,
   article, 1–2 images and an optional Instagram handle, picks a package and pays with
   Razorpay. Our team **manually** posts the story on our own news portals and our
   Instagram news page within 24 hours. They paste the live links into the admin panel,
   and the customer gets a PDF delivery report with every link.

Users: customers (web + app), **editors** (data-entry staff who post, several of them),
and **one admin**. The admin panel is **web only**.

## 2. Stack (fixed)

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Web + API + admin | Next.js (App Router, TypeScript, route handlers) on Vercel |
| Mobile | Expo (React Native, TypeScript, Expo Router), EAS builds |
| Database / auth / storage / cron | Supabase (Postgres, Supabase Auth, Storage, pg_cron, pg_net, Edge Functions) |
| Payments | Razorpay (Orders API + Standard Checkout via hosted page + webhooks) |
| Validation | zod, shared in `packages/shared` |
| Push | Expo push service (`expo-notifications`) |
| Email | Transactional email provider via SMTP/API (free tier), also used as Supabase Auth custom SMTP |
| PDF | `@react-pdf/renderer` (NOT headless Chrome) |
| Share image | `next/og` `ImageResponse` (satori) |
| Fact-check AI | Gemini API (free tier) behind a provider interface with free fallbacks |
| UI | Designs come from **Google Stitch** later. Build functional screens with simple components and keep logic in hooks so views can be swapped (see §5) |

## 3. Repository layout

```
/apps
  /web                 Next.js: public site, customer pages, /admin, /api/*, /pay/*, /r/* (public reports)
  /mobile              Expo app (customers only — no admin screens)
/packages
  /shared              zod schemas, types, constants (statuses, error codes, limits), money/time utils
  /api-client          typed fetch wrappers for /api/* used by web + mobile
  /db-types            generated Supabase types (`supabase gen types typescript`)
  /report-templates    @react-pdf templates (PR delivery report, fact-check report) + share-image JSX
  /fact-check          pipeline + provider interface (runs in the Edge Function and in tests)
/supabase
  /migrations          SQL migrations (init already written and tested)
  /functions           Edge Functions: fact-check-worker, send-notifications
  seed.sql             dev seed: portals, packages, trusted_sources, settings
/test                  SQL behaviour tests (plain Postgres + Supabase stub) — keep them passing
/docs/LLD.md           full specification
```

## 4. Golden rules (non-negotiable)

1. **The database enforces the business rules.** RLS decides row access, column grants decide
   writable columns, and triggers enforce the order state machine. Do not re-implement or bypass
   them in app code. Do not add broad policies or `grant all` to make something "work".
2. **Never trust the client with money.** Prices come from the `packages` table on the server.
   An order becomes `paid` **only** through `svc_apply_payment` after Razorpay confirms it
   (signature verified plus a payment fetched from the Razorpay API, a verified webhook, or
   reconciliation). No UI anywhere, including admin, can mark an order paid.
3. **The service_role key and Razorpay secrets stay server-side** (Next.js route handlers,
   Edge Functions). Never import them into client components or the Expo app. Only
   `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` vars may reach clients.
4. **Staff actions go through RPCs** (`staff_*`, `admin_*`). Customers write only content columns.
   Backend-only operations use `svc_*` functions with the service role.
5. **Idempotency everywhere money or notifications are involved.** Webhooks are deduplicated by
   `x-razorpay-event-id` (`svc_record_webhook`). Payment updates only move status forward.
6. **Money is stored in minor units** (paise/cents, integers). Times are stored in UTC
   (`timestamptz`) and displayed in IST (`Asia/Kolkata`).
7. **Free tier first.** Do not add paid services. Anything with a quota (Gemini, email) goes behind
   a limiter and has a fallback.
8. **Do not store secrets, card data, or anything from Razorpay beyond what the schema defines.**
9. **Fact-check wording:** verdict labels are `Likely false · Misleading · Likely true · Unverified`,
   never "FAKE". Every report shows its sources, the tools used, and a disclaimer. Never show a
   verdict without evidence. Name tools in plain text; never use Google/PIB logos.
10. **Paid placements are sponsored content.** The posting checklist in the admin panel reminds
    editors to label posts as sponsored and to use `rel="sponsored"` on links.

## 5. Conventions

- TypeScript `strict`, no `any`. ESLint + Prettier. Named exports.
- All input validated with zod schemas from `packages/shared` on both client and server.
- Database access:
  - Web server components and route handlers use `@supabase/ssr` with the user's cookies (RLS applies).
  - Expo calls `/api/*` with `Authorization: Bearer <supabase access token>`; the API creates a
    user-scoped Supabase client from that token.
  - `createServiceClient()` (service role) is used **only** inside `apps/web/src/server/**` and Edge Functions.
- Errors: SQL raises codes like `order_locked`. Map them via `packages/shared/errors.ts` to
  user-facing messages (catalogue in LLD §16). API responses: `{ error: { code, message } }` with a
  proper HTTP status.
- UI/logic split: screens are thin. Data and actions live in hooks (`useOrder`, `useCheckout`,
  `useFactCheck` …) in each app, so Stitch-generated views can replace the markup later without
  touching logic.
- Naming: DB snake_case; TS camelCase (convert at the api-client boundary); routes kebab-case.
- Regenerate `packages/db-types` after every migration. Never hand-edit it.
- New SQL goes in a **new** migration file. Never edit an applied migration.

## 6. Commands (set these up in phase 0)

```
pnpm i
pnpm dev                    # web + mobile
supabase start              # local Supabase (Docker)
supabase db reset           # apply migrations + seed
pnpm db:types               # regenerate packages/db-types
pnpm test                   # unit tests (vitest)
bash test/run.sh            # SQL behaviour tests (needs local Postgres 15+); must be 0 failed
pnpm lint && pnpm typecheck
```

## 7. Definition of done (per build phase in LLD §18)

- The acceptance criteria for the phase are met and demonstrated
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `bash test/run.sh` all pass
- New DB behaviour has SQL tests; new API routes have tests for success, auth failure and
  validation failure
- No secrets in the client bundle; RLS still enabled on every table
  (`select tablename from pg_tables where schemaname='public' and not rowsecurity` returns nothing)
- `.env.example` updated for any new variable

## 8. Things you must NOT do

- Do not mark orders paid, refunded or published by direct `update`. Use the functions.
- Do not add `using (true)` policies on private data, or disable RLS "temporarily".
- Do not use `react-native-razorpay` (it doesn't support the RN new architecture used by current Expo).
  Use the hosted `/pay/[token]` page (LLD §9.5).
- Do not run Playwright/Chromium in serverless functions.
- Do not create multiple Google Cloud projects/keys to stretch free quotas.
- Do not build features listed as "v2 / out of scope" in LLD §1.
