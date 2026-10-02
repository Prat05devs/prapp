import { describe, expect, it } from 'vitest';
import { parseNewsRss } from './google-news.ts';

const rss = `<rss><channel>
<item><title>PM lauds pilot &amp; crew - NDTV</title><link>https://news.google.com/rss/articles/a</link>
<pubDate>Thu, 01 Oct 2026 09:18:36 GMT</pubDate><description>&lt;a href="x"&gt;Related headline&lt;/a&gt;</description>
<source url="https://www.ndtv.com">NDTV</source></item>
<item><title>Viral post - Facebook</title><link>https://news.google.com/rss/articles/b</link>
<source url="https://www.facebook.com">Facebook</source></item>
<item><title>No source tag</title><link>https://news.google.com/rss/articles/c</link></item>
</channel></rss>`;

describe('parseNewsRss', () => {
  it('uses the publisher domain, strips the publisher suffix and drops social posts', () => {
    const items = parseNewsRss(rss);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      url: 'https://news.google.com/rss/articles/a',
      title: 'PM lauds pilot & crew',
      domain: 'ndtv.com',
      publisher: 'NDTV',
      publishedAt: '2026-10-01T09:18:36.000Z',
      snippet: 'Related headline',
    });
  });
});

describe('parseBingRss', () => {
  it('unwraps the article URL and keeps the publisher', async () => {
    const { parseBingRss } = await import('./google-news.ts');
    const xml = `<rss><channel><item><title>8 Students From Pune Drown</title>
<link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3a%2f%2fwww.deccanchronicle.com%2fnation%2fx-1&amp;mkt=en-in</link>
<description>Eight Pune students drowned at Diveagar beach.</description><pubDate>Thu, 01 Oct 2026 09:02:00 GMT</pubDate>
<News:Source>Deccan Chronicle</News:Source></item></channel></rss>`;
    expect(parseBingRss(xml)).toEqual([
      {
        url: 'https://www.deccanchronicle.com/nation/x-1',
        title: '8 Students From Pune Drown',
        snippet: 'Eight Pune students drowned at Diveagar beach.',
        domain: 'deccanchronicle.com',
        publisher: 'Deccan Chronicle',
        publishedAt: '2026-10-01T09:02:00.000Z',
      },
    ]);
  });
});
