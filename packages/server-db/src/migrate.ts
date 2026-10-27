import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import { namespaceLegacyRoles } from './sql-roles';

export async function loadMigrations(root: string) {
  const paths: { name: string; path: string; legacy: boolean }[] = [
    {
      name: '00000000000000_bootstrap.sql',
      path: join(root, 'infra/database/bootstrap.sql'),
      legacy: false,
    },
  ];
  for (const [directory, legacy] of [
    ['supabase/migrations', true],
    ['infra/database/migrations', false],
  ] as const) {
    for (const name of (await readdir(join(root, directory)))
      .filter((n) => /^\d{14}_[a-z0-9_]+\.sql$/.test(n))
      .sort()) {
      paths.push({ name, path: join(root, directory, name), legacy });
    }
  }
  if (new Set(paths.map((p) => p.name)).size !== paths.length)
    throw new Error('duplicate_migration');
  return Promise.all(
    paths.map(async (entry) => {
      const original = await readFile(entry.path, 'utf8');
      const sql = entry.legacy ? namespaceLegacyRoles(original) : original;
      // Detect edits to either the source or its role mapping on subsequent deployments.
      const checksum = createHash('sha256').update(original).update('\0').update(sql).digest('hex');
      return { name: entry.name, sql, checksum };
    }),
  );
}

export async function migrate(connectionString: string, root: string) {
  const migrations = await loadMigrations(root);
  const client = new pg.Client({ connectionString, application_name: 'newsvio-migrate' });
  await client.connect();
  try {
    await client.query(
      "select pg_advisory_lock(hashtextextended(current_database() || ':newsvio-migrate', 0))",
    );
    const exists = await client.query<{ table: string | null }>(
      "select to_regclass('newsvio_meta.migrations')::text as table",
    );
    if (!exists.rows[0]?.table) {
      const populated = await client.query(
        "select 1 from pg_namespace where nspname in ('auth', 'storage', 'private') union all select 1 from pg_tables where schemaname = 'public' limit 1",
      );
      if (populated.rowCount)
        throw new Error(
          'Target is not empty. Use a separate database and an explicit data import; refusing to adopt existing tables.',
        );
      await client.query(
        'create schema if not exists newsvio_meta; revoke all on schema newsvio_meta from public',
      );
      await client.query(
        'create table newsvio_meta.migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())',
      );
    }
    const applied = await client.query<{ name: string; checksum: string }>(
      'select name, checksum from newsvio_meta.migrations order by name',
    );
    for (const row of applied.rows) {
      const source = migrations.find((m) => m.name === row.name);
      if (!source || source.checksum !== row.checksum)
        throw new Error(`Migration history changed: ${row.name}`);
    }
    for (const migration of migrations) {
      if (applied.rows.some((r) => r.name === migration.name)) continue;
      await client.query('begin');
      try {
        await client.query(migration.sql);
        await client.query('insert into newsvio_meta.migrations (name, checksum) values ($1, $2)', [
          migration.name,
          migration.checksum,
        ]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
      console.info(`Applied ${migration.name}`);
    }
  } finally {
    // Session-level advisory lock is also released by disconnect after any error.
    await client.end();
  }
}
