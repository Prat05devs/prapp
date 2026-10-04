import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@prapp/api-client';
import type { FactCheckReport, FactCheckSubmitInput } from '@prapp/shared';
import { api } from '@/lib/api';
import { deviceId } from '@/lib/device-id';
import { pickImage } from '@/lib/images';
import { registerForPush } from '@/lib/push';
import { useAuth } from '@/providers/auth-provider';

export type Phase = 'idle' | 'submitting' | 'checking' | 'done' | 'failed' | 'slow';

type Body =
  | { type: 'text'; text: string }
  | { type: 'url'; url: string }
  | { type: 'image'; imageBase64: string };

/** Submit → poll every 2 s for up to 60 s → report (LLD §11.1). */
export function useFactCheck() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [report, setReport] = useState<FactCheckReport | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const run = useRef(0);
  const { session } = useAuth();
  const signedIn = useRef(false);
  useEffect(() => {
    signedIn.current = Boolean(session);
  }, [session]);

  async function poll(id: string, token: number) {
    const started = Date.now();
    const device = await deviceId();
    for (;;) {
      if (run.current !== token) return;
      try {
        const r = await api.factChecks.get(id, device);
        if (r.status === 'done' || r.status === 'failed') {
          setReport(r);
          setPhase(r.status);
          if (r.status === 'failed') {
            setError({
              code: r.error ?? 'failed',
              message:
                r.error === 'no_text_in_image'
                  ? "We couldn't find any text in this image."
                  : 'We could not check this. Please try again.',
            });
          } else {
            // First successful action (LLD §12). Device tokens belong to an account, so guests
            // aren't asked for notification permission until they log in.
            if (signedIn.current) void registerForPush().catch(() => {});
          }
          return;
        }
      } catch {
        // transient: keep polling
      }
      if (Date.now() - started > 60_000) return setPhase('slow');
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  async function submit(body: Body) {
    const token = ++run.current;
    setPhase('submitting');
    setReport(null);
    setError(null);
    try {
      const input: FactCheckSubmitInput = { ...body, deviceId: await deviceId() };
      const res = await api.factChecks.submit(input);
      setPhase('checking');
      await poll(res.id, token);
    } catch (e) {
      setPhase('failed');
      setError(
        e instanceof ApiError
          ? { code: e.code, message: e.message }
          : { code: 'internal_error', message: 'Something went wrong.' },
      );
    }
  }

  async function checkScreenshot() {
    try {
      const img = await pickImage({ base64: true });
      if (img?.base64) await submit({ type: 'image', imageBase64: img.base64 });
    } catch (e) {
      setError({
        code: 'image',
        message: e instanceof Error ? e.message : 'Could not read the image.',
      });
    }
  }

  async function setPublic(isPublic: boolean) {
    if (!report) return;
    await api.factChecks.setPublic(report.id, isPublic, await deviceId());
    setReport({ ...report, isPublic });
  }

  function reset() {
    run.current++;
    setPhase('idle');
    setReport(null);
    setError(null);
  }

  return {
    phase,
    report,
    error,
    checkText: (text: string) => submit({ type: 'text', text }),
    checkUrl: (url: string) => submit({ type: 'url', url: url.trim() }),
    checkScreenshot,
    setPublic,
    reset,
  };
}
