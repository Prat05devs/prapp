import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import type { FactCheckReport } from '@prapp/shared';
import { renderFactCheckReport } from './fc-report';

const report: FactCheckReport = {
  id: 'x',
  reportId: 'FC-ABCDEF12',
  status: 'done',
  error: null,
  inputType: 'text',
  inputText: 'RBI will ban 500 notes',
  inputUrl: null,
  inputDomain: null,
  inputDomainTier: null,
  inputDomainAgeDays: null,
  verdict: 'likely_false',
  confidence: 'high',
  summary: 'भारतीय रिज़र्व बैंक ने ऐसी कोई घोषणा नहीं की है।',
  language: 'hi',
  mode: 'full',
  fullCheckStatus: 'not_needed',
  isPublic: true,
  checkedAt: '2026-09-28T06:00:00Z',
  createdAt: '2026-09-28T06:00:00Z',
  claims: [
    {
      position: 1,
      claimText: 'RBI will ban 500 notes',
      verdict: 'likely_false',
      explanation: 'x',
      isGovernmentRelated: true,
      sources: [
        {
          url: 'https://pib.gov.in/a',
          domain: 'pib.gov.in',
          title: 'PIB',
          publisher: null,
          tier: 'tier1',
          stance: 'refutes',
          isExistingFactCheck: false,
          rating: null,
        },
      ],
    },
  ],
  toolRuns: [{ tool: 'gemini_search', model: 'gemini-2.5-flash', status: 'ok', summary: null }],
};

describe('renderFactCheckReport', () => {
  it('renders a PDF (fonts from Google Fonts)', async () => {
    const pdf = await renderFactCheckReport({
      report,
      reportUrl: 'https://example.in/r/FC-ABCDEF12',
      qrDataUrl: await QRCode.toDataURL('https://example.in/r/FC-ABCDEF12'),
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain('https://pib.gov.in/a');
  }, 30_000);
});
