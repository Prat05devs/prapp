import { describe, expect, it } from 'vitest';
import { renderPrReport } from './pr-report';

describe('renderPrReport', () => {
  it('renders a PDF with every link', async () => {
    const pdf = await renderPrReport({
      orderNumber: 'PR-260927-00001',
      publishedAt: '2026-09-27T10:00:00Z',
      customerName: 'Asha Rawat',
      headline: 'Local school wins the state science fair',
      packageName: 'Starter',
      rows: [
        {
          platform: 'Portal One',
          url: 'https://portal-one.example/a',
          publishedAt: '2026-09-27T09:00:00Z',
        },
        { platform: 'Instagram', url: 'https://instagram.com/p/abc', publishedAt: null },
      ],
      support: { phone: '+911234567890', email: 'support@example.com' },
      version: 1,
      generatedAt: '2026-09-27T10:01:00Z',
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.toString('latin1')).toContain('https://portal-one.example/a');
  });
});
