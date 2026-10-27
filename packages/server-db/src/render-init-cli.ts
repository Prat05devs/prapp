import { fileURLToPath } from 'node:url';
import { renderDatabaseInit } from './render-init';

process.stdout.write(
  await renderDatabaseInit(fileURLToPath(new URL('../../../', import.meta.url))),
);
