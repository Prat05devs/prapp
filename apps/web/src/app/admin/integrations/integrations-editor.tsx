'use client';

import { useState, type FormEvent } from 'react';
import { createRequest } from '@prapp/api-client';
import { saveIntegrationSchema, type IntegrationSummary } from '@prapp/shared';
import { Button, Input } from '@/components/ui';

const request = createRequest({ baseUrl: '' });

export function IntegrationsEditor({
  initial,
  siteUrl,
}: {
  initial: IntegrationSummary[];
  siteUrl: string;
}) {
  const [items, setItems] = useState(initial);
  const [provider, setProvider] = useState<'razorpay' | 'gemini'>('razorpay');
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function refresh() {
    setItems(await request<IntegrationSummary[]>('/api/admin/integrations'));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const text = (key: string) => String(fields.get(key) ?? '').trim();
    const input =
      provider === 'razorpay'
        ? {
            provider,
            label: text('label'),
            environment: mode,
            keyId: text('keyId'),
            keySecret: text('keySecret'),
            webhookSecret: text('webhookSecret'),
          }
        : {
            provider,
            label: text('label'),
            projectId: text('projectId'),
            apiKey: text('apiKey'),
            model: text('model'),
            ocrModel: text('ocrModel'),
            dailyQuota: Number(text('dailyQuota')),
            searchEnabled: fields.get('searchEnabled') === 'on',
          };
    const parsed = saveIntegrationSchema.safeParse(input);
    setError('');
    setNotice('');
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' '));
      return;
    }
    setPending(true);
    try {
      await request('/api/admin/integrations', { method: 'POST', body: parsed.data });
      form.reset();
      await refresh();
      setNotice('Configuration saved. Select Use configuration below to activate it.');
    } catch {
      setError('Could not save this configuration. Check the fields and try again.');
    } finally {
      setPending(false);
    }
  }
  async function activate(id: string) {
    setPending(true);
    setError('');
    setNotice('');
    try {
      await request('/api/admin/integrations', { method: 'PATCH', body: { id } });
      await refresh();
      setConfirmId(null);
      setNotice('Active configuration updated. New requests will use it.');
    } catch {
      setError('Could not activate this configuration. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-xl border border-hairline bg-subtle p-4 text-body-sm text-body">
        Secrets are encrypted and hidden after saving. Replacing credentials creates a new version.
        Existing payments keep their original configuration.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-brand">
          {notice}
        </p>
      ) : null}
      <form
        onSubmit={(e) => void save(e)}
        className="flex flex-col gap-4 rounded-xl border border-hairline p-5"
        autoComplete="off"
      >
        <h2 className="font-display text-headline-sm text-ink">Add configuration</h2>
        <label className="flex flex-col gap-1.5 text-sm">
          Provider
          <select
            className="min-h-11 rounded-lg border border-hairline bg-canvas px-3"
            value={provider}
            disabled={pending}
            onChange={(e) => {
              setProvider(e.target.value as typeof provider);
              setError('');
            }}
          >
            <option value="razorpay">Razorpay payments</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Configuration name
          <Input
            name="label"
            required
            maxLength={80}
            placeholder="For example, newsVio live or Client project"
            disabled={pending}
          />
        </label>
        {provider === 'razorpay' ? (
          <fieldset disabled={pending} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Payment mode
              <select
                className="min-h-11 rounded-lg border border-hairline bg-canvas px-3"
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <option value="test">Test — simulated payments</option>
                <option value="live">Live — real payments</option>
              </select>
            </label>
            {mode === 'live' ? (
              <p className="text-sm text-ink">
                Live checkout collects real money. Saving these keys does not activate them.
              </p>
            ) : null}
            <label className="flex flex-col gap-1.5 text-sm">
              Key ID
              <Input name="keyId" required placeholder={`rzp_${mode}_…`} spellCheck={false} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Key secret
              <Input name="keySecret" type="password" autoComplete="new-password" required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Webhook secret
              <Input name="webhookSecret" type="password" autoComplete="new-password" required />
            </label>
            <p className="text-sm text-slate">
              Use the same webhook secret in Razorpay. Webhook URL:{' '}
              <code className="break-all">{siteUrl.replace(/\/$/, '')}/api/webhooks/razorpay</code>.
              Create the webhook separately in each Razorpay mode.
            </p>
          </fieldset>
        ) : (
          <fieldset disabled={pending} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Google Cloud project ID
              <Input name="projectId" required placeholder="your-project-id" spellCheck={false} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              API key
              <Input name="apiKey" type="password" autoComplete="new-password" required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                Text model
                <Input
                  name="model"
                  required
                  placeholder="Model available in your AI Studio project"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Image / OCR model
                <Input
                  name="ocrModel"
                  required
                  placeholder="Model available in your AI Studio project"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              Daily request budget per model
              <Input
                name="dailyQuota"
                type="number"
                min={1}
                max={1000000}
                defaultValue={200}
                required
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="searchEnabled" className="h-4 w-4" />
              Enable Google Search grounding for this project
            </label>
            <p className="text-sm text-slate">
              Check model access and billing in AI Studio. Keys from the same project share quota. A
              new key does not reset the project’s usage. Use client-owned credentials only with
              permission to process this app’s fact checks.
            </p>
          </fieldset>
        )}
        <Button disabled={pending} type="submit" className="self-start">
          {pending ? 'Saving…' : 'Save configuration'}
        </Button>
      </form>
      <section className="flex flex-col gap-3" aria-labelledby="saved-configurations">
        <h2 id="saved-configurations" className="font-display text-headline-sm text-ink">
          Saved configurations
        </h2>
        {!items.length ? (
          <p className="text-sm text-slate">
            No dashboard configurations yet. Existing server environment settings remain in use
            until a configuration is activated.
          </p>
        ) : null}
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-hairline p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{item.label}</p>
                <p className="text-sm text-slate">
                  {item.provider === 'razorpay'
                    ? `Razorpay · ${item.environment === 'live' ? 'Live — real payments' : 'Test'}`
                    : `Gemini · ${item.projectId}`}{' '}
                  · {item.keyHint}
                </p>
              </div>
              {item.active ? (
                <span className="text-sm font-medium text-brand">Active</span>
              ) : (
                <Button variant="outline" disabled={pending} onClick={() => setConfirmId(item.id)}>
                  Use configuration
                </Button>
              )}
            </div>
            {confirmId === item.id && !item.active ? (
              <div className="flex flex-col gap-3 border-t border-hairline pt-3">
                <p className="text-sm">
                  {item.provider === 'razorpay' && item.environment === 'live'
                    ? 'Switch new checkouts to live mode? Customers will be charged real money.'
                    : `Use ${item.label} for new ${item.provider === 'razorpay' ? 'checkouts' : 'fact checks'}?`}
                </p>
                <div className="flex gap-3">
                  <Button disabled={pending} onClick={() => void activate(item.id)}>
                    Confirm switch
                  </Button>
                  <Button variant="outline" disabled={pending} onClick={() => setConfirmId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
