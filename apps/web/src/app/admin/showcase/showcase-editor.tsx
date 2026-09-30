'use client';

import { useState } from 'react';
import type { Tables } from '@prapp/db-types';
import { Button, ErrorText, Field, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { prepareImage } from '@/lib/images';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Story = Tables<'showcase_stories'>;

export function ShowcaseEditor({
  stories,
  supabaseUrl,
}: {
  stories: Story[];
  supabaseUrl: string;
}) {
  const action = useStaffAction();
  const db = createBrowserSupabase();
  const [title, setTitle] = useState('');
  const [portalName, setPortalName] = useState('');
  const [url, setUrl] = useState('https://');
  const [file, setFile] = useState<File | null>(null);

  async function add() {
    await action.run('add', async () => {
      const { data: me } = await db.auth.getUser();
      const ins = await db
        .from('showcase_stories')
        .insert({
          title: title.trim(),
          portal_name: portalName.trim(),
          url: url.trim(),
          sort_order: (stories.at(-1)?.sort_order ?? 0) + 1,
          created_by: me.user?.id ?? null,
        })
        .select('id')
        .single();
      if (ins.error) return ins;
      if (file) {
        const img = await prepareImage(file);
        const path = `showcase/${ins.data.id}.jpg`;
        const up = await db.storage
          .from('public-assets')
          .upload(path, img.file, { upsert: true, contentType: img.mimeType });
        if (up.error) return { error: { message: up.error.message } };
        const u = await db
          .from('showcase_stories')
          .update({ image_path: path })
          .eq('id', ins.data.id);
        if (u.error) return u;
      }
      setTitle('');
      setPortalName('');
      setUrl('https://');
      setFile(null);
      return { error: null };
    });
  }

  function move(i: number, dir: -1 | 1) {
    const a = stories[i];
    const b = stories[i + dir];
    if (!a || !b) return;
    void action.run('move', async () => {
      const r1 = await db
        .from('showcase_stories')
        .update({ sort_order: b.sort_order })
        .eq('id', a.id);
      if (r1.error) return r1;
      return db
        .from('showcase_stories')
        .update({ sort_order: a.sort_order === b.sort_order ? a.sort_order + dir : a.sort_order })
        .eq('id', b.id);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorText>{action.error}</ErrorText>
      <div className="grid gap-3 rounded-2xl border border-hairline p-5 md:grid-cols-2">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Portal name">
          <Input value={portalName} onChange={(e) => setPortalName(e.target.value)} />
        </Field>
        <Field label="Story URL">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <Field label="Image (optional)">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Button
          className="self-start"
          disabled={!title.trim() || !portalName.trim() || action.pending !== null}
          onClick={() => void add()}
        >
          Add story
        </Button>
      </div>
      <ul className="flex flex-col divide-y divide-divider">
        {stories.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
            {s.image_path ? (
              // eslint-disable-next-line @next/next/no-img-element -- public bucket asset
              <img
                src={`${supabaseUrl}/storage/v1/object/public/public-assets/${s.image_path}`}
                alt=""
                className="h-10 w-16 rounded object-cover"
              />
            ) : null}
            <span className="flex-1">
              <a
                className="font-medium text-emerald-strong hover:underline"
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                {s.title}
              </a>{' '}
              <span className="text-slate">· {s.portal_name}</span>
            </span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={s.is_visible}
                onChange={(e) =>
                  void action.run('vis', () =>
                    db
                      .from('showcase_stories')
                      .update({ is_visible: e.target.checked })
                      .eq('id', s.id),
                  )
                }
              />
              visible
            </label>
            <button
              type="button"
              className="font-medium text-emerald-strong hover:underline"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              up
            </button>
            <button
              type="button"
              className="font-medium text-emerald-strong hover:underline"
              disabled={i === stories.length - 1}
              onClick={() => move(i, 1)}
            >
              down
            </button>
            <button
              type="button"
              className="font-medium text-danger hover:underline"
              onClick={() => {
                if (!confirm('Remove this story?')) return;
                void action.run('del', async () => {
                  if (s.image_path) await db.storage.from('public-assets').remove([s.image_path]);
                  return db.from('showcase_stories').delete().eq('id', s.id);
                });
              }}
            >
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
