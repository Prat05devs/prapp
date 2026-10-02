'use client';

import { useState } from 'react';
import type { Tables } from '@prapp/db-types';
import { Button, ErrorText, Field, Input } from '@/components/ui';
import { useStaffAction } from '@/hooks/use-staff-action';
import { prepareImage } from '@/lib/images';
import { adminApi } from '@/lib/admin/api';

type Story = Tables<'showcase_stories'>;

export function ShowcaseEditor({
  stories,
  supabaseUrl,
}: {
  stories: Story[];
  supabaseUrl: string;
}) {
  const action = useStaffAction();
  const [title, setTitle] = useState('');
  const [portalName, setPortalName] = useState('');
  const [url, setUrl] = useState('https://');
  const [file, setFile] = useState<File | null>(null);

  async function add() {
    await action.run('add', async () => {
      const ins = await adminApi.records('showcase_stories', 'insert', {
        values: {
          title: title.trim(),
          portal_name: portalName.trim(),
          url: url.trim(),
          sort_order: (stories.at(-1)?.sort_order ?? 0) + 1,
        },
      });
      const id = String(ins.rows[0]?.id ?? '');
      if (file && id) {
        const img = await prepareImage(file);
        const { path } = await adminApi.upload(img.file, 'showcase', id);
        await adminApi.records('showcase_stories', 'update', {
          match: { id },
          values: { image_path: path },
        });
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
      await adminApi.records('showcase_stories', 'update', {
        match: { id: a.id },
        values: { sort_order: b.sort_order },
      });
      return adminApi.records('showcase_stories', 'update', {
        match: { id: b.id },
        values: { sort_order: a.sort_order === b.sort_order ? a.sort_order + dir : a.sort_order },
      });
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
                    adminApi.records('showcase_stories', 'update', {
                      match: { id: s.id },
                      values: { is_visible: e.target.checked },
                    }),
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
                  if (s.image_path) await adminApi.removeUpload(s.image_path).catch(() => {});
                  return adminApi.records('showcase_stories', 'delete', { match: { id: s.id } });
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
