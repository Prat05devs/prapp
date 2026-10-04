'use client';

import type { CataloguePackage } from '@prapp/api-client';
import { formatMoney } from '@prapp/shared';
import { Label, RadioGroup, RadioGroupItem } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Package cards on a shadcn RadioGroup (keyboard arrows move between packages). */
export function PackagePicker({
  packages,
  value,
  onChange,
  disabled,
  error,
}: {
  packages: CataloguePackage[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        aria-label="Package"
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="gap-3"
      >
        {packages.map((p) => {
          const selected = value === p.id;
          return (
            <Label
              key={p.id}
              htmlFor={`package-${p.id}`}
              className={cn(
                'flex cursor-pointer items-start gap-4 rounded-lg border bg-paper p-5 font-normal transition-colors has-[:disabled]:cursor-not-allowed',
                selected
                  ? 'border-brand bg-brand-tint/40 ring-1 ring-brand'
                  : 'border-hairline hover:border-ink',
              )}
            >
              <RadioGroupItem id={`package-${p.id}`} value={p.id} className="mt-1" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-label-md text-ink">{p.name}</span>
                  <span className="tabular font-display text-headline-sm text-ink">
                    {formatMoney(p.priceInrPaise, 'INR')}
                  </span>
                </span>
                <span className="text-body-sm text-slate">
                  {p.portalCount} high-DA news portal{p.portalCount === 1 ? '' : 's'}
                  {p.includesInstagram ? ' + 1 Instagram collaboration post' : ''} · live within{' '}
                  {p.turnaroundHours} h
                </span>
                {p.description ? (
                  <span className="text-body-sm text-slate">{p.description}</span>
                ) : null}
              </span>
            </Label>
          );
        })}
      </RadioGroup>
      <p className="text-body-sm text-slate">Prices include all taxes.</p>
      {error ? <p className="text-body-sm text-danger">{error}</p> : null}
    </div>
  );
}
