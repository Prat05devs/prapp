import type { MetadataRoute } from 'next';
import { PUBLIC_SEARCH_PATHS, siteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  // No fabricated lastModified dates or automatic discovery of user submissions.
  return PUBLIC_SEARCH_PATHS.map((path) => ({ url: siteUrl(path) }));
}
