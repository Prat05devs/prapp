import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Json, TablesInsert } from '@prapp/db-types';
import { inputHash } from '@prapp/fact-check';
import {
  LIMITS,
  factCheckSubmitSchema,
  type FactCheckHistoryItem,
  type FactCheckReport,
  type FactCheckSubmitResponse,
  type FcInputType,
} from '@prapp/shared';
import { z } from 'zod';
import { AppError, throwDbError } from '@/server/api';
import type { ServiceSupabase } from '@/server/service-types';

const CACHE_DAYS = 7;
const UNVERIFIED_CACHE_MS = 60 * 60_000;
/** Deploy time of the Google News evidence pipeline; older results are not reused. */
const PIPELINE_SINCE = '2026-10-01T18:00:00Z';

async function settingInt(
  service: ServiceSupabase,
  key: string,
  fallback: number,
): Promise<number> {
  const { data } = await service.from('app_settings').select('value').eq('key', key).maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const MAGIC: [string, number[]][] = [
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['image/webp', [0x52, 0x49, 0x46, 0x46]], // RIFF…WEBP
];

/** Decodes a base64 screenshot and checks the real file type (not the client's claim). */
export function decodeImage(b64: string): { bytes: Buffer; mime: string; ext: string } {
  const clean = b64.replace(/^data:[^;]+;base64,/, '');
  const bytes = Buffer.from(clean, 'base64');
  if (!bytes.length || bytes.length > LIMITS.factCheckImageMaxBytes) {
    throw new AppError('validation_failed', {
      fieldErrors: { imageBase64: ['Image must be 5 MB or smaller'] },
    });
  }
  const found = MAGIC.find(([, sig]) => sig.every((b, i) => bytes[i] === b));
  if (!found || (found[0] === 'image/webp' && bytes.subarray(8, 12).toString('ascii') !== 'WEBP')) {
    throw new AppError('validation_failed', {
      fieldErrors: { imageBase64: ['Use a JPG, PNG or WebP image'] },
    });
  }
  const mime = found[0];
  return { bytes, mime, ext: mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]! };
}

export interface Caller {
  userId: string | null;
  deviceId: string;
  ip: string;
}

/** POST /api/fact-checks (LLD §11.1). */
export async function submitFactCheck(
  service: ServiceSupabase,
  caller: Caller,
  body: unknown,
): Promise<FactCheckSubmitResponse> {
  const parsed = factCheckSubmitSchema.safeParse(body);
  if (!parsed.success) throw new AppError('validation_failed', z.flattenError(parsed.error));
  const input = parsed.data;

  let hash: string;
  let image: ReturnType<typeof decodeImage> | null = null;
  if (input.type === 'image') {
    image = decodeImage(input.imageBase64);
    hash = await inputHash('image', new Uint8Array(image.bytes));
  } else {
    hash = await inputHash(input.type, input.type === 'text' ? input.text : input.url);
  }

  // 4. Cache: a full check of the same input in the last 7 days (does not use the limit).
  //    "Unverified" is reused for an hour only: coverage of breaking news grows quickly.
  //    Results from before the news-search checker (PIPELINE_SINCE) are never reused.
  const since = new Date(
    Math.max(Date.now() - CACHE_DAYS * 86_400_000, Date.parse(PIPELINE_SINCE)),
  ).toISOString();
  const unverifiedSince = new Date(Date.now() - UNVERIFIED_CACHE_MS).toISOString();
  const { data: cached } = await service
    .from('fact_checks')
    .select('id')
    .eq('input_hash', hash)
    .eq('status', 'done')
    .eq('mode', 'full')
    .gte('created_at', since)
    .or(`verdict.neq.unverified,created_at.gte.${unverifiedSince}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const base: TablesInsert<'fact_checks'> = {
    user_id: caller.userId,
    device_id: caller.userId ? null : caller.deviceId,
    input_type: input.type as FcInputType,
    input_text: input.type === 'text' ? input.text : null,
    input_url: input.type === 'url' ? input.url : null,
    input_hash: hash,
  };

  if (cached) return copyCachedResult(service, cached.id, base);

  // 2. Limits (atomic in SQL). Over the limit → 429 (guests are told to sign in).
  if (caller.userId) {
    const limit = await settingInt(
      service,
      'factcheck.user_daily_limit',
      LIMITS.userFactChecksPerDay,
    );
    await consume(service, 'user', caller.userId, limit);
  } else {
    const limit = await settingInt(
      service,
      'factcheck.guest_daily_limit',
      LIMITS.guestFactChecksPerDay,
    );
    await consume(service, 'guest_device', caller.deviceId, limit);
    try {
      await consume(service, 'guest_ip', caller.ip, limit);
    } catch (e) {
      await service.rpc('svc_refund_quota', { p_scope: 'guest_device', p_key: caller.deviceId });
      throw e;
    }
  }

  // 5. Upload the screenshot first, then insert (the insert webhook starts the worker).
  const id = randomUUID();
  let imagePath: string | null = null;
  if (image) {
    imagePath = `${caller.userId ?? caller.deviceId}/${id}.${image.ext}`;
    const up = await service.storage
      .from('fact-check-uploads')
      .upload(imagePath, image.bytes, { contentType: image.mime, upsert: false });
    if (up.error) throw new AppError('internal_error');
  }
  const { data, error } = await service
    .from('fact_checks')
    .insert({ id, ...base, image_path: imagePath, status: 'queued' })
    .select('id, report_id, status')
    .single();
  if (error) throwDbError(error);
  return { id: data.id, reportId: data.report_id, status: data.status };
}

async function consume(service: ServiceSupabase, scope: string, key: string, limit: number) {
  const { data, error } = await service.rpc('svc_consume_quota', {
    p_scope: scope,
    p_key: key,
    p_limit: limit,
  });
  if (error) throwDbError(error);
  if (!data) throw new AppError('fact_check_limit_reached');
}

/** Copies a cached result into a new row so the user gets their own report id / history. */
async function copyCachedResult(
  service: ServiceSupabase,
  sourceId: string,
  base: TablesInsert<'fact_checks'>,
): Promise<FactCheckSubmitResponse> {
  const report = await loadReport(service, { id: sourceId });
  const { data: src } = await service
    .from('fact_checks')
    .select('image_path, input_domain, input_domain_tier, input_domain_age_days')
    .eq('id', sourceId)
    .single();
  const { data: row, error } = await service
    .from('fact_checks')
    .insert({ ...base, image_path: src?.image_path ?? null, status: 'processing' })
    .select('id, report_id')
    .single();
  if (error) throwDbError(error);
  const result = {
    verdict: report.verdict,
    confidence: report.confidence,
    summary: report.summary,
    language: report.language,
    mode: report.mode,
    full_check_status: report.fullCheckStatus,
    input_domain: src?.input_domain ?? null,
    input_domain_tier: src?.input_domain_tier ?? null,
    input_domain_age_days: src?.input_domain_age_days ?? null,
    claims: report.claims.map((c) => ({
      position: c.position,
      claim_text: c.claimText,
      verdict: c.verdict,
      explanation: c.explanation,
      is_government_related: c.isGovernmentRelated,
      sources: c.sources.map((s) => ({
        url: s.url,
        domain: s.domain,
        title: s.title,
        publisher: s.publisher,
        tier: s.tier,
        stance: s.stance,
        is_existing_fact_check: s.isExistingFactCheck,
        rating: s.rating,
      })),
    })),
    tool_runs: report.toolRuns.map((t) => ({
      tool: t.tool,
      model: t.model,
      status: t.status,
      summary: t.summary,
    })),
  };
  const { error: completeError } = await service.rpc('svc_complete_fact_check', {
    p_id: row.id,
    p_result: result as unknown as Json,
  });
  if (completeError) throwDbError(completeError);
  return { id: row.id, reportId: row.report_id, status: 'done' };
}

/** One report with claims, sources and tool runs (service client: callers check access). */
export async function loadReport(
  service: ServiceSupabase,
  where: { id: string } | { reportId: string },
): Promise<
  FactCheckReport & { userId: string | null; deviceId: string | null; imagePath: string | null }
> {
  let q = service
    .from('fact_checks')
    .select(
      'id, report_id, user_id, device_id, status, error, input_type, input_text, input_url, image_path, input_domain, input_domain_tier, input_domain_age_days, verdict, confidence, summary, language, mode, full_check_status, is_public, completed_at, created_at',
    );
  q = 'id' in where ? q.eq('id', where.id) : q.eq('report_id', where.reportId);
  const { data: fc, error } = await q.maybeSingle();
  if (error) throwDbError(error);
  if (!fc) throw new AppError('not_authorized');

  const [{ data: claims }, { data: runs }] = await Promise.all([
    service
      .from('fact_check_claims')
      .select(
        'id, position, claim_text, verdict, explanation, is_government_related, fact_check_sources(url, domain, title, publisher, tier, stance, is_existing_fact_check, rating)',
      )
      .eq('fact_check_id', fc.id)
      .order('position'),
    service
      .from('fact_check_tool_runs')
      .select('tool, model, status, summary')
      .eq('fact_check_id', fc.id)
      .order('id'),
  ]);

  return {
    id: fc.id,
    reportId: fc.report_id,
    userId: fc.user_id,
    deviceId: fc.device_id,
    imagePath: fc.image_path,
    status: fc.status,
    error: fc.error,
    inputType: fc.input_type,
    inputText: fc.input_text,
    inputUrl: fc.input_url,
    inputDomain: fc.input_domain,
    inputDomainTier: fc.input_domain_tier,
    inputDomainAgeDays: fc.input_domain_age_days,
    verdict: fc.verdict,
    confidence: fc.confidence as FactCheckReport['confidence'],
    summary: fc.summary,
    language: fc.language,
    mode: fc.mode,
    fullCheckStatus: fc.full_check_status as FactCheckReport['fullCheckStatus'],
    isPublic: fc.is_public,
    checkedAt: fc.completed_at,
    createdAt: fc.created_at,
    claims: (claims ?? []).map((c) => ({
      position: c.position,
      claimText: c.claim_text,
      verdict: c.verdict,
      explanation: c.explanation,
      isGovernmentRelated: c.is_government_related,
      sources: (c.fact_check_sources ?? [])
        .map((s) => ({
          url: s.url,
          domain: s.domain,
          title: s.title,
          publisher: s.publisher,
          tier: s.tier,
          stance: s.stance as FactCheckReport['claims'][number]['sources'][number]['stance'],
          isExistingFactCheck: s.is_existing_fact_check,
          rating: s.rating,
        }))
        .sort((a, b) => Number(b.isExistingFactCheck) - Number(a.isExistingFactCheck)),
    })),
    toolRuns: runs ?? [],
  };
}

/** Public report fields only (strips who submitted it). */
export function publicReport(r: Awaited<ReturnType<typeof loadReport>>): FactCheckReport {
  const { userId: _u, deviceId: _d, imagePath: _i, ...rest } = r;
  return rest;
}

/** Owner = the signed-in user, or the same device id for guest checks (LLD §8.4). */
export function isOwner(
  r: { userId: string | null; deviceId: string | null },
  userId: string | null,
  deviceId: string | null,
) {
  if (r.userId) return r.userId === userId;
  return Boolean(deviceId && r.deviceId === deviceId);
}

export async function historyFor(
  service: ServiceSupabase,
  userId: string,
): Promise<FactCheckHistoryItem[]> {
  const { data, error } = await service
    .from('fact_checks')
    .select(
      'id, report_id, status, input_type, input_text, input_url, verdict, is_public, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throwDbError(error);
  return (data ?? []).map((f) => ({
    id: f.id,
    reportId: f.report_id,
    status: f.status,
    inputType: f.input_type,
    preview: (f.input_text ?? f.input_url ?? 'Screenshot').slice(0, 140),
    verdict: f.verdict,
    isPublic: f.is_public,
    createdAt: f.created_at,
  }));
}
