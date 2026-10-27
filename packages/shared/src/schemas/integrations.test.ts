import { describe, expect, it } from 'vitest';
import { saveIntegrationSchema } from './integrations';

describe('provider configuration validation', () => {
  it('validates Gemini project-scoped keys and model budgets', () => {
    const input = {
      provider: 'gemini',
      label: 'Client project',
      projectId: 'client-project',
      apiKey: 'example-key-long-enough',
      model: 'gemini-model',
      ocrModel: 'gemini-lite',
      dailyQuota: 200,
      searchEnabled: false,
    };
    expect(saveIntegrationSchema.safeParse(input).success).toBe(true);
    expect(saveIntegrationSchema.safeParse({ ...input, dailyQuota: 0 }).success).toBe(false);
    expect(saveIntegrationSchema.safeParse({ ...input, projectId: '' }).success).toBe(false);
    expect(
      saveIntegrationSchema.safeParse({ ...input, model: 'https://attacker.example' }).success,
    ).toBe(false);
  });
});
