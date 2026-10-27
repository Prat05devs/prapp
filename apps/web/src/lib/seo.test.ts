import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  publicEnv: () => ({ NEXT_PUBLIC_SITE_URL: 'https://newsvio.in' }),
}));

import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { pageMetadata, serializeJsonLd } from './seo';

describe('search discovery boundaries', () => {
  it('keeps customer and automated report URLs out of the sitemap', () => {
    const paths = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(paths).toContain('/publish');
    expect(paths).toContain('/fact-check');
    expect(
      paths.every((path) => !/^\/(admin|orders|account|pay|r|api|login)(\/|$)/.test(path)),
    ).toBe(true);
    expect(new Set(paths).size).toBe(paths.length);
    expect(robots().sitemap).toBe('https://newsvio.in/sitemap.xml');
  });

  it('gives each service its own canonical and matching share URL', () => {
    for (const path of ['/publish', '/fact-check', '/methodology']) {
      const metadata = pageMetadata(path, 'Page title', 'Description');
      expect(metadata.alternates?.canonical).toBe(`https://newsvio.in${path}`);
      expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
    }
  });

  it('prevents script injection without changing the structured data value', () => {
    const data = {
      name: '</script><script>alert("x")</script>',
      description: 'Hindi हिन्दी & English',
    };
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
