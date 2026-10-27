# newsVio deployment direction

Recorded 26 October 2026. This is a migration planning note, not an executable deployment runbook.

## Workspace and identity

- Product name: **newsVio**. The current native display name is `NewsVio`.
- Active checkout: `/Volumes/ProjectsSSD/prapp` on ProjectsSSD.
- Keep the repository folder `prapp` and internal `@prapp/*` package names unless a separate
  technical rename is needed. Mobile already uses slug/scheme `newsvio` and app id `com.newsvio.app`.
- Preserve the existing staged, unstaged, and untracked work in this checkout.
- The copied `node_modules/.modules.yaml` currently records the pnpm store under
  `/Users/prateekthapliyal/Library/pnpm/store/v10`. Moving the checkout did not move that cache.
  Native build caches, Docker data, and SDKs also need a separate storage audit if internal
  disk usage remains a problem. No cache relocation or deletion has been performed.

## Supplied infrastructure context

Sources: the owner's architecture screenshot dated 21 October and
`/Users/prateekthapliyal/Downloads/server-deployment.md`, which describes Batra Connect's
setup as of 24 October. These are reference material, not instructions to execute wholesale.
The shared server was subsequently inspected over SSH; see the verified state below.

The intended arrangement is:

- Hostinger: website and web admin dashboard.
- DigitalOcean: Dockerized API behind Caddy HTTPS.
- Shared PostgreSQL: one isolated database and login per application, reachable privately.
- Mobile: calls the API over HTTPS.

The supplied guide reports a Bangalore droplet, shared services in `/opt/platform`,
application checkouts in `/opt/apps/<app>`, and Docker networks `edge` (proxy/API) and
`data` (private database). Application containers publish no host ports. It also describes
daily database dumps and identifies off-server backups as outstanding work.
Its `infra/server.sh` belongs to the Batra Connect repository; it is not provided here.
The screenshot's price and the guide's resource capacity are historical context, not a
verified capacity or cost estimate for newsVio.

## Current implementation versus target

| Area | Existing newsVio implementation | Migration work |
|---|---|---|
| Website and API | One Next.js application in `apps/web`, including `/admin`, `/api`, `/pay`, and `/r` | Define which routes execute on each host; preserve server rendering, authenticated cookies, payment callbacks, and public report URLs |
| Authentication | Supabase sessions, Google sign-in, email flows, user-scoped clients | Replace auth/session services while preserving account identity |
| Database access | Supabase clients and RPCs; RLS and column grants enforce permissions | Plain PostgreSQL needs a trusted API layer and verified user identity mapped to the existing database authorization rules |
| Uploads and reports | Supabase Storage buckets, access policies, signed URLs | Implement equivalent private file access, persistence, retention, and backups |
| Background work | Supabase Edge Functions, database webhooks, pg_cron/pg_net, Vault | Provide workers and scheduling with equivalent retries, quotas, and idempotency |
| Deployment | Existing documentation targets Vercel/Supabase; no newsVio production API Compose setup found | Prepare the runtime split, container build, health checks, Caddy configuration, and environment mapping |

An ordinary PostgreSQL database alone does not provide the services this code calls.
The migrations refer to `auth.users`, `auth.uid()`, storage schemas, and Supabase roles.
SQL test stubs are test fixtures, not production replacements for those services.
Do not apply the existing migration chain unchanged to the shared database and assume
authentication, uploads, and workers are available.

## Confirmed decision and implementation status

The owner selected **move fully to the shared server** on 26 October 2026. The target
includes replacing Supabase authentication, storage, and Edge Functions.
The owner's latest clarification is that the existing Supabase content is **test data**:
start a fresh database on the shared server and leave the old project untouched. This
supersedes the earlier request to transfer existing accounts and orders. A source database
connection/export is therefore not required for this deployment. `DATA-MIGRATION.md`
retains optional export guidance if that decision changes in the future.

The standalone database foundation is implemented in `packages/server-db` and
`infra/database`: namespaced roles, a dedicated runtime login, transaction-local user
identity, migration locking/checksums, and an explicit empty-database bootstrap. The
historical migrations remain unchanged; a SQL lexer maps their unquoted role identifiers
to namespaced roles. Claim strings and function bodies retain their original semantics.

The schema and isolation checks have run against local PostgreSQL 17. This does **not**
mean the application has been cut over: its existing auth/data/storage clients and workers
still use Supabase. Authentication, storage, worker porting, frontend/API separation,
production packaging and deployment remain outstanding. No source data transfer is required. Do not stop the
existing service or point production traffic at the standalone database yet.

The new admin integrations and payment recovery code work with the current application
and their SQL also applies to the standalone database. See `PAYMENT-RELIABILITY.md`.

## Implementation sequence

Follow LLD §18's phase order when adapting the existing application:

1. **P0:** verify the moved workspace, establish the target runtime and environment contract,
   database migration strategy, and deployment/health-check setup.
2. **P1:** preserve account identity, authentication, sessions, and staff permissions.
3. **P2:** adapt catalogue, draft access, and private uploads.
4. **P3–P4:** validate payment callbacks/webhooks, reconciliation, refunds, and staff RPCs.
5. **P5–P6:** migrate reports, notification delivery, fact-check workers, quotas, and schedules.
6. **P7–P8:** verify public pages, account deletion, backups/restoration, and production cutover.

Keep the database state machine, RLS, column grants, server-only secrets, and payment
idempotency intact. Add new migrations; do not rewrite applied migrations. Replacing
Supabase must not turn user-scoped operations into unrestricted service-role access.

Before cutover, validate the P8 payment checklist, cross-user access isolation, uploads,
worker retries, web/mobile login, report links, backup restoration, and rollback. Confirm
the actual Hostinger runtime/build support and server capacity against the final design.

## Verified setup, 26 October 2026

- Shared Caddy/PostgreSQL services are running on the DigitalOcean server.
- A fresh `newsvio` database, isolated roles, and the initial schema were provisioned.
  The server migration ledger initially contained 18 entries; newer repository migrations
  still need reconciliation before application deployment.
- Private runtime/migration credentials and encryption secrets were generated on the server
  under `/opt/apps/newsvio/.env`; do not overwrite this file or commit it.
- `api.newsvio.in` resolves to `139.59.72.220`, confirmed against GoDaddy's authoritative DNS
  and a public resolver. Nameservers remain with GoDaddy.
- No newsVio API container or Caddy site has been deployed. The application still calls
  Supabase services. A GitHub push is a source update, not production cutover.
- Hostinger GitHub deployment must use `main` per the owner's latest instruction.
