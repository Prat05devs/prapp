import 'server-only';
import { renderPrReport, type PrReportData } from '@prapp/report-templates';
import type { ServiceSupabase } from '@/server/service-types';

function settingString(v: unknown): string | undefined {
  // Same rule as the site and app: blank or seed placeholders (+91XXXXXXXXXX) are not shown.
  return typeof v === 'string' && v.trim() && !v.includes('XXXX') ? v : undefined;
}

/**
 * Builds the PR delivery PDF, uploads it as report-v{n}.pdf and marks it ready (LLD §9.11).
 * On failure the order stays published with report_status='failed' (§9.10 row 27):
 * the customer is only notified when a report is actually ready (DB trigger).
 */
export async function generatePrReport(
  service: ServiceSupabase,
  orderId: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  try {
    const { data: order, error } = await service
      .from('orders')
      .select(
        'id, user_id, order_number, status, headline, customer_name, published_at, package_snapshot, report_version',
      )
      .eq('id', orderId)
      .single();
    if (error) throw error;
    if (order.status !== 'published') throw new Error('order_not_published');

    const [{ data: placements, error: plError }, { data: settings }] = await Promise.all([
      service
        .from('order_placements')
        .select('channel, live_url, posted_at, portals(name)')
        .eq('order_id', orderId)
        .eq('status', 'live')
        .order('created_at'),
      service.from('app_settings').select('key, value').like('key', 'support.%'),
    ]);
    if (plError) throw plError;
    const support = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

    const data: PrReportData = {
      orderNumber: order.order_number,
      publishedAt: order.published_at ?? new Date().toISOString(),
      customerName: order.customer_name ?? '',
      headline: order.headline,
      packageName: ((order.package_snapshot ?? {}) as { name?: string }).name ?? 'PR package',
      rows: (placements ?? []).map((p) => ({
        platform: p.channel === 'instagram' ? 'Instagram' : (p.portals?.name ?? 'News portal'),
        url: p.live_url ?? '',
        publishedAt: p.posted_at,
      })),
      support: {
        phone: settingString(support['support.phone']),
        email: settingString(support['support.email']),
        whatsapp: settingString(support['support.whatsapp']),
      },
      version: order.report_version + 1,
      generatedAt: new Date().toISOString(),
    };

    const pdf = await renderPrReport(data);
    const path = `${order.user_id ?? 'deleted'}/${order.id}/report-v${data.version}.pdf`;
    const up = await service.storage
      .from('reports')
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
    if (up.error) throw up.error;
    const set = await service.rpc('svc_set_report', {
      p_order_id: orderId,
      p_status: 'ready',
      p_path: path,
    });
    if (set.error) throw set.error;
    return { ok: true, path };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    console.error('report generation failed', { orderId, message });
    await service.rpc('svc_set_report', { p_order_id: orderId, p_status: 'failed' });
    return { ok: false, error: message };
  }
}
