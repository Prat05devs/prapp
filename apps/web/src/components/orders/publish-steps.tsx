import { Icon } from '@/components/icon';

const STEPS = ['Write your story', 'Add photos', 'Review and pay'];

/** Where the customer is in the publish flow (LLD §9.2–9.4). */
export function PublishSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] ${
                  done
                    ? 'bg-emerald-strong text-white'
                    : active
                      ? 'bg-ink text-white'
                      : 'border border-hairline text-faint'
                }`}
              >
                {done ? <Icon name="check" size={14} /> : String(n).padStart(2, '0')}
              </span>
              <span className={`text-label-sm ${active ? 'text-ink' : 'text-slate'}`}>{label}</span>
            </span>
            {n < STEPS.length ? <span className="h-px w-6 bg-hairline" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
