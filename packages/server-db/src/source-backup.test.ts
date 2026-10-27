import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifySourceBackup } from './source-backup';

describe('migration archive verification', () => {
  it('detects a modified table export', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'newsvio-backup-test-'));
    try {
      await mkdir(join(directory, 'tables'));
      const content = '{"id":"example"}\n';
      const path = 'tables/01.jsonl';
      await writeFile(join(directory, path), content);
      await writeFile(
        join(directory, 'manifest.json'),
        JSON.stringify({
          version: 1,
          complete: true,
          tables: [{ path, sha256: createHash('sha256').update(content).digest('hex') }],
          objects: [],
        }),
      );
      expect(await verifySourceBackup(directory)).toEqual({ tables: 1, objects: 0 });
      await writeFile(join(directory, path), '{"id":"changed"}\n');
      await expect(verifySourceBackup(directory)).rejects.toThrow('checksum mismatch');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('rejects an archive path outside the backup directory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'newsvio-backup-test-'));
    try {
      await writeFile(
        join(directory, 'manifest.json'),
        JSON.stringify({
          version: 1,
          complete: true,
          tables: [{ path: '../secret', sha256: 'invalid' }],
          objects: [],
        }),
      );
      await expect(verifySourceBackup(directory)).rejects.toThrow('Invalid archive path');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
