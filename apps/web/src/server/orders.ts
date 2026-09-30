import 'server-only';
import type { Currency, OrderDetailResponse } from '@prapp/shared';
import { AppError, throwDbError } from '@/server/api';
import type { UserSupabase } from '@/server/auth';

const REPORT_URL_TTL_SECONDS = 5 * 60; // LLD §8.1 / §15

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Customer view of one order (GET /api/orders/:id and /orders/[id]). Runs as the user:
 * RLS hides other people's orders and shows placements only once published.
 */
export async function loadOrderDetail(
  supabase: UserSupabase,
  orderId: string,
): Promise<OrderDetailResponse> {
  const { data: o, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, headline, body, instagram_handle, package_id, package_snapshot, amount_minor, currency, paid_at, deadline_at, published_at, changes_requested_reason, rejection_reason, report_status, report_path, created_at',
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error) throwDbError(error);
  if (!o) throw new AppError('order_not_found');

  const [placements, refunds, pkg] = await Promise.all([
    supabase
      .from('order_placements')
      .select('id, channel, live_url, posted_at, portals(name)')
      .eq('order_id', orderId)
      .eq('status', 'live')
      .order('created_at'),
    supabase
      .from('refunds')
      .select('id, amount_minor, status, created_at')
      .eq('order_id', orderId)
      .order('created_at'),
    supabase.from('packages').select('name').eq('id', o.package_id).maybeSingle(),
  ]);
  if (placements.error) throwDbError(placements.error);
  if (refunds.error) throwDbError(refunds.error);

  let reportUrl: string | null = null;
  if (o.report_status === 'ready' && o.report_path) {
    const signed = await supabase.storage
      .from('reports')
      .createSignedUrl(o.report_path, REPORT_URL_TTL_SECONDS);
    reportUrl = signed.data?.signedUrl ?? null;
  }

  const snapshot = (o.package_snapshot ?? null) as { name?: string } | null;
  return {
    order: {
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      headline: o.headline,
      body: o.body,
      instagramHandle: o.instagram_handle,
      packageId: o.package_id,
      packageName: snapshot?.name ?? pkg.data?.name ?? null,
      amountMinor: o.amount_minor,
      currency: (o.currency as Currency | null) ?? null,
      paidAt: o.paid_at,
      deadlineAt: o.deadline_at,
      publishedAt: o.published_at,
      changesRequestedReason: o.changes_requested_reason,
      rejectionReason: o.rejection_reason,
      reportStatus: o.report_status,
      createdAt: o.created_at,
    },
    placements: (placements.data ?? []).map((p) => ({
      id: p.id,
      channel: p.channel,
      platform:
        p.channel === 'instagram'
          ? 'Instagram'
          : (p.portals?.name ?? (p.live_url ? hostOf(p.live_url) : 'News portal')),
      liveUrl: p.live_url ?? '',
      postedAt: p.posted_at,
    })),
    reportUrl,
    refunds: (refunds.data ?? []).map((r) => ({
      id: r.id,
      amountMinor: r.amount_minor,
      status: r.status,
      createdAt: r.created_at,
    })),
  };
}
