'use client';

import { useState } from 'react';
import { Button, ErrorText, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import type { AdminOrder } from '@/lib/admin/queries';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Placement = AdminOrder['placements'][number];
type Portal = { id: string; name: string; domain: string };

/** One portal / Instagram slot: paste link, pick a portal, mark down, replace (LLD §10.2). */
export function PlacementRow({
  placement: p,
  portals,
  editable,
}: {
  placement: Placement;
  portals: Portal[];
  editable: boolean;
}) {
  const action = useStaffAction();
  const db = createBrowserSupabase();
  const [url, setUrl] = useState(p.live_url ?? '');
  const [portalId, setPortalId] = useState('');
  const [failNote, setFailNote] = useState('');
  const [showFail, setShowFail] = useState(false);

  const name =
    p.channel === 'instagram' ? 'Instagram' : (p.portal?.name ?? 'Empty slot: choose a portal');
  const swapped = p.status === 'swapped';
  const needsPortal = p.channel === 'portal' && (!p.portal_id || p.status === 'failed');

  return (
    <div className={`flex flex-col gap-2 py-3 text-sm ${swapped ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{name}</span>
        {p.portal ? <span className="text-slate">{p.portal.domain}</span> : null}
        <span className="rounded-full border border-hairline bg-elevated px-2 font-mono text-[11px] text-slate uppercase">
          {p.status}
        </span>
        {p.domain_mismatch && p.status === 'live' ? (
          <span className="text-xs text-warn">link domain doesn&apos;t match the portal</span>
        ) : null}
        {p.note ? <span className="text-xs text-slate">note: {p.note}</span> : null}
      </div>

      {p.live_url && !editable ? (
        <a className="break-all underline" href={p.live_url} target="_blank" rel="noreferrer">
          {p.live_url}
        </a>
      ) : null}

      {editable && !swapped ? (
        <div className="flex flex-col gap-2">
          {!(p.channel === 'portal' && !p.portal_id) && p.status !== 'failed' ? (
            <div className="flex gap-2">
              <Input value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
              <Button
                variant="outline"
                disabled={!url.trim() || action.pending !== null}
                onClick={() =>
                  void action.run(
                    'link',
                    () => db.rpc('staff_set_placement_link', { p_placement_id: p.id, p_url: url }),
                    (r) =>
                      r.data === true
                        ? `Link domain doesn't match ${p.channel === 'instagram' ? 'instagram.com' : p.portal?.domain}. Double-check.`
                        : undefined,
                  )
                }
              >
                Save
              </Button>
            </div>
          ) : null}

          {needsPortal ? (
            <div className="flex gap-2">
              <select
                className="rounded-lg border border-hairline bg-canvas outline-none focus:border-ink px-2 py-2"
                value={portalId}
                onChange={(e) => setPortalId(e.target.value)}
              >
                <option value="">
                  {p.status === 'failed' ? 'Replace with…' : 'Choose portal…'}
                </option>
                {portals.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.name} ({po.domain})
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={!portalId || action.pending !== null}
                onClick={() =>
                  void action.run('swap', () =>
                    db.rpc('staff_swap_placement', {
                      p_placement_id: p.id,
                      p_new_portal_id: portalId,
                      p_reason: p.status === 'failed' ? `replaces failed portal` : 'portal chosen',
                    }),
                  )
                }
              >
                {p.status === 'failed' ? 'Replace' : 'Use portal'}
              </Button>
            </div>
          ) : null}

          {p.channel === 'portal' && p.portal_id && p.status !== 'failed' ? (
            showFail ? (
              <div className="flex gap-2">
                <Input
                  value={failNote}
                  placeholder="What went wrong?"
                  onChange={(e) => setFailNote(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!failNote.trim() || action.pending !== null}
                  onClick={() =>
                    void action.run('fail', () =>
                      db.rpc('staff_mark_placement_failed', {
                        p_placement_id: p.id,
                        p_note: failNote,
                      }),
                    )
                  }
                >
                  Mark failed
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="self-start text-xs font-medium text-emerald-strong hover:underline"
                onClick={() => setShowFail(true)}
              >
                Portal down?
              </button>
            )
          ) : null}
        </div>
      ) : null}
      <ErrorText>{action.error}</ErrorText>
      {action.notice ? <p className="text-xs text-warn">{action.notice}</p> : null}
    </div>
  );
}
