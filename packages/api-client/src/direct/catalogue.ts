import { camelize } from '../case';
import { check, type Db } from './db';

/** Public catalogue (anon-readable under RLS): active packages + publicly listed portals. */
export async function fetchCatalogue(db: Db) {
  const [packages, portals] = await Promise.all([
    db
      .from('packages')
      .select(
        'id, code, name, description, price_inr_paise, price_usd_cents, portal_count, includes_instagram, turnaround_hours',
      )
      .eq('is_active', true)
      .order('sort_order')
      .order('price_inr_paise'),
    db
      .from('portals')
      .select('id, name, domain, homepage_url, logo_path, category')
      .eq('is_active', true)
      .eq('show_publicly', true)
      .order('sort_order')
      .order('name'),
  ]);
  check(packages);
  check(portals);
  return { packages: camelize(packages.data ?? []), portals: camelize(portals.data ?? []) };
}

export type Catalogue = Awaited<ReturnType<typeof fetchCatalogue>>;
export type CataloguePackage = Catalogue['packages'][number];
export type CataloguePortal = Catalogue['portals'][number];

/** Stories we've carried (admin showcase, anon-readable): home page "Recently published". */
export async function fetchShowcase(db: Db, limit = 6) {
  const res = await db
    .from('showcase_stories')
    .select('id, title, portal_name, url, image_path')
    .eq('is_visible', true)
    .order('sort_order')
    .limit(limit);
  check(res);
  return camelize(res.data ?? []);
}

export type ShowcaseStory = Awaited<ReturnType<typeof fetchShowcase>>[number];

/** Public support contacts and limits (app_settings where is_public). */
export async function fetchPublicSettings(db: Db): Promise<Record<string, unknown>> {
  const res = await db.from('app_settings').select('key, value').eq('is_public', true);
  check(res);
  return Object.fromEntries((res.data ?? []).map((r) => [r.key, r.value]));
}
