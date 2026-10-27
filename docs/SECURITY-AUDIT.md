# Security audit and local penetration checks

Date: 27 October 2026. Scope: the pending newsVio source changes, installed production
workspace dependencies, local production web build, and disposable PostgreSQL databases.
This is an engineering security review, not independent certification or a guarantee of
zero vulnerabilities. No production server scans, real payment/refund calls, or source
Supabase data changes were performed.

## Findings addressed

- Updated Next.js / eslint-config-next from 16.3.6 to 16.4.1 for the published image
  optimization and typed-array cache RCE advisories, SSRF, cache leaks and denial of service.
  References: [image optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
  [cache RCE](https://github.com/advisories/GHSA-673q-mjm6-r5xr).
- Upgraded application Zod to 4.6.7 and pinned patched transitive versions of uuid,
  decode-uri-component, source-map-js, postcss-selector-parser, shell-quote and
  follow-redirects. Overrides are recorded in pnpm-workspace.yaml and the lockfile.
- Fixed the sign-in `next` redirect filter: browser URL parsing removes literal tabs/newlines,
  so `/\t/attacker.example` could become a protocol-relative external destination. The
  filter now rejects backslashes, spaces, control characters, and protocol-relative paths.
  Added regression inputs for these normalization bypasses.
- Bounded JSON and payment webhook request bodies to 256 KiB using actual streamed bytes,
  including missing/false Content-Length. Oversized webhook requests return 413 before
  database access; JSON API bodies fail validation. Added cancellation/Unicode tests.
- Malformed payment webhook signatures and event IDs are rejected before loading/decrypting
  provider configuration. Valid signatures still cover the unmodified raw text.
- Regenerated database types from the migrated local schema, including the checkout lease
  fencing RPC. Fixed the mobile animation wrapper's ref type without changing its behavior.

## Remaining dependency advisories

The post-update `pnpm audit --prod --json` reports **0 critical, 2 high, 0 moderate, 0 low**.
Both remaining paths are under `apps/mobile > expo > @expo/cli`:

| Dependency | Finding | Disposition |
|---|---|---|
| node-forge 1.4.0 | RSA signature verification accepts nested DigestAlgorithm padding | No patched version is published in the registry advisory. Track the Expo/forge fix; do not treat mobile signing tooling as cleared. |
| zod 3.25.76 | Constrained-collection memory exhaustion | Expo CLI requires Zod 3; forcing Zod 4 is a breaking override. Application Zod is patched. Track an Expo CLI update. |

References: [forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv),
[Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
Neither dependency is introduced into the Next.js application dependency path by this change.
Build tooling must still run with trusted inputs; these findings remain open rather than
being suppressed or represented as fixed.

## Verification and attack coverage

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm format:check`: passed.
  Unit suite: 141 tests, including encryption tampering/wrong-key/wrong-environment rejection,
  admin guard/CSRF rejection, forged payment signatures and checkout tokens, durable webhook
  retries/replay, request body limits, SSRF URL filtering and redirect bypass regressions.
  Route unit tests mock session/provider boundaries; they are not a live identity provider test.
- `pnpm test:sql`: **162 passed, 0 failed**, using a disposable database. Coverage includes
  row/column permissions, order state transitions, service-only functions, credential access,
  webhook claim fencing, refund reservation/replay and stale checkout leases.
- Standalone PostgreSQL 17 check: passed. Attempted cross-user profile reads, role escalation,
  private credential reads, anonymous order reads and direct payment RPC calls were denied;
  pooled transaction rollback did not leak the prior user's identity. All public tables had RLS.
- Production `next build` with dummy credentials: passed.
- Local HTTP checks: `python3 scripts/security-http-check.py` against the production build
  bound to 127.0.0.1:3005. Checks unauthenticated admin/customer access, forged cron credentials,
  oversized/forged webhooks, invalid payment links and security headers.
- Gitleaks 8.30.1: Git history scan passed with redaction enabled. The staged source snapshot
  is also scanned before commit; private .env files remain ignored and outside that snapshot.

For the HTTP check, start the local production build with dummy Supabase URL/key values,
NEXT_PUBLIC_SITE_URL=http://localhost:3005, dummy SUPABASE_SECRET_KEY,
a CHECKOUT_TOKEN_SECRET of at least 32 characters, a CRON_SECRET of at least 16 characters,
and PAYMENTS_MODE=razorpay. Use `pnpm --filter web exec next start -H 127.0.0.1 -p 3005`.
Do not use production credentials for this check.

## Launch limits and follow-up

- Full replacement of Supabase auth, storage, workers and the frontend/API split remains
  unfinished. Pushing this source to main does not make the shared-server target deployable.
- Authenticated browser/mobile end-to-end flows, an authenticated DAST scan of an isolated
  staging deployment, payment-provider test-mode scenarios, DNS/TLS/proxy configuration,
  secrets/backup restoration and the P8 manual payment checklist remain launch gates.
- The HTTP audit uses dummy backend credentials. It establishes denial before backend access;
  it does not establish that a real authorized user can complete every flow.
- Existing outbound URL fetching checks DNS in Deno but does not pin the resolved address to
  the subsequent connection. Rebinding defenses and private-network egress filtering must be
  verified when porting the worker to Node; do not assume the current Deno checks apply there.
- The rate limiter is per-process and trusts forwarded IP headers. Configure a trusted ingress,
  strip caller-supplied forwarding headers, enforce body/time limits there, and verify abuse
  limits across instances before public cutover.
- CSP currently restricts framing, base URLs and objects; it has no script nonce policy.
  A full script CSP needs verification with Next.js and hosted Razorpay checkout.
