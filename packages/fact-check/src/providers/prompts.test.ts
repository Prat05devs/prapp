import { describe, expect, it } from 'vitest';
import { toJudgement } from './prompts.ts';

const urls = ['https://news.google.com/rss/articles/AAA', 'https://pib.gov.in/x'];

describe('toJudgement', () => {
  it('maps cited source numbers to the retrieved URLs and drops anything else', () => {
    const j = toJudgement(
      JSON.stringify({
        verdict: 'likely_true',
        confidence: 'high',
        explanation: 'Reported by two outlets.',
        stances: [
          { source: 1, stance: 'supports' },
          { source: '[2]', stance: 'supports' },
          { source: 9, stance: 'supports' },
          { url: 'https://invented.example', stance: 'supports' },
        ],
      }),
      urls,
    );
    expect(j.stances).toEqual([
      { url: urls[0], stance: 'supports' },
      { url: urls[1], stance: 'supports' },
    ]);
  });
});
