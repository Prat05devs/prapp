'use client';

import { useState } from 'react';
import type { Tables } from '@prapp/db-types';
import { Button, ErrorText, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { adminApi } from '@/lib/admin/api';

type Source = Tables<'trusted_sources'>;
const TIERS = ['tier1', 'tier2'] as const;
const CATEGORIES = ['government', 'fact_checker', 'news', 'reference', 'other'] as const;

export function SourcesEditor({ sources }: { sources: Source[] }) {
  const action = useStaffAction();
  const [domain, setDomain] = useState('');
  const [tier, setTier] = useState<Source['tier']>('tier1');
  const [category, setCategory] = useState<string>('news');
  const [note, setNote] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <ErrorText>{action.error}</ErrorText>
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-hairline p-5">
        <Input
          value={domain}
          placeholder="domain.tld"
          onChange={(e) => setDomain(e.target.value)}
        />
        <select
          className="rounded-lg border border-hairline bg-canvas outline-none focus:border-ink px-2 py-2"
          value={tier}
          onChange={(e) => setTier(e.target.value as Source['tier'])}
        >
          {TIERS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-hairline bg-canvas outline-none focus:border-ink px-2 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <Input
          value={note}
          placeholder="note (optional)"
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          disabled={!domain.trim() || action.pending !== null}
          onClick={() =>
            void action.run('add', async () => {
              const r = await adminApi.records('trusted_sources', 'upsert', {
                values: {
                  domain: domain
                    .trim()
                    .toLowerCase()
                    .replace(/^https?:\/\//, '')
                    .replace(/^www\./, '')
                    .replace(/\/.*$/, ''),
                  tier,
                  category,
                  note: note.trim() || null,
                },
              });
              setDomain('');
              setNote('');
              return r;
            })
          }
        >
          Save
        </Button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="font-mono text-[11px] tracking-wider text-slate uppercase">
          <tr>
            <th>Domain</th>
            <th>Tier</th>
            <th>Category</th>
            <th>Note</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.domain} className="border-t border-divider">
              <td className="py-1">{s.domain}</td>
              <td>{s.tier}</td>
              <td>{s.category}</td>
              <td>{s.note ?? ''}</td>
              <td>
                <button
                  type="button"
                  className="text-xs font-medium text-danger hover:underline"
                  onClick={() =>
                    void action.run('del', () =>
                      adminApi.records('trusted_sources', 'delete', {
                        match: { domain: s.domain },
                      }),
                    )
                  }
                >
                  remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
