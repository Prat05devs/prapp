# Optional export of the old newsVio test project

**Latest owner decision, 26 October 2026:** the existing Supabase content is test data and
does not need to be transferred. Create a fresh database on the shared server and leave
the old project untouched. This supersedes the earlier preservation request. No source
connection, export or password-hash import is required for the fresh deployment.

The tooling and procedures below are optional future export guidance. They have not been
run against the existing project. The application has not been cut over to the shared server.

## Backup preparation

The source PostgreSQL connection is required to preserve account/password records.
The Supabase service API key alone does not supply a database connection or password-hash
export. Add these settings to an ignored local environment file or the password manager;
do not paste secrets into chat or commit them:

- `MIGRATION_SOURCE_DATABASE_URL`: PostgreSQL owner connection to the existing project,
  using TLS. Get it from the existing project's connection settings.
- `MIGRATION_SOURCE_STORAGE_URL`: that project's HTTPS URL.
- `MIGRATION_SOURCE_STORAGE_KEY`: its server-side secret key.
- `MIGRATION_BACKUP_DIR`: a new private directory under ProjectsSSD, for example
  `/Volumes/ProjectsSSD/prapp/.migration-backups/<timestamp>`.

With these variables loaded privately into the process environment:

```sh
pnpm --filter @prapp/server-db backup:source
pnpm --filter @prapp/server-db backup:verify
```

The exporter is read-only. It creates a consistent PostgreSQL snapshot of public business
tables, `auth.users`, `auth.identities` when present, and storage metadata. It then downloads
the actual storage object bytes. Files are private (directory mode 700, file mode 600),
opaque filenames prevent source paths from escaping the backup, and a manifest records
row counts, file sizes and SHA-256 checksums. Failure leaves an incomplete archive; an
existing archive is never overwritten. Keep the archive private and encrypt any off-device
copy because it includes personal data and password hashes.

Supabase confirms that [database backups contain storage metadata, not the file bytes](https://supabase.com/docs/guides/platform/backups).
A SQL dump alone is therefore insufficient to preserve images and PDFs.

The source can change while files are downloading. Do an initial export/rehearsal, then
freeze writes and drain payment/notification work for the final export/delta and cutover.
If a referenced source object disappears during download, export fails instead of silently
claiming a complete backup. Active sessions and refresh tokens are intentionally excluded:
users must sign in again after the auth backend changes.

## Import and cutover requirements

Do not import into production until the replacement auth/storage/runtime implementations
are complete and the same archive has passed a rehearsal on an isolated target database.
The importer must preserve user UUIDs, provider identities and password verification,
order IDs/numbers, payment/refund provider IDs, audit history, report IDs, storage paths,
settings, catalogue data, and encrypted integration credentials. The corresponding master
encryption key must be backed up separately. Do not import or replay active sessions.

The standalone bootstrap is an empty target schema, not an identity/password importer.
It must not be mistaken for a completed migration. No production importer or cutover
has been run. Replacement password/session handling must be implemented before loading
the exported auth records; copying user IDs alone would not preserve password sign-in.

Before switching traffic, compare table counts, foreign-key relationships, user/order
ownership, money totals in minor units, all stored object hashes and report links. Verify
sign-in and password reset, uploads, admin permissions, payment webhooks, refund recovery,
fact-check jobs, and notification delivery. Prevent both old and new workers from issuing
money-related operations during the handoff. Queue authenticated incoming payment events
durably and reconcile provider state after the final import.

Keep the original project, verified exports and files intact until the new service has
passed the agreed observation period. A rollback after accepting new writes requires
reconciliation of those writes and provider events; changing DNS back alone is insufficient.
