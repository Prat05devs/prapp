import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError, handleApi, parseBody, readJson } from '@/server/api';
import { rateLimit } from '@/server/rate-limit';
import { requireStaff } from '@/server/staff';

export const runtime = 'nodejs';

const BUCKET = 'public-assets';
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const folder = z.enum(['portals', 'showcase']);
const name = z.string().regex(/^[a-z0-9._-]{1,120}$/i);
const pathSchema = z.string().regex(/^(portals|showcase)\/[a-z0-9._-]{1,130}$/i);

/**
 * Admin uploads to the public-assets bucket (portal logos, showcase images), uploaded as the
 * admin so storage policies still apply. Returns the stored path for the record.
 */
export const POST = handleApi(async (req: Request) => {
  const { supabase, user } = await requireStaff(req, 'admin');
  rateLimit(`admin-upload:${user.id}`, 30, 60_000);
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof Blob)) throw new AppError('validation_failed', { file: 'required' });
  const ext = TYPES[file.type];
  if (!ext) throw new AppError('validation_failed', { file: 'Use a JPG, PNG or WebP image' });
  if (file.size > MAX_BYTES) throw new AppError('validation_failed', { file: 'Max 2 MB' });
  const dir = folder.safeParse(form?.get('folder'));
  const base = name.safeParse(form?.get('name'));
  if (!dir.success || !base.success) throw new AppError('validation_failed');

  const path = `${dir.data}/${base.data}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '86400' });
  if (error) throw new AppError('internal_error', error.message);
  return NextResponse.json({ path });
});

export const DELETE = handleApi(async (req: Request) => {
  const { supabase } = await requireStaff(req, 'admin');
  const { path } = parseBody(z.object({ path: pathSchema }), await readJson(req));
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new AppError('internal_error', error.message);
  return NextResponse.json({ ok: true });
});
