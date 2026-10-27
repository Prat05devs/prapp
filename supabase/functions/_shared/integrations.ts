import { saveIntegrationSchema } from '../../../packages/shared/src/schemas/integrations.ts';
import { env } from './env.ts';
import type { ServiceClient } from './supabase.ts';

function bytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
}

/** Same AES-GCM envelope as the admin API; no secrets are returned to a browser. */
export async function activeGeminiConfiguration(db: ServiceClient) {
  const { data: active, error } = await db
    .from('integration_active')
    .select('credential_id')
    .eq('provider', 'gemini')
    .maybeSingle();
  if (error) throw new Error('integration_configuration_unavailable');
  if (!active) return null;
  const { data, error: readError } = await db
    .from('integration_credentials')
    .select('encrypted_secret, project_id')
    .eq('id', active.credential_id)
    .single();
  if (readError || !data) throw new Error('integration_configuration_unavailable');
  try {
    const rawKey = env('CONFIG_MASTER_KEY');
    if (!rawKey) throw new Error();
    const [version, iv, tag, encrypted, extra] = data.encrypted_secret.split('.');
    if (version !== 'v1' || !iv || !tag || !encrypted || extra !== undefined) throw new Error();
    const key = await crypto.subtle.importKey('raw', bytes(rawKey), 'AES-GCM', false, ['decrypt']);
    const body = bytes(encrypted);
    const authTag = bytes(tag);
    const sealed = new Uint8Array(body.length + authTag.length);
    sealed.set(body);
    sealed.set(authTag, body.length);
    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: bytes(iv),
        additionalData: new TextEncoder().encode(
          `newsvio:integrations:v1:gemini:${data.project_id}`,
        ),
        tagLength: 128,
      },
      key,
      sealed,
    );
    const parsed = saveIntegrationSchema.parse(JSON.parse(new TextDecoder().decode(plain)));
    if (parsed.provider !== 'gemini') throw new Error();
    return parsed;
  } catch {
    throw new Error('integration_configuration_invalid');
  }
}
