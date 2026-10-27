import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase } from './pool';
import { migrate } from './migrate';
import { backupSource, verifySourceBackup } from './source-backup';

const connection = process.env.STANDALONE_TEST_DATABASE_URL;
if (!connection) throw new Error('STANDALONE_TEST_DATABASE_URL is required');
const url = new URL(connection);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/newsvio') {
  throw new Error('This check runs only against a disposable local newsvio database');
}
const owner = new pg.Client({ connectionString: connection });
await owner.connect();
const runtimeUrl = new URL(connection);
runtimeUrl.username = 'newsvio_runtime';
runtimeUrl.password = '';
const db = createDatabase(runtimeUrl.toString(), 1);
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
try {
  await migrate(connection, fileURLToPath(new URL('../../../', import.meta.url)));
  assert.equal(
    (await owner.query('select count(*)::int as n from public.profiles')).rows[0].n,
    0,
    'test database must have no users',
  );
  await owner.query(
    "insert into auth.users (id,email) values ($1,'a@local.test'),($2,'b@local.test')",
    [a, b],
  );
  const userA = { role: 'authenticated', userId: a } as const;
  const userB = { role: 'authenticated', userId: b } as const;
  const rows = await db.asUser(userA, (c) => c.query('select id from public.profiles'));
  assert.deepEqual(
    rows.rows.map((r) => r.id),
    [a],
    'RLS hides other users',
  );
  await assert.rejects(
    db.asUser(userA, (c) =>
      c.query("update public.profiles set role = 'admin' where id = $1", [a]),
    ),
    /permission denied/,
  );
  await assert.rejects(
    db.asUser(userA, (c) => c.query('select encrypted_secret from public.integration_credentials')),
    /permission denied/,
  );
  await assert.rejects(
    db.asUser({ role: 'anon' }, (c) => c.query('select * from public.orders')),
    /permission denied/,
  );
  await assert.rejects(
    db.asUser(userA, (c) =>
      c.query("select public.svc_apply_payment('a','b','captured',100,'INR')"),
    ),
    /permission denied/,
  );
  // Same pooled socket after failed transactions: B must never inherit A's subject or role.
  assert.deepEqual(
    (await db.asUser(userB, (c) => c.query('select id from public.profiles'))).rows.map(
      (r) => r.id,
    ),
    [b],
  );
  assert.equal(
    (await db.asService((c) => c.query('select count(*)::int as n from public.profiles'))).rows[0]
      .n,
    2,
  );
  assert.equal(
    (await db.asUser({ role: 'anon' }, (c) => c.query('select auth.uid() as id'))).rows[0].id,
    null,
  );
  const unsafe = await owner.query(
    "select tablename from pg_tables where schemaname = 'public' and not rowsecurity",
  );
  assert.equal(unsafe.rowCount, 0, 'all public tables have RLS');
  const role = await owner.query(
    "select rolsuper, rolcreaterole, rolcreatedb, rolbypassrls from pg_roles where rolname = 'newsvio_runtime'",
  );
  assert.deepEqual(role.rows[0], {
    rolsuper: false,
    rolcreaterole: false,
    rolcreatedb: false,
    rolbypassrls: false,
  });
  const backupParent = await mkdtemp(join(tmpdir(), 'newsvio-source-check-'));
  const originalFetch = globalThis.fetch;
  try {
    await owner.query(
      "insert into storage.objects(id,bucket_id,name,content_type,size_bytes) values ('10000000-0000-4000-8000-000000000003','order-images','fixture/image.jpg','image/jpeg',3)",
    );
    globalThis.fetch = async (request) => {
      assert.equal(
        String(request),
        'https://source.test.invalid/storage/v1/object/authenticated/order-images/fixture/image.jpg',
      );
      return new Response(new Uint8Array([1, 2, 3]));
    };
    const output = join(backupParent, 'archive');
    const exported = await backupSource({
      databaseUrl: connection,
      storageUrl: 'https://source.test.invalid',
      storageKey: 'fixture-key',
      output,
    });
    assert.equal(exported.objects, 1, 'file bytes exported in addition to database metadata');
    assert.deepEqual(await verifySourceBackup(output), exported);
    const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8')) as {
      objects: { path: string }[];
    };
    const exportedObject = manifest.objects[0];
    assert.ok(exportedObject);
    assert.deepEqual(await readFile(join(output, exportedObject.path)), Buffer.from([1, 2, 3]));
    await assert.rejects(
      backupSource({
        databaseUrl: connection,
        storageUrl: 'https://source.test.invalid',
        storageKey: 'fixture-key',
        output,
      }),
      /EEXIST/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    await owner.query(
      "delete from storage.objects where id='10000000-0000-4000-8000-000000000003'",
    );
    await rm(backupParent, { recursive: true, force: true });
  }
  console.info(
    'Standalone checks passed: RLS, column grants, service separation, pool identity isolation, migration replay, source snapshot and object-byte backup.',
  );
} finally {
  await owner.query('delete from auth.users where id = any($1::uuid[])', [[a, b]]);
  await db.close();
  await owner.end();
}
