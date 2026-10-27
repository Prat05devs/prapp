# Standalone newsVio database

This is the PostgreSQL foundation for removing Supabase. Auth/session handling, file serving,
workers and the web/API split are still being ported; this directory alone is not a deployment.

The application database is `newsvio`. Provisioning requires the shared cluster administrator:

```sh
psql -v ON_ERROR_STOP=1 -d newsvio -f infra/database/provision.sql
```

Provisioning runs once and refuses to reuse existing role names. Set the `newsvio_runtime`
password interactively with `psql`'s `\password newsvio_runtime` and store it in the password
manager. Do not use the database owner or shared administrator as the runtime login.
Audit the shared server's database CONNECT grants so this login cannot open other apps'
databases through the cluster's default PUBLIC privileges.

Set `MIGRATION_DATABASE_URL` privately to the newsVio database owner's connection and run:

```sh
pnpm --filter @prapp/server-db migrate
```

The runner bootstraps only an empty database, uses an advisory lock, applies each migration
transactionally, and stores source/rendered checksums. An altered or missing applied file
fails deployment. Historical SQL is read from `supabase/migrations` with only top-level role
identifiers mapped to `newsvio_anon`, `newsvio_authenticated` and `newsvio_service`.
Additional standalone migrations are applied from `infra/database/migrations`.

`DATABASE_URL` is the separate runtime connection. `createDatabase().asUser()` applies a
verified identity and restricted role for a single transaction. `asService()` is for backend
work only. Claims are server-supplied; never accept a user ID or role from a request body as
verified identity. The same checked-out connection executes BEGIN, identity setup, queries,
and COMMIT/ROLLBACK; transaction-local claims and roles cannot leak to another pooled caller.

Keep the shared PostgreSQL port private. The runtime joins the private data network; neither
the browser, mobile app, nor Hostinger frontend receives a database connection string.

For a disposable local PostgreSQL database only (not production): provision it, set
`STANDALONE_TEST_DATABASE_URL` to its owner connection, then run:

```sh
pnpm --filter @prapp/server-db test:standalone
```

The check requires loopback/localhost, database name `newsvio`, and no existing users. It
tests migration replay, RLS, column grants, backend RPC restrictions and pooled identity
isolation. The production migration runner itself does not delete/recreate a database or
import existing user data. Plan and test a separate identity-preserving data transfer and
file backup/restore before cutover.
