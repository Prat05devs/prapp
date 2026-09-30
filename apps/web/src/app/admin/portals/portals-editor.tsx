'use client';

import { useState } from 'react';
import type { Tables } from '@prapp/db-types';
import { Button, ErrorText, Field, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { prepareImage } from '@/lib/images';

type Portal = Tables<'portals'>;
type Draft = {
  id?: string;
  name: string;
  domain: string;
  homepage_url: string;
  da_score: string;
  category: string;
  is_active: boolean;
  show_publicly: boolean;
  sort_order: string;
};

const empty: Draft = {
  name: '',
  domain: '',
  homepage_url: 'https://',
  da_score: '',
  category: 'news',
  is_active: true,
  show_publicly: true,
  sort_order: '0',
};

export function PortalsEditor({
  portals,
  supabaseUrl,
}: {
  portals: Portal[];
  supabaseUrl: string;
}) {
  const action = useStaffAction();
  const db = createBrowserSupabase();
  const [draft, setDraft] = useState<Draft | null>(null);
  const set = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  function save(d: Draft) {
    const row = {
      name: d.name.trim(),
      domain: d.domain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, ''),
      homepage_url: d.homepage_url.trim(),
      da_score: d.da_score ? Number(d.da_score) : null,
      category: d.category.trim() || null,
      is_active: d.is_active,
      show_publicly: d.show_publicly,
      sort_order: Number(d.sort_order) || 0,
    };
    return action.run('save', async () => {
      const r = d.id
        ? await db.from('portals').update(row).eq('id', d.id)
        : await db.from('portals').insert(row);
      if (!r.error) setDraft(null);
      return r;
    });
  }

  async function uploadLogo(portal: Portal, file: File) {
    await action.run('logo', async () => {
      const img = await prepareImage(file);
      const path = `portals/${portal.id}.jpg`;
      const up = await db.storage
        .from('public-assets')
        .upload(path, img.file, { upsert: true, contentType: img.mimeType });
      if (up.error) return { error: { message: up.error.message } };
      return db.from('portals').update({ logo_path: path }).eq('id', portal.id);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorText>{action.error}</ErrorText>
      <Button className="self-start" onClick={() => setDraft({ ...empty })}>
        Add portal
      </Button>
      {draft ? (
        <div className="grid gap-3 rounded-2xl border border-hairline p-5 md:grid-cols-2">
          <Field label="Name">
            <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Domain (e.g. doontimes.in)">
            <Input value={draft.domain} onChange={(e) => set({ domain: e.target.value })} />
          </Field>
          <Field label="Homepage URL">
            <Input
              value={draft.homepage_url}
              onChange={(e) => set({ homepage_url: e.target.value })}
            />
          </Field>
          <Field label="DA score (0–100)">
            <Input
              value={draft.da_score}
              inputMode="numeric"
              onChange={(e) => set({ da_score: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <Input value={draft.category} onChange={(e) => set({ category: e.target.value })} />
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
              checked={draft.is_active}
              onChange={(e) => set({ is_active: e.target.checked })}
            />
            Active (use for new orders)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.show_publicly}
              onChange={(e) => set({ show_publicly: e.target.checked })}
            />
            Show on website/app
          </label>
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
            <th>Logo</th>
            <th>Name</th>
            <th>Domain</th>
            <th>DA</th>
            <th>Active</th>
            <th>Public</th>
            <th>Sort</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {portals.map((p) => (
            <tr key={p.id} className="border-t border-divider">
              <td className="py-1">
                {p.logo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element -- public bucket asset
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/public-assets/${p.logo_path}`}
                    alt=""
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : null}
                <label className="cursor-pointer text-xs underline">
                  upload
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadLogo(p, f);
                    }}
                  />
                </label>
              </td>
              <td>{p.name}</td>
              <td>{p.domain}</td>
              <td>{p.da_score ?? '-'}</td>
              <td>{p.is_active ? 'yes' : 'no'}</td>
              <td>{p.show_publicly ? 'yes' : 'no'}</td>
              <td>{p.sort_order}</td>
              <td>
                <button
                  type="button"
                  className="text-xs font-medium text-emerald-strong hover:underline"
                  onClick={() =>
                    setDraft({
                      id: p.id,
                      name: p.name,
                      domain: p.domain,
                      homepage_url: p.homepage_url,
                      da_score: p.da_score?.toString() ?? '',
                      category: p.category ?? '',
                      is_active: p.is_active,
                      show_publicly: p.show_publicly,
                      sort_order: String(p.sort_order),
                    })
                  }
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
