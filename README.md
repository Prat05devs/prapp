# NewsVio

Fact checker + self-serve PR publishing. Web (Next.js), app (Expo), backend on Supabase, payments via Razorpay.

- `CONTEXT.md`: rules for anyone (human or AI) building this
- `docs/LLD.md`: full low-level design (locked v1.0)
- `supabase/migrations/`: database schema, RLS, business logic

Status: every flow in LLD phases P0–P7 is built for web and app. Phase P8 (launch hardening) needs
real accounts and keys, listed under **Before launch** below.

## Layout

```
apps/web                   Next.js: site, customer pages, /admin, /api/*, /pay/*, /r/*
apps/mobile                Expo (customers only)
packages/shared            constants, error catalogue, zod schemas, money/time utils
packages/api-client        typed /api/* client + direct (RLS) queries shared by web and app
packages/db-types          generated Supabase types (pnpm db:types, never hand-edit)
packages/report-templates  PR delivery PDF, fact-check PDF
packages/fact-check        fact-check pipeline + AI/search providers (runs in the Edge Function)
supabase/migrations        init (locked) + jobs/webhooks + fact-check worker helpers
supabase/functions         send-notifications, fact-check-worker (Deno)
test/                      SQL behaviour tests
```

## Local setup

Needs Node 22+ (`.nvmrc`), pnpm 10 and Docker.

```
pnpm i
pnpm db:start                          # local Supabase (Docker); applies migrations + seed
bash scripts/local-env.sh              # writes .env with the local Supabase URL/keys
bash scripts/local-vault.sh            # Vault secrets so DB webhooks + cron can call functions/site
pnpm exec supabase functions serve --env-file .env   # Edge Functions (keep running)
pnpm dev:web                           # http://localhost:3000
pnpm dev:mobile                        # Expo
```

- One `.env` at the repo root is read by web, mobile and the Edge Functions.
- Email OTP codes locally: Mailpit at http://127.0.0.1:54324.
- Make yourself admin after the first sign-in (LLD §6.4):
  `update public.profiles set role = 'admin' where email = 'YOU@example.com';`
  (SQL editor: Supabase Studio at http://127.0.0.1:54323).
- Without AI keys the fact checker runs in **reduced mode** (unverified + "full check pending").
- Without Razorpay keys, checkout returns an error; everything else works.
- The mobile app uses native modules (Google sign-in, push): use a development build
  (`npx expo run:ios|android` or `eas build --profile development`), not Expo Go.

## Checks (CONTEXT §7)

```
pnpm lint && pnpm typecheck
pnpm test                 # unit tests (vitest), no services needed
pnpm test:sql             # SQL behaviour tests in a throwaway Postgres 16 container
pnpm test:integration     # web server logic against local Supabase + Edge Functions
bash test/run.sh          # SQL tests against a local Postgres (CI uses this)
```

CI (`.github/workflows/ci.yml`): lint/typecheck/unit tests, SQL tests + RLS check, and the
integration tests against `supabase start`.

## Environment

All variables are in `.env.example`. Optional ones can stay blank until you have them:

| Needed for                                     | Variables                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Payments                                       | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_LIVEMODE`                |
| Email (notifications, also Supabase Auth SMTP) | `EMAIL_API_KEY`, `EMAIL_FROM` (Resend)                                                                  |
| Fact-check AI (any subset; Gemini first)       | `GEMINI_API_KEY`, `GROQ_API_KEY`, `CLOUDFLARE_AI_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, `OPENROUTER_API_KEY` |
| Existing fact checks                           | `GOOGLE_FACTCHECK_API_KEY`                                                                              |
| Push                                           | `EXPO_ACCESS_TOKEN` (recommended) + an EAS project id (`eas init`)                                      |
| Google sign-in                                 | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, Supabase Google provider        |

Use Supabase's current `sb_publishable_…` key in the public web/mobile variables and its
`sb_secret_…` key only in the server variable. The legacy anon/service-role variables remain
fallbacks for the local stack; never expose a secret key to a browser or mobile build.

## Before launch (P8)

- Supabase project in Mumbai; `supabase db push`; set the four Vault secrets
  (`project_url`, `service_role_key`, `site_url`, `cron_secret`: see the header of
  `supabase/migrations/20260928000000_jobs_and_webhooks.sql`). Despite the historical Vault
  name, store the current secret API key in `service_role_key`; deploy both Edge Functions.
- Vercel Pro (region `bom1`); Razorpay live keys + webhook (events in LLD §9.7) pointing at
  `/api/webhooks/razorpay`; auto-capture on.
- Custom SMTP for Supabase Auth; edit the Magic Link template to show `{{ .Token }}`; OTP expiry 600 s.
- Real portal names and packages (seed has placeholders), support contacts in Admin → Settings.
- Replace the draft Terms and Privacy pages with reviewed text; final app name, bundle ids
  (`com.prapp.app` placeholders), icons.
- Manual checklist: every row of LLD §9.10 with a real payment and refund.

## Decisions taken where the spec was silent

Marked `// DECISION:` in code. Main ones: `validation_failed` / `rate_limited` /
`internal_error` error codes; checkout token carries web/app return target; `*.gov.in` /
`*.nic.in` count as tier 1; Resend for email; default AI models + Gemini daily quota
(env-configurable); provider quota days follow US Pacific time (Gemini reset); PDF/share-image
fonts from Google Fonts (satori cannot shape Devanagari, so Hindi on the share image can look
imperfect; the web page is exact); placeholder terms/privacy text and bundle ids.
