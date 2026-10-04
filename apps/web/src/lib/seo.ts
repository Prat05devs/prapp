import type { Metadata } from 'next';
import { publicEnv } from '@/lib/env';

export const SITE_DESCRIPTION =
  'Check WhatsApp forwards with sources, or publish your story through NewsVio’s self-service PR platform for news portals and Instagram in India.';

// Keep discovery limited to curated pages, not customer records or automated reports.
export const PUBLIC_SEARCH_PATHS = [
  '/',
  '/fact-check',
  '/publish',
  '/methodology',
  '/support',
  '/terms',
  '/privacy',
] as const;

export function siteUrl(path = '/') {
  return new URL(path, publicEnv().NEXT_PUBLIC_SITE_URL).toString();
}

export function pageMetadata(path: string, title: string, description: string): Metadata {
  const fullTitle = `${title} | NewsVio`;
  const images = [
    {
      url: siteUrl('/social-image'),
      width: 1200,
      height: 630,
      alt: 'NewsVio — Fact checking and self-service PR in India',
    },
  ];
  return {
    title: fullTitle,
    description,
    alternates: { canonical: siteUrl(path) },
    openGraph: {
      type: 'website',
      siteName: 'NewsVio',
      locale: 'en_IN',
      url: siteUrl(path),
      title: fullTitle,
      description,
      images,
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images },
  };
}

export function serializeJsonLd(value: unknown): string {
  // JSON must never be able to close its script element, including future CMS content.
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': siteUrl('/#organization'),
    name: 'NewsVio',
    url: siteUrl(),
    logo: siteUrl('/brand-mark.png'),
  };
}

export function serviceSchema(path: string, name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': siteUrl(`${path}#service`),
    name,
    description,
    url: siteUrl(path),
    provider: organizationSchema(),
    areaServed: { '@type': 'Country', name: 'India' },
  };
}
