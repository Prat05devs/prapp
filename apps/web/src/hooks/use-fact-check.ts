'use client';

import { useCallback, useRef, useState } from 'react';
import { ApiError } from '@prapp/api-client';
import type { FactCheckReport, FactCheckSubmitInput } from '@prapp/shared';
import { api } from '@/lib/api';
import { deviceId } from '@/lib/device-id';
import { prepareImage } from '@/lib/images';

export type CheckInput =
  { type: 'text'; text: string } | { type: 'url'; url: string } | { type: 'image'; file: File };
export type Phase = 'idle' | 'submitting' | 'checking' | 'done' | 'failed' | 'slow';

const POLL_MS = 2000;
const POLL_FOR_MS = 60_000;

async function toBase64(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000)
    s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Submit → poll every 2 s for up to 60 s → report (LLD §11.1). */
export function useFactCheck() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [report, setReport] = useState<FactCheckReport | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const run = useRef(0);

  const poll = useCallback(async (id: string, token: number) => {
    const started = Date.now();
    for (;;) {
      if (run.current !== token) return;
      try {
        const r = await api.factChecks.get(id, deviceId());
        if (r.status === 'done' || r.status === 'failed') {
          setReport(r);
          setPhase(r.status === 'done' ? 'done' : 'failed');
          if (r.status === 'failed') {
            setError({
              code: r.error ?? 'failed',
              message:
                r.error === 'no_text_in_image'
                  ? "We couldn't find any text in this image."
                  : 'We could not check this. Please try again.',
            });
          }
          return;
        }
      } catch {
        // transient: keep polling
      }
      if (Date.now() - started > POLL_FOR_MS) {
        setPhase('slow');
        return;
      }
      await new Promise((res) => setTimeout(res, POLL_MS));
    }
  }, []);

  async function check(input: CheckInput) {
    const token = ++run.current;
    setPhase('submitting');
    setReport(null);
    setError(null);
    try {
      let body: FactCheckSubmitInput;
      if (input.type === 'image') {
        const img = await prepareImage(input.file); // resize + strip EXIF before upload
        body = { type: 'image', imageBase64: await toBase64(img.file), deviceId: deviceId() };
      } else if (input.type === 'url') {
        body = { type: 'url', url: input.url.trim(), deviceId: deviceId() };
      } else {
        body = { type: 'text', text: input.text, deviceId: deviceId() };
      }
      const res = await api.factChecks.submit(body);
      setPhase('checking');
      await poll(res.id, token);
    } catch (e) {
      setPhase('failed');
      setError(
        e instanceof ApiError
          ? { code: e.code, message: e.message }
          : {
              code: 'internal_error',
              message: e instanceof Error ? e.message : 'Something went wrong.',
            },
      );
    }
  }

  async function setPublic(isPublic: boolean) {
    if (!report) return;
    await api.factChecks.setPublic(report.id, isPublic, deviceId());
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
    check,
    setPublic,
    reset,
    resume: (id: string) => poll(id, run.current),
  };
}
