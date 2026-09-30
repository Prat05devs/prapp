import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { safeFetch } from './http.ts';

export interface Article {
  finalUrl: string;
  title: string | null;
  text: string;
  siteName: string | null;
  publishedAt: string | null;
}

/** URL → title + readable text (LLD §11.2 step 1). */
export async function fetchArticle(url: string, fetchImpl?: typeof fetch): Promise<Article> {
  const res = await safeFetch(url, fetchImpl);
  if (res.status >= 400) throw new Error(`http_${res.status}`);
  if (!/html|xml|text\/plain/i.test(res.contentType)) throw new Error('not_html');
  const html = new TextDecoder().decode(res.body);
  const { document } = parseHTML(html);
  const meta = (sel: string) => document.querySelector(sel)?.getAttribute('content') ?? null;
  const article = new Readability(document as unknown as Document, { charThreshold: 200 }).parse();
  const text = (article?.textContent ?? document.body?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    finalUrl: res.finalUrl,
    title: article?.title ?? meta('meta[property="og:title"]') ?? document.title ?? null,
    text: text.slice(0, 20_000),
    siteName: article?.siteName ?? meta('meta[property="og:site_name"]'),
    publishedAt: article?.publishedTime ?? meta('meta[property="article:published_time"]'),
  };
}
