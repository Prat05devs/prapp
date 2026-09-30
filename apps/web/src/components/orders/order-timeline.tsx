import { ORDER_STATUS_LABELS, type OrderStatus } from '@prapp/shared';
import { Icon } from '@/components/icon';

const PATH: OrderStatus[] = ['draft', 'pending_payment', 'paid', 'in_progress', 'published'];

/**
 * Happy-path progress for the customer. Off-path statuses (rejected, refunded, cancelled,
 * expired) have their own notices, so the timeline is not shown for them.
 */
export function OrderTimeline({ status }: { status: string }) {
  const at = status === 'changes_requested' ? 3 : PATH.indexOf(status as OrderStatus);
  if (at < 0) return null;
  return (
    <ol className="grid grid-cols-5 gap-2">
      {PATH.map((s, i) => {
        const done = i < at || (i === at && s === 'published');
        const current = i === at && s !== 'published';
        const label =
          current && status === 'changes_requested'
            ? ORDER_STATUS_LABELS.changes_requested
            : ORDER_STATUS_LABELS[s];
        return (
          <li key={s} className="flex flex-col gap-2">
            <span
              className={`h-1.5 rounded-full ${
                done
                  ? 'bg-emerald-strong'
                  : current
                    ? status === 'changes_requested'
                      ? 'bg-warn'
                      : 'bg-ink'
                    : 'bg-elevated'
              }`}
            />
            <span
              className={`flex items-center gap-1 text-label-sm ${done || current ? 'text-ink' : 'text-faint'}`}
            >
              {done ? <Icon name="check" size={14} className="text-emerald-strong" /> : null}
              <span className="truncate">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
