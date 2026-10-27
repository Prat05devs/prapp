import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, join, dirname } from 'node:path';
import pg from 'pg';

const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
type TableBackup = { schema: string; table: string; path: string; rows: number; sha256: string };
type ObjectBackup = { bucket: string; name: string; path: string; bytes: number; sha256: string };
export type BackupManifest = {
  version: 1;
  complete: true;
  createdAt: string;
  tables: TableBackup[];
  objects: ObjectBackup[];
};

/** Read-only source export. No target database is opened or modified by this command. */
export async function backupSource(options: {
  databaseUrl: string;
  storageUrl: string;
  storageKey: string;
  output: string;
}) {
  const origin = new URL(options.storageUrl);
  if (origin.protocol !== 'https:') throw new Error('Source storage must use HTTPS');
  const destination = resolve(options.output);
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  await mkdir(destination, { mode: 0o700 }); // deliberately fail if an archive already exists
  await mkdir(join(destination, 'tables'), { mode: 0o700 });
  await mkdir(join(destination, 'objects'), { mode: 0o700 });
  await writeFile(
    join(destination, 'INCOMPLETE'),
    'Do not import this archive until manifest.json exists and verification passes.\n',
    { mode: 0o600 },
  );
  const source = new pg.Client({
    connectionString: options.databaseUrl,
    application_name: 'newsvio-read-only-export',
    connectionTimeoutMillis: 10_000,
  });
  const tables: TableBackup[] = [];
  const objects: ObjectBackup[] = [];
  await source.connect();
  try {
    await source.query('begin isolation level repeatable read read only');
    // All business tables, durable identity/security records, and the storage inventory.
    // Active session/refresh tokens are intentionally excluded: cutover requires reauthentication.
    const inventory = await source.query<{ schemaname: string; tablename: string }>(`
      select schemaname,tablename from pg_tables where schemaname='public'
      or (schemaname='auth' and tablename not in ('sessions','refresh_tokens','mfa_challenges','mfa_amr_claims','saml_relay_states','flow_state','one_time_tokens'))
      or (schemaname='storage' and tablename in ('buckets','objects')) order by schemaname,tablename`);
    if (!inventory.rows.some((r) => r.schemaname === 'auth' && r.tablename === 'users'))
      throw new Error('Source auth.users is missing');
    for (const required of ['profiles', 'orders', 'fact_checks']) {
      if (!inventory.rows.some((r) => r.schemaname === 'public' && r.tablename === required))
        throw new Error('Source is not a newsVio database');
    }
    for (const table of inventory.rows) {
      const path = `tables/${Buffer.from(`${table.schemaname}.${table.tablename}`).toString('hex')}.jsonl`;
      const handle = await open(join(destination, path), 'wx', 0o600);
      const hash = createHash('sha256');
      let count = 0;
      try {
        await source.query(
          `declare newsvio_backup_cursor no scroll cursor for select row_to_json(t)::text as value from ${identifier(table.schemaname)}.${identifier(table.tablename)} t`,
        );
        for (;;) {
          const batch = await source.query<{ value: string }>(
            'fetch forward 500 from newsvio_backup_cursor',
          );
          if (!batch.rows.length) break;
          for (const row of batch.rows) {
            const line = `${row.value}\n`;
            hash.update(line);
            await handle.writeFile(line);
            count++;
          }
        }
        await source.query('close newsvio_backup_cursor');
        await handle.sync();
      } finally {
        await handle.close();
      }
      tables.push({
        schema: table.schemaname,
        table: table.tablename,
        path,
        rows: count,
        sha256: hash.digest('hex'),
      });
    }
    await source.query('commit');
  } catch (error) {
    await source.query('rollback').catch(() => {});
    throw error;
  } finally {
    await source.end();
  }

  const storage = tables.find((t) => t.schema === 'storage' && t.table === 'objects');
  if (!storage) throw new Error('Source storage inventory is missing');
  // A database backup contains object metadata, not the image/PDF bytes. Export both.
  const lines = createInterface({
    input: createReadStream(join(destination, storage.path)),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    const row = JSON.parse(line) as { bucket_id?: unknown; name?: unknown };
    if (typeof row.bucket_id !== 'string' || typeof row.name !== 'string')
      throw new Error('Invalid storage inventory');
    if (row.name.split('/').some((part) => part === '.' || part === '..'))
      throw new Error('Unsafe storage path in source inventory');
    const id = createHash('sha256')
      .update(row.bucket_id)
      .update('\0')
      .update(row.name)
      .digest('hex');
    const path = `objects/${id}`;
    const url = new URL(
      `/storage/v1/object/authenticated/${encodeURIComponent(row.bucket_id)}/${row.name.split('/').map(encodeURIComponent).join('/')}`,
      origin,
    );
    const response = await fetch(url, {
      headers: { apikey: options.storageKey, Authorization: `Bearer ${options.storageKey}` },
      signal: AbortSignal.timeout(60_000),
      redirect: 'error',
    });
    if (!response.ok || !response.body)
      throw new Error('Could not download a storage object; archive remains incomplete');
    const file = await open(join(destination, `${path}.part`), 'wx', 0o600);
    const hash = createHash('sha256');
    let size = 0;
    const reader = response.body.getReader();
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        hash.update(chunk.value);
        await file.writeFile(chunk.value);
      }
      await file.sync();
    } finally {
      reader.releaseLock();
      await file.close();
    }
    await rename(join(destination, `${path}.part`), join(destination, path));
    objects.push({
      bucket: row.bucket_id,
      name: row.name,
      path,
      bytes: size,
      sha256: hash.digest('hex'),
    });
  }
  const manifest: BackupManifest = {
    version: 1,
    complete: true,
    createdAt: new Date().toISOString(),
    tables,
    objects,
  };
  await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2), {
    flag: 'wx',
    mode: 0o600,
  });
  await verifySourceBackup(destination);
  // Presence of COMPLETE is the final export marker.
  await writeFile(
    join(destination, 'COMPLETE'),
    'Checksums verified. This is sensitive user data; keep private.\n',
    { flag: 'wx', mode: 0o600 },
  );
  await unlink(join(destination, 'INCOMPLETE'));
  return { tables: tables.length, objects: objects.length };
}

export async function verifySourceBackup(directory: string) {
  const root = resolve(directory);
  const manifest = JSON.parse(
    await readFile(join(root, 'manifest.json'), 'utf8'),
  ) as BackupManifest;
  if (
    manifest.version !== 1 ||
    manifest.complete !== true ||
    !Array.isArray(manifest.tables) ||
    !Array.isArray(manifest.objects)
  )
    throw new Error('Invalid backup manifest');
  for (const entry of [...manifest.tables, ...manifest.objects]) {
    // Archive names are generated locally, never source object paths.
    if (!/^(tables\/[a-f0-9]+\.jsonl|objects\/[a-f0-9]{64})$/.test(entry.path))
      throw new Error('Invalid archive path');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(join(root, entry.path)))
      hash.update(chunk as Buffer);
    if (hash.digest('hex') !== entry.sha256) throw new Error('Backup checksum mismatch');
  }
  return { tables: manifest.tables.length, objects: manifest.objects.length };
}
