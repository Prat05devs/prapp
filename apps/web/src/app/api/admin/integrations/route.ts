import { NextResponse } from 'next/server';
import { activateIntegrationSchema, saveIntegrationSchema } from '@prapp/shared';
import { handleApi, parseBody, readJson } from '@/server/api';
import { requireStaff } from '@/server/staff';
import {
  activateIntegration,
  listIntegrations,
  requireIntegrationOrigin,
  saveIntegration,
} from '@/server/integrations';
import { rateLimit } from '@/server/rate-limit';

export const runtime = 'nodejs';
export const GET = handleApi(async (req: Request) => {
  await requireStaff(req, 'admin');
  return NextResponse.json(await listIntegrations(), { headers: { 'Cache-Control': 'no-store' } });
});
export const POST = handleApi(async (req: Request) => {
  const { user } = await requireStaff(req, 'admin');
  requireIntegrationOrigin(req);
  rateLimit(`integration:${user.id}`, 20, 60_000);
  const input = parseBody(saveIntegrationSchema, await readJson(req));
  const id = await saveIntegration(user.id, input);
  return NextResponse.json({ id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
});
export const PATCH = handleApi(async (req: Request) => {
  const { user } = await requireStaff(req, 'admin');
  requireIntegrationOrigin(req);
  rateLimit(`integration:${user.id}`, 20, 60_000);
  const { id } = parseBody(activateIntegrationSchema, await readJson(req));
  await activateIntegration(user.id, id);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
});
