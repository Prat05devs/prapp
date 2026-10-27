import { backupSource, verifySourceBackup } from './source-backup';

const action = process.argv[2];
const output = process.env.MIGRATION_BACKUP_DIR;
if (!output)
  throw new Error('MIGRATION_BACKUP_DIR is required; use a new private directory on ProjectsSSD');
try {
  if (action === 'verify') console.info(await verifySourceBackup(output));
  else if (action === 'export') {
    const databaseUrl = process.env.MIGRATION_SOURCE_DATABASE_URL;
    const storageUrl = process.env.MIGRATION_SOURCE_STORAGE_URL;
    const storageKey = process.env.MIGRATION_SOURCE_STORAGE_KEY;
    if (!databaseUrl || !storageUrl || !storageKey) throw new Error();
    console.info(await backupSource({ databaseUrl, storageUrl, storageKey, output }));
  } else throw new Error();
} catch {
  console.error(
    'Source backup failed or required settings are missing. No target database was modified. Keep incomplete archives private and inspect locally.',
  );
  process.exitCode = 1;
}
