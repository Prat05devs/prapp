import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function masterKey(raw: string | undefined): Buffer {
  if (!raw || !/^[A-Za-z0-9+/]{43}=$/.test(raw))
    throw new Error('CONFIG_MASTER_KEY must be a base64-encoded 32-byte key');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('Invalid CONFIG_MASTER_KEY');
  return key;
}

export function encryptIntegration(
  value: unknown,
  context: string,
  rawKey = process.env.CONFIG_MASTER_KEY,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey(rawKey), iv);
  cipher.setAAD(Buffer.from(`newsvio:integrations:v1:${context}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptIntegration(
  value: string,
  context: string,
  rawKey = process.env.CONFIG_MASTER_KEY,
): unknown {
  try {
    const [version, iv, tag, data, extra] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !data || extra !== undefined) throw new Error();
    const decipher = createDecipheriv(
      'aes-256-gcm',
      masterKey(rawKey),
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAAD(Buffer.from(`newsvio:integrations:v1:${context}`));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(
      Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString(
        'utf8',
      ),
    ) as unknown;
  } catch {
    throw new Error('Integration credentials could not be decrypted');
  }
}
