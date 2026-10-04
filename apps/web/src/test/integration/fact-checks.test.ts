import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decodeImage, isOwner, loadReport, submitFactCheck } from '@/server/fact-checks';
import { createUser, service } from './harness';

// Needs `supabase start` + `supabase functions serve` + scripts/local-vault.sh (webhook → worker).

const guest = () => ({ userId: null, deviceId: `dev-${randomUUID()}`, ip: `ip-${randomUUID()}` });

async function waitDone(id: string, timeoutMs = 50_000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const r = await loadReport(service, { id });
    if (r.status === 'done' || r.status === 'failed') return r;
    if (Date.now() > end) return r;
    await new Promise((res) => setTimeout(res, 1500));
  }
}

describe('fact checks (LLD §11)', () => {
  it('guest text → worker → report (reduced mode without AI keys)', async () => {
    const caller = guest();
    const text = `Forwarded: The state government will give free laptops to every student from ${randomUUID().slice(0, 6)}. Share now!`;
    const res = await submitFactCheck(service, caller, {
      type: 'text',
      text,
      deviceId: caller.deviceId,
    });
    expect(res.status).toBe('queued');
    expect(res.reportId).toMatch(/^FC-[0-9A-F]{8}$/);

    const r = await waitDone(res.id);
    expect(r.status).toBe('done');
    expect(r.claims.length).toBeGreaterThan(0);
    const tools = r.toolRuns.map((t) => t.tool);
    expect(tools).toEqual(expect.arrayContaining(['claim_extraction', 'gdelt', 'wikipedia']));
    // No LLM configured locally → reduced: never a verdict without evidence
    if (r.mode === 'reduced') {
      expect(r.verdict).toBe('unverified');
      expect(r.fullCheckStatus).toBe('queued');
    }
    expect(isOwner(r, null, caller.deviceId)).toBe(true);
    expect(isOwner(r, null, 'someone-else-device')).toBe(false);
  }, 70_000);

  it('enforces the guest daily limit (2) per device: the 3rd asks to log in', async () => {
    const caller = guest();
    for (let i = 0; i < 2; i++) {
      await submitFactCheck(service, caller, {
        type: 'text',
        text: `claim number ${i} ${randomUUID()}`,
        deviceId: caller.deviceId,
      });
    }
    await expect(
      submitFactCheck(service, caller, {
        type: 'text',
        text: `one more ${randomUUID()}`,
        deviceId: caller.deviceId,
      }),
    ).rejects.toMatchObject({ code: 'fact_check_limit_reached' });
  });

  it('signed-in users get their own limit and history', async () => {
    const user = await createUser();
    const caller = { userId: user.id, deviceId: `dev-${randomUUID()}`, ip: `ip-${randomUUID()}` };
    const res = await submitFactCheck(service, caller, {
      type: 'url',
      url: 'https://example.com/story',
      deviceId: caller.deviceId,
    });
    const r = await loadReport(service, { id: res.id });
    expect(r.userId).toBe(user.id);
    expect(r.deviceId).toBeNull();
    expect(isOwner(r, user.id, null)).toBe(true);
    expect(isOwner(r, null, caller.deviceId)).toBe(false);
  });

  it('a full check from the last 7 days is reused without using the limit', async () => {
    const text = `Cached claim about the monsoon ${randomUUID()}`;
    const first = guest();
    const a = await submitFactCheck(service, first, {
      type: 'text',
      text,
      deviceId: first.deviceId,
    });
    // Pretend the worker finished a full check with a verdict.
    await service.rpc('svc_complete_fact_check', {
      p_id: a.id,
      p_result: {
        verdict: 'misleading',
        confidence: 'medium',
        summary: 'Old video, new caption.',
        language: 'en',
        mode: 'full',
        full_check_status: 'not_needed',
        claims: [
          {
            position: 1,
            claim_text: text,
            verdict: 'misleading',
            explanation: 'x',
            is_government_related: false,
            sources: [
              {
                url: 'https://pib.gov.in/x',
                domain: 'pib.gov.in',
                tier: 'tier1',
                stance: 'refutes',
              },
            ],
          },
        ],
        tool_runs: [{ tool: 'gdelt', status: 'ok' }],
      },
    });

    const second = guest();
    for (let i = 0; i < 5; i++) {
      const b = await submitFactCheck(service, second, {
        type: 'text',
        text: `  ${text.toUpperCase()} `,
        deviceId: second.deviceId,
      });
      expect(b.status).toBe('done');
      expect(b.reportId).not.toBe(a.reportId);
      const r = await loadReport(service, { id: b.id });
      expect(r.verdict).toBe('misleading');
      expect(r.claims[0]!.sources[0]!.domain).toBe('pib.gov.in');
    }
  });

  it('validates screenshots by their real bytes', () => {
    expect(() => decodeImage(Buffer.from('GIF89a........').toString('base64'))).toThrow();
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(100),
    ]);
    expect(decodeImage(png.toString('base64')).mime).toBe('image/png');
  });

  it('rejects bad input', async () => {
    const caller = guest();
    await expect(
      submitFactCheck(service, caller, { type: 'text', text: 'short', deviceId: caller.deviceId }),
    ).rejects.toMatchObject({
      code: 'validation_failed',
    });
    await expect(
      submitFactCheck(service, caller, {
        type: 'url',
        url: 'not a url',
        deviceId: caller.deviceId,
      }),
    ).rejects.toMatchObject({
      code: 'validation_failed',
    });
  });
});
