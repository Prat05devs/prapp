import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateIntegrationConnection } from './integration-validation';

afterEach(() => vi.unstubAllGlobals());
describe('read-only provider verification', () => {
  it('checks Razorpay access without creating a charge or refund', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    await validateIntegrationConnection({
      provider: 'razorpay',
      label: 'Test',
      environment: 'test',
      keyId: 'rzp_test_example',
      keySecret: 'example-secret-for-tests',
      webhookSecret: 'example-webhook-for-tests',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/orders?count=1',
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(fetcher.mock.calls[0]![1].method).toBeUndefined();
  });
  it('rejects credentials that the provider rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(
      validateIntegrationConnection({
        provider: 'razorpay',
        label: 'Test',
        environment: 'test',
        keyId: 'rzp_test_example',
        keySecret: 'example-secret-for-tests',
        webhookSecret: 'example-webhook-for-tests',
      }),
    ).rejects.toThrow('could not be verified');
  });
});
