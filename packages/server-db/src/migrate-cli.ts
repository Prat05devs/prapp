import { fileURLToPath } from 'node:url';
import { migrate } from './migrate';

const url = process.env.MIGRATION_DATABASE_URL;
if (!url)
  throw new Error(
    'MIGRATION_DATABASE_URL is required; do not use the runtime login for migrations.',
  );
await migrate(url, fileURLToPath(new URL('../../../', import.meta.url))).catch(() => {
  // Driver errors can include SQL or data. Keep deployment logs free of sensitive values.
  console.error('Database migration failed. Inspect the database and migration history securely.');
  process.exitCode = 1;
});
