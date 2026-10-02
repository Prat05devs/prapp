// Sources our fact checks search (shown on the site and app as "where we look").
// Logos live in the public-assets bucket under sources/<domain>.webp. Golden rule 9: Google and
// PIB are named in plain text only, never shown as logos, so they are not in this list.

export interface CheckedSource {
  domain: string;
  name: string;
  kind: 'fact_checker' | 'news';
}

export const CHECKED_SOURCES: CheckedSource[] = [
  { domain: 'altnews.in', name: 'Alt News', kind: 'fact_checker' },
  { domain: 'boomlive.in', name: 'BOOM', kind: 'fact_checker' },
  { domain: 'factly.in', name: 'Factly', kind: 'fact_checker' },
  { domain: 'newschecker.in', name: 'Newschecker', kind: 'fact_checker' },
  { domain: 'vishvasnews.com', name: 'Vishvas News', kind: 'fact_checker' },
  { domain: 'thehindu.com', name: 'The Hindu', kind: 'news' },
  { domain: 'indianexpress.com', name: 'The Indian Express', kind: 'news' },
  { domain: 'hindustantimes.com', name: 'Hindustan Times', kind: 'news' },
  { domain: 'timesofindia.indiatimes.com', name: 'The Times of India', kind: 'news' },
  { domain: 'ndtv.com', name: 'NDTV', kind: 'news' },
  { domain: 'indiatoday.in', name: 'India Today', kind: 'news' },
  { domain: 'ptinews.com', name: 'PTI', kind: 'news' },
  { domain: 'reuters.com', name: 'Reuters', kind: 'news' },
  { domain: 'bbc.com', name: 'BBC', kind: 'news' },
  { domain: 'amarujala.com', name: 'Amar Ujala', kind: 'news' },
  { domain: 'jagran.com', name: 'Dainik Jagran', kind: 'news' },
  { domain: 'aajtak.in', name: 'Aaj Tak', kind: 'news' },
];

/** Also searched, named in plain text (no logos): official and Google sources. */
export const CHECKED_SOURCES_TEXT_ONLY = [
  'PIB Fact Check',
  'Google Fact Check Tools',
  'Google News',
];

/** Public URL of a file in the public-assets bucket. */
export function publicAssetUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/public-assets/${path}`;
}
