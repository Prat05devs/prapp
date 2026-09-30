import { escapeHtml, sendEmail } from '../_shared/email.ts';
import { siteUrl } from '../_shared/env.ts';
import { sendExpoPush } from '../_shared/push.ts';
import { isServiceCaller, json, serviceClient, type ServiceClient } from '../_shared/supabase.ts';
import { BRAND_NAME } from '../../../packages/shared/src/constants.ts';

// Delivers push + email for rows in public.notifications (LLD §12).
//   { type: 'INSERT', record: { id } }  ← database webhook (trigger on insert)
//   { mode: 'retry' }                   ← pg_cron every 5 min: unsent rows older than 5 min
// In-app delivery is the row itself; clients read it under RLS.

const MAX_ATTEMPTS = 3;

type Row = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channels: string[];
  push_sent_at: string | null;
  email_sent_at: string | null;
  delivery_attempts: number;
};

const COLUMNS =
  'id, user_id, type, title, body, data, channels, push_sent_at, email_sent_at, delivery_attempts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!isServiceCaller(req)) return json({ error: 'forbidden' }, 403);
  const input = (await req.json().catch(() => ({}))) as { mode?: string; record?: { id?: string } };
  const db = serviceClient();

  let rows: Row[] = [];
  if (input.record?.id) {
    const { data } = await db.from('notifications').select(COLUMNS).eq('id', input.record.id);
    rows = (data ?? []) as Row[];
  } else if (input.mode === 'retry') {
    const { data } = await db
      .from('notifications')
      .select(COLUMNS)
      .lt('created_at', new Date(Date.now() - 5 * 60_000).toISOString())
      .gt('created_at', new Date(Date.now() - 3 * 86_400_000).toISOString())
      .lt('delivery_attempts', MAX_ATTEMPTS)
      .overlaps('channels', ['push', 'email'])
      .or('push_sent_at.is.null,email_sent_at.is.null')
      .order('created_at')
      .limit(100);
    rows = (data ?? []) as Row[];
  }

  const results = [];
  for (const row of rows) results.push(await deliver(db, row));
  return json({ processed: results.length, results });
});

async function deliver(db: ServiceClient, row: Row) {
  const needsPush = row.channels.includes('push') && !row.push_sent_at;
  const needsEmail = row.channels.includes('email') && !row.email_sent_at;
  if (!needsPush && !needsEmail) return { id: row.id, skipped: true };

  const errors: string[] = [];
  const patch: { push_sent_at?: string; email_sent_at?: string } = {};
  const link = typeof row.data?.deep_link === 'string' ? row.data.deep_link : null;

  if (needsPush) {
    try {
      const { data: tokens } = await db
        .from('device_tokens')
        .select('id, expo_push_token')
        .eq('user_id', row.user_id);
      if (tokens?.length) {
        const tickets = await sendExpoPush(
          tokens.map((t) => ({
            to: t.expo_push_token,
            title: row.title,
            body: row.body,
            sound: 'default',
            data: { ...(row.data ?? {}), notification_id: row.id, type: row.type },
          })),
        );
        const dead = tokens.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered');
        if (dead.length)
          await db
            .from('device_tokens')
            .delete()
            .in(
              'id',
              dead.map((t) => t.id),
            );
        const ok = tickets.some((t) => t.status === 'ok');
        const allDead = dead.length === tokens.length;
        if (ok || allDead) patch.push_sent_at = new Date().toISOString();
        else errors.push(`push: ${tickets.map((t) => t.message ?? t.details?.error).join('; ')}`);
      } else {
        patch.push_sent_at = new Date().toISOString(); // no device: nothing to deliver
      }
    } catch (e) {
      errors.push(`push: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (needsEmail) {
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('email, full_name')
        .eq('id', row.user_id)
        .single();
      if (!profile?.email) throw new Error('no email');
      const url = link ? `${siteUrl()}${link}` : siteUrl();
      await sendEmail({
        to: profile.email,
        subject: row.title,
        text: `${row.body}\n\n${url}\n\n— ${BRAND_NAME}`,
        html: `<p>Hi ${escapeHtml(profile.full_name || 'there')},</p>
<p>${escapeHtml(row.body)}</p>
<p><a href="${escapeHtml(url)}">Open in ${escapeHtml(BRAND_NAME)}</a></p>
<p style="color:#666;font-size:12px">You are receiving this because of activity on your ${escapeHtml(BRAND_NAME)} account.</p>`,
      });
      patch.email_sent_at = new Date().toISOString();
    } catch (e) {
      errors.push(`email: ${e instanceof Error ? e.message : e}`);
    }
  }

  await db
    .from('notifications')
    .update({
      ...patch,
      delivery_error: errors.length ? errors.join(' | ').slice(0, 1000) : null,
      delivery_attempts: row.delivery_attempts + (errors.length ? 1 : 0),
    })
    .eq('id', row.id);
  return { id: row.id, ...patch, errors };
}
