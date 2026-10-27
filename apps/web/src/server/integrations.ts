import 'server-only';
import {
  saveIntegrationSchema,
  type IntegrationSummary,
  type SaveIntegrationInput,
} from '@prapp/shared';
import { AppError, throwDbError } from './api';
import { decryptIntegration, encryptIntegration } from './integration-crypto';
import { createServiceClient } from './supabase/service';
import { validateIntegrationConnection } from './integration-validation';

export async function listIntegrations(): Promise<IntegrationSummary[]> {
  const db = createServiceClient();
  const [credentials, active] = await Promise.all([
    db
      .from('integration_credentials')
      .select('id, provider, label, environment, project_id, key_hint, created_at')
      .order('created_at', { ascending: false }),
    db.from('integration_active').select('credential_id'),
  ]);
  if (credentials.error) throwDbError(credentials.error);
  if (active.error) throwDbError(active.error);
  const ids = new Set((active.data ?? []).map((r) => r.credential_id));
  return (credentials.data ?? []).map((r) => ({
    id: r.id,
    provider: r.provider as IntegrationSummary['provider'],
    label: r.label,
    environment: r.environment as IntegrationSummary['environment'],
    projectId: r.project_id,
    keyHint: r.key_hint,
    active: ids.has(r.id),
    createdAt: r.created_at,
  }));
}

export async function saveIntegration(actorId: string, input: SaveIntegrationInput) {
  const context = `${input.provider}:${input.provider === 'razorpay' ? input.environment : input.projectId}`;
  const encrypted = encryptIntegration(input, context);
  const key = input.provider === 'razorpay' ? input.keyId : input.apiKey;
  const { data, error } = await createServiceClient().rpc('svc_save_integration', {
    p_actor: actorId,
    p_provider: input.provider,
    p_label: input.label,
    p_environment: input.provider === 'razorpay' ? input.environment : 'production',
    p_project_id: input.provider === 'gemini' ? input.projectId : '',
    p_metadata: {},
    p_encrypted_secret: encrypted,
    p_key_hint: `••••${key.slice(-4)}`,
  });
  if (error) throwDbError(error);
  return data;
}

export async function integrationCredentials(id: string): Promise<SaveIntegrationInput> {
  const { data, error } = await createServiceClient()
    .from('integration_credentials')
    .select('provider, environment, project_id, encrypted_secret')
    .eq('id', id)
    .single();
  if (error) throwDbError(error);
  const context = `${data.provider}:${data.provider === 'razorpay' ? data.environment : data.project_id}`;
  return saveIntegrationSchema.parse(decryptIntegration(data.encrypted_secret, context));
}

export async function activeIntegration(provider: 'razorpay' | 'gemini') {
  const { data, error } = await createServiceClient()
    .from('integration_active')
    .select('credential_id')
    .eq('provider', provider)
    .maybeSingle();
  if (error) throwDbError(error);
  return data
    ? { id: data.credential_id, credentials: await integrationCredentials(data.credential_id) }
    : null;
}

export async function activateIntegration(actorId: string, id: string) {
  // Prove that the version is valid/decryptable before making it active.
  const config = await integrationCredentials(id);
  try {
    await validateIntegrationConnection(config);
  } catch {
    throw new AppError('validation_failed', {
      formErrors: [
        'Provider connection check failed. Check the credentials and model access, then retry.',
      ],
    });
  }
  const { error } = await createServiceClient().rpc('svc_activate_integration', {
    p_actor: actorId,
    p_id: id,
  });
  if (error) throwDbError(error);
}

export function requireIntegrationOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').origin;
  if (origin !== expected) throw new AppError('not_authorized');
}
