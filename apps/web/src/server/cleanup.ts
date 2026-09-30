import 'server-only';
import type { ServiceSupabase } from '@/server/service-types';

const DAY = 86_400_000;

async function removeAll(service: ServiceSupabase, bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    await service.storage.from(bucket).remove(paths.slice(i, i + 100));
  }
}

/**
 * Daily cleanup (LLD §14, §9.10 row 22):
 *  - drafts untouched for 7 days that never reached checkout: images first, then the row
 *  - fact-check uploads older than 30 days
 */
export async function runCleanup(service: ServiceSupabase, timeUp: () => boolean) {
  const counts = { drafts: 0, draftImages: 0, factCheckUploads: 0 };

  const { data: drafts } = await service
    .from('orders')
    .select('id, order_images(storage_path)')
    .eq('status', 'draft')
    .is('current_intent_id', null)
    .lt('updated_at', new Date(Date.now() - 7 * DAY).toISOString())
    .limit(200);
  for (const d of drafts ?? []) {
    if (timeUp()) return { ...counts, timedOut: true };
    // Orders with any payment intent are business records and are never deleted.
    const { count } = await service
      .from('payment_intents')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', d.id);
    if (count) continue;
    const paths = (d.order_images ?? []).map((i) => i.storage_path);
    if (paths.length) await removeAll(service, 'order-images', paths);
    const { error } = await service.from('orders').delete().eq('id', d.id).eq('status', 'draft');
    if (!error) {
      counts.drafts += 1;
      counts.draftImages += paths.length;
    }
  }

  // Uploads live at {device_or_user}/{fact_check_id}.{ext}; 30-day retention (LLD §7.2).
  const { data: old } = await service
    .from('fact_checks')
    .select('id, image_path')
    .not('image_path', 'is', null)
    .lt('created_at', new Date(Date.now() - 30 * DAY).toISOString())
    .gte('created_at', new Date(Date.now() - 32 * DAY).toISOString())
    .limit(500);
  const paths = (old ?? []).map((f) => f.image_path!).filter(Boolean);
  if (paths.length) {
    // The row keeps image_path (a CHECK requires it for image checks); only the file goes.
    await removeAll(service, 'fact-check-uploads', paths);
    counts.factCheckUploads = paths.length;
  }
  return { ...counts, timedOut: false };
}
