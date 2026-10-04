import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    // Public HTML remains crawlable for search and AI search crawlers. Private page
    // responses carry noindex headers; don't block crawlers from seeing those.
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/'] },
    sitemap: siteUrl('/sitemap.xml'),
  };
}
