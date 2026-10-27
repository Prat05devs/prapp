import 'server-only';
import type { SaveIntegrationInput } from '@prapp/shared';

/** Read-only provider checks: no payment, refund, or Gemini generation request is created. */
export async function validateIntegrationConnection(input: SaveIntegrationInput): Promise<void> {
  if (input.provider === 'razorpay') {
    const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      headers: {
        Authorization: `Basic ${Buffer.from(`${input.keyId}:${input.keySecret}`).toString('base64')}`,
      },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error('Provider credentials could not be verified');
    return;
  }
  for (const model of new Set([input.model, input.ocrModel])) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,
      {
        headers: { 'x-goog-api-key': input.apiKey },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('Gemini credentials or model access could not be verified');
    }
    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== 'object' ||
      !('supportedGenerationMethods' in result) ||
      !Array.isArray(result.supportedGenerationMethods) ||
      !result.supportedGenerationMethods.includes('generateContent')
    ) {
      throw new Error('Gemini model does not support content generation');
    }
  }
}
