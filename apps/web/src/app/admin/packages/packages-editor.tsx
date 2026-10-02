'use client';

import { useState } from 'react';
import type { Tables } from '@prapp/db-types';
import { formatMoney, majorToMinor } from '@prapp/shared';
import { Button, ErrorText, Field, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { adminApi } from '@/lib/admin/api';

type Pkg = Tables<'packages'>;
type Draft = {
  id?: string;
  code: string;
  name: string;
  description: string;
  priceInr: string;
  priceUsd: string;
  portal_count: string;
  includes_instagram: boolean;
  turnaround_hours: string;
  is_active: boolean;
  sort_order: string;
  portalIds: string[];
};

export function PackagesEditor({
  packages,
  portals,
  links,
}: {
  packages: Pkg[];
  portals: { id: string; name: string; is_active: boolean }[];
  links: { package_id: string; portal_id: string }[];
}) {
  const action = useStaffAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const set = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  function edit(p?: Pkg) {
    setDraft(
      p
        ? {
            id: p.id,
            code: p.code,
            name: p.name,
            description: p.description ?? '',
            priceInr: String(p.price_inr_paise / 100),
            priceUsd: p.price_usd_cents ? String(p.price_usd_cents / 100) : '',
            portal_count: String(p.portal_count),
            includes_instagram: p.includes_instagram,
            turnaround_hours: String(p.turnaround_hours),
            is_active: p.is_active,
            sort_order: String(p.sort_order),
            portalIds: links.filter((l) => l.package_id === p.id).map((l) => l.portal_id),
          }
        : {
            code: '',
            name: '',
            description: '',
            priceInr: '499',
            priceUsd: '',
            portal_count: '2',
            includes_instagram: true,
            turnaround_hours: '24',
            is_active: true,
            sort_order: '0',
            portalIds: [],
          },
    );
  }

  function save(d: Draft) {
    return action.run('save', async () => {
      let row;
      try {
        row = {
          code: d.code.trim().toLowerCase(),
          name: d.name.trim(),
          description: d.description.trim() || null,
          price_inr_paise: majorToMinor(d.priceInr), // admin types ₹, the DB stores paise
          price_usd_cents: d.priceUsd ? majorToMinor(d.priceUsd) : null,
          portal_count: Number(d.portal_count),
          includes_instagram: d.includes_instagram,
          turnaround_hours: Number(d.turnaround_hours),
          is_active: d.is_active,
          sort_order: Number(d.sort_order) || 0,
        };
      } catch {
        return { error: { code: '23514', message: 'invalid price' } };
      }
      const saved = d.id
        ? await adminApi.records('packages', 'update', { match: { id: d.id }, values: row })
        : await adminApi.records('packages', 'insert', { values: row });
      const id = String(saved.rows[0]?.id ?? d.id);
      const current = links.filter((l) => l.package_id === id).map((l) => l.portal_id);
      const toRemove = current.filter((pid) => !d.portalIds.includes(pid));
      const toAdd = d.portalIds.filter((pid) => !current.includes(pid));
      for (const portal_id of toRemove) {
        await adminApi.records('package_portals', 'delete', {
          match: { package_id: id, portal_id },
        });
      }
      if (toAdd.length) {
        await adminApi.records('package_portals', 'insert', {
          values: toAdd.map((portal_id) => ({ package_id: id, portal_id })),
        });
      }
      setDraft(null);
      return { error: null };
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorText>{action.error}</ErrorText>
      <Button className="self-start" onClick={() => edit()}>
        Add package
      </Button>
      {draft ? (
        <div className="grid gap-3 rounded-2xl border border-hairline p-5 md:grid-cols-2">
          <Field label="Code (a-z, 0-9, -, _)">
            <Input value={draft.code} onChange={(e) => set({ code: e.target.value })} />
          </Field>
          <Field label="Name">
            <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Description">
            <Input
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
          <Field label="Price (₹, incl. taxes)">
            <Input
              value={draft.priceInr}
              inputMode="decimal"
              onChange={(e) => set({ priceInr: e.target.value })}
            />
          </Field>
          <Field label="Price (USD, optional)">
            <Input
              value={draft.priceUsd}
              inputMode="decimal"
              onChange={(e) => set({ priceUsd: e.target.value })}
            />
          </Field>
          <Field label="Number of portals">
            <Input
              value={draft.portal_count}
              inputMode="numeric"
              onChange={(e) => set({ portal_count: e.target.value })}
            />
          </Field>
          <Field label="Turnaround (hours)">
            <Input
              value={draft.turnaround_hours}
              inputMode="numeric"
              onChange={(e) => set({ turnaround_hours: e.target.value })}
            />
          </Field>
          <Field label="Sort order">
            <Input
              value={draft.sort_order}
              inputMode="numeric"
              onChange={(e) => set({ sort_order: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.includes_instagram}
              onChange={(e) => set({ includes_instagram: e.target.checked })}
            />
            Includes our Instagram page
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => set({ is_active: e.target.checked })}
            />
            Active
          </label>
          <fieldset className="flex flex-col gap-1 text-sm md:col-span-2">
            <legend className="font-medium">Default portals</legend>
            {portals.map((p) => (
              <label key={p.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.portalIds.includes(p.id)}
                  onChange={(e) =>
                    set({
                      portalIds: e.target.checked
                        ? [...draft.portalIds, p.id]
                        : draft.portalIds.filter((x) => x !== p.id),
                    })
                  }
                />
                {p.name}
                {p.is_active ? '' : ' (inactive)'}
              </label>
            ))}
          </fieldset>
          <div className="flex gap-2 md:col-span-2">
            <Button disabled={action.pending !== null} onClick={() => void save(draft)}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead className="font-mono text-[11px] tracking-wider text-slate uppercase">
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Price</th>
            <th>Portals</th>
            <th>Instagram</th>
            <th>Turnaround</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {packages.map((p) => (
            <tr key={p.id} className="border-t border-divider">
              <td className="py-1">{p.code}</td>
              <td>{p.name}</td>
              <td>{formatMoney(p.price_inr_paise)}</td>
              <td>{p.portal_count}</td>
              <td>{p.includes_instagram ? 'yes' : 'no'}</td>
              <td>{p.turnaround_hours} h</td>
              <td>{p.is_active ? 'yes' : 'no'}</td>
              <td>
                <button
                  type="button"
                  className="text-xs font-medium text-emerald-strong hover:underline"
                  onClick={() => edit(p)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
