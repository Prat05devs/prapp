import {
  FactCheckInputError,
  cloudflareLLM,
  geminiLLM,
  geminiSearch,
  openAiCompatibleLLM,
  runFactCheck,
  searxngSearch,
  type LLM,
  type PipelineResult,
  type QuotaStore,
  type WebSearch,
} from '../../../packages/fact-check/src/index.ts';
import type { SourceTier } from '../../../packages/shared/src/constants.ts';
import { env } from '../_shared/env.ts';
import { isServiceCaller, json, serviceClient, type ServiceClient } from '../_shared/supabase.ts';

// Fact-check worker (LLD §11.2). Invoked by the insert webhook and by pg_cron every minute.
// Loop: svc_claim_fact_check() until none are left or 50 s pass; each job gets 60 s.

const LOOP_BUDGET_MS = 50_000;
const JOB_TIMEOUT_MS = 60_000;

// DECISION: default daily call budgets for free tiers; tune per model in provider_usage.daily_quota.
const GEMINI_DAILY_QUOTA = Number(env('GEMINI_DAILY_QUOTA') ?? 200);

function buildProviders(): { llms: LLM[]; searches: WebSearch[] } {
  const llms: LLM[] = [];
  const searches: WebSearch[] = [];
  const gemini = env('GEMINI_API_KEY');
  const model = env('GEMINI_MODEL') ?? 'gemini-3.5-flash';
  const lite = env('GEMINI_LITE_MODEL') ?? 'gemini-3.5-flash-lite';
  if (gemini) {
    llms.push(geminiLLM({ apiKey: gemini, model, ocrModel: lite }));
    // Search grounding is paid-tier only; the free tier answers 429. Opt in once billing is on.
    if (env('GEMINI_SEARCH') === 'on') searches.push(geminiSearch({ apiKey: gemini, model }));
  }
  const groq = env('GROQ_API_KEY');
  if (groq) {
    llms.push(
      openAiCompatibleLLM({
        provider: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: groq,
        model: env('GROQ_MODEL') ?? 'openai/gpt-oss-120b',
      }),
    );
  }
  // Extra free models with their own rate limits, used when the ones above are busy.
  if (gemini) llms.push(geminiLLM({ apiKey: gemini, model: lite, ocrModel: lite }));
  if (groq) {
    llms.push(
      openAiCompatibleLLM({
        provider: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: groq,
        model: env('GROQ_FALLBACK_MODEL') ?? 'qwen/qwen3.8-27b',
      }),
    );
  }
  const cfToken = env('CLOUDFLARE_AI_TOKEN');
  const cfAccount = env('CLOUDFLARE_ACCOUNT_ID');
  if (cfToken && cfAccount) {
    llms.push(
      cloudflareLLM({
        accountId: cfAccount,
        token: cfToken,
        model: env('CLOUDFLARE_MODEL') ?? '@cf/meta/llama-3.1-8b-instruct',
      }),
    );
  }
  const openrouter = env('OPENROUTER_API_KEY');
  if (openrouter) {
    llms.push(
      openAiCompatibleLLM({
        provider: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: openrouter,
        model: env('OPENROUTER_MODEL') ?? 'meta-llama/llama-3.3-70b-instruct:free',
      }),
    );
  }
  const searx = env('SEARXNG_URL');
  if (searx) searches.push(searxngSearch({ baseUrl: searx }));
  return { llms, searches };
}

function quotaStore(db: ServiceClient): QuotaStore {
  return {
    async use(provider, model) {
      const { data, error } = await db.rpc('svc_use_provider', {
        p_provider: provider,
        p_model: model,
        p_default_quota: provider === 'gemini' ? GEMINI_DAILY_QUOTA : undefined,
      });
      return !error && data === true;
    },
    async usageRatio(provider, model) {
      const { data } = await db.rpc('svc_provider_usage_ratio', {
        p_provider: provider,
        p_model: model,
      });
      return Number(data ?? 0);
    },
  };
}

async function trustedSources(db: ServiceClient): Promise<Map<string, SourceTier>> {
  const { data } = await db.from('trusted_sources').select('domain, tier');
  return new Map((data ?? []).map((r) => [String(r.domain).toLowerCase(), r.tier]));
}

function toDbResult(r: PipelineResult, wasQueuedForFull: boolean) {
  return {
    verdict: r.verdict,
    confidence: r.confidence,
    summary: r.summary,
    language: r.language,
    mode: r.mode,
    full_check_status: wasQueuedForFull && r.mode === 'full' ? 'done' : r.fullCheckStatus,
    input_domain: r.inputDomain,
    input_domain_tier: r.inputDomainTier,
    input_domain_age_days: r.inputDomainAgeDays,
    claims: r.claims.map((c) => ({
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
        published_at: s.publishedAt,
      })),
    })),
    tool_runs: r.toolRuns.map((t) => ({
      tool: t.tool,
      model: t.model,
      status: t.status,
      started_at: t.startedAt,
      finished_at: t.finishedAt,
      summary: t.summary,
    })),
  };
}

async function processJob(
  db: ServiceClient,
  job: Record<string, unknown>,
  providers: ReturnType<typeof buildProviders>,
  trusted: Map<string, SourceTier>,
) {
  const id = job.id as string;
  const wasQueuedForFull = job.full_check_status === 'queued';
  let image: { bytes: Uint8Array; mimeType: string } | null = null;
  let imageUrl: string | null = null;
  if (job.input_type === 'image' && job.image_path) {
    const dl = await db.storage.from('fact-check-uploads').download(job.image_path as string);
    if (dl.error || !dl.data) throw new Error('image_missing');
    image = {
      bytes: new Uint8Array(await dl.data.arrayBuffer()),
      mimeType: dl.data.type || 'image/jpeg',
    };
    const signed = await db.storage
      .from('fact-check-uploads')
      .createSignedUrl(job.image_path as string, 600);
    imageUrl = signed.data?.signedUrl ?? null;
  }

  const result = await Promise.race([
    runFactCheck(
      {
        id,
        inputType: job.input_type as 'text' | 'url' | 'image',
        text: (job.input_text as string | null) ?? null,
        url: (job.input_url as string | null) ?? null,
        image,
        isGuest: !job.user_id,
      },
      {
        ...providers,
        quota: quotaStore(db),
        trusted,
        factCheckApiKey: env('GOOGLE_FACTCHECK_API_KEY'),
        imageUrl,
      },
    ),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('job_timeout')), JOB_TIMEOUT_MS),
    ),
  ]);

  const { error } = await db.rpc('svc_complete_fact_check', {
    p_id: id,
    p_result: toDbResult(result, wasQueuedForFull),
  });
  if (error) throw new Error(`save_failed: ${error.message}`);

  // Reduced → full re-check finished: tell the signed-in owner (LLD §11.3, §12).
  if (wasQueuedForFull && result.mode === 'full' && job.user_id) {
    await db.from('notifications').insert({
      user_id: job.user_id as string,
      type: 'fact_check_full_ready',
      title: 'Your full fact check is ready',
      body: 'We finished the full check you asked for earlier. Tap to see the updated report.',
      data: { report_id: job.report_id, deep_link: `/r/${job.report_id}` },
      channels: ['in_app', 'push'],
    });
  }
  return { id, verdict: result.verdict, mode: result.mode };
}

async function alertAdminsAt80Percent(db: ServiceClient) {
  const model = env('GEMINI_MODEL') ?? 'gemini-3.5-flash';
  const { data: ratio } = await db.rpc('svc_provider_usage_ratio', {
    p_provider: 'gemini',
    p_model: model,
  });
  if (Number(ratio ?? 0) < 0.8) return;
  const { data: first } = await db.rpc('svc_consume_quota', {
    p_scope: 'alert',
    p_key: 'gemini_80',
    p_limit: 1,
  });
  if (!first) return;
  const { data: admins } = await db
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);
  if (!admins?.length) return;
  await db.from('notifications').insert(
    admins.map((a) => ({
      user_id: a.id,
      type: 'admin_ai_quota',
      title: "Gemini is at 80 % of today's free quota",
      body: 'Guests now get checks without live web search. Signed-in users keep full checks.',
      data: {},
      channels: ['in_app', 'email'],
    })),
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!isServiceCaller(req)) return json({ error: 'forbidden' }, 403);
  const db = serviceClient();
  const providers = buildProviders();
  const trusted = await trustedSources(db);
  const started = Date.now();
  const done: unknown[] = [];

  while (Date.now() - started < LOOP_BUDGET_MS) {
    const { data: job, error } = await db.rpc('svc_claim_fact_check');
    if (error || !job || !(job as { id?: string }).id) break;
    const row = job as Record<string, unknown>;
    try {
      done.push(await processJob(db, row, providers, trusted));
    } catch (e) {
      const input = e instanceof FactCheckInputError;
      const message = e instanceof Error ? e.message : String(e);
      await db.rpc('svc_fail_fact_check', {
        p_id: row.id as string,
        p_error: message,
        p_retry: !input,
      });
      if (input && message === 'no_text_in_image') {
        // Not the user's fault: give the check back (LLD §11.2 step 1).
        if (row.user_id)
          await db.rpc('svc_refund_quota', { p_scope: 'user', p_key: row.user_id as string });
        if (row.device_id)
          await db.rpc('svc_refund_quota', {
            p_scope: 'guest_device',
            p_key: row.device_id as string,
          });
      }
      done.push({ id: row.id, error: message });
    }
  }
  await alertAdminsAt80Percent(db).catch(() => {});
  return json({ processed: done.length, jobs: done });
});
