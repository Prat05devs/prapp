import { describe, expect, it } from 'vitest';
import { inputHash, normalizeText, normalizeUrl } from './normalize.ts';
import { tierFor } from './sources.ts';
import { assertPublicUrl } from './tools/http.ts';
import { keywordQuery } from './tools/gdelt.ts';
import { isLikelySameClaim } from './tools/google-fact-check.ts';
import { lowerConfidence, overallVerdict, verdictFromRating } from './verdict.ts';

describe('verdictFromRating', () => {
  it.each([
    ['False', 'likely_false'],
    ['Fake', 'likely_false'],
    ['FAKE NEWS', 'likely_false'],
    ['Misleading', 'misleading'],
    ['Partly false', 'misleading'],
    ['Missing context', 'misleading'],
    ['True', 'likely_true'],
    ['Mostly True', 'likely_true'],
    ['फर्जी', 'likely_false'],
    ['Unproven', null],
  ])('%s → %s', (rating, expected) => {
    expect(verdictFromRating(rating)).toBe(expected);
  });
});

describe('verdict helpers', () => {
  it('overall verdict is the worst claim', () => {
    expect(overallVerdict(['likely_true', 'misleading'])).toBe('misleading');
    expect(overallVerdict(['likely_true', 'unverified'])).toBe('unverified');
    expect(overallVerdict(['misleading', 'likely_false'])).toBe('likely_false');
    expect(overallVerdict([])).toBe('unverified');
  });
  it('fallback models lower confidence one level', () => {
    expect(lowerConfidence('high')).toBe('medium');
    expect(lowerConfidence('low')).toBe('low');
  });
});

describe('existing fact-check claim matching', () => {
  it('accepts a close paraphrase with the same truth conditions', () => {
    expect(
      isLikelySameClaim(
        'RBI will ban 500 rupee notes from next month',
        'RBI to ban 500 rupee notes next month',
      ),
    ).toBe(true);
  });

  it('rejects a different claim about the same subject', () => {
    expect(
      isLikelySameClaim(
        'The Eiffel Tower is located in Paris, France',
        'Videos show the Eiffel Tower ablaze',
      ),
    ).toBe(false);
  });

  it('rejects claims with changed numbers or negation', () => {
    expect(isLikelySameClaim('RBI will ban 500 notes', 'RBI will ban 2000 notes')).toBe(false);
    expect(
      isLikelySameClaim('The scheme covers students', 'The scheme does not cover students'),
    ).toBe(false);
  });
});

describe('normalisation and cache key', () => {
  it('normalises text and URLs', () => {
    expect(normalizeText('  Hello\n\nWORLD  ')).toBe('hello world');
    expect(normalizeUrl('http://www.Example.com/a/?utm_source=x&b=2&a=1#top')).toBe(
      'https://example.com/a?a=1&b=2',
    );
  });
  it('same input → same hash, different type → different hash', async () => {
    expect(await inputHash('text', 'Hello  world')).toBe(await inputHash('text', 'hello world'));
    expect(await inputHash('text', 'https://a.in')).not.toBe(
      await inputHash('url', 'https://a.in'),
    );
  });
});

describe('tiers', () => {
  const trusted = new Map([
    ['pib.gov.in', 'tier1' as const],
    ['thehindu.com', 'tier2' as const],
  ]);
  it('matches parent domains and gov.in', () => {
    expect(tierFor('www.thehindu.com', trusted)).toBe('tier2');
    expect(tierFor('news.thehindu.com', trusted)).toBe('tier2');
    expect(tierFor('uk.gov.in', trusted)).toBe('tier1');
    expect(tierFor('dehradun.nic.in', trusted)).toBe('tier1');
    expect(tierFor('random-blog.com', trusted)).toBe('unknown');
  });
});

describe('SSRF guard', () => {
  it.each([
    'http://localhost/x',
    'http://127.0.0.1/',
    'http://10.0.0.5/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/',
    'file:///etc/passwd',
    'http://example.com:8080/',
    'http://metadata.internal/',
    'http://2130706433/',
  ])('blocks %s', (url) => {
    expect(() => assertPublicUrl(url)).toThrow();
  });
  it('allows public sites', () => {
    expect(assertPublicUrl('https://www.thehindu.com/news/a').hostname).toBe('www.thehindu.com');
  });
});

describe('gdelt keywords', () => {
  it('drops stop words and punctuation', () => {
    expect(keywordQuery('The RBI is banning ₹500 notes from next month!')).toBe(
      'rbi banning 500 notes next month',
    );
  });
});
