'use client';

import Link from 'next/link';
import { formatIST } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { Badge } from '@/components/ui';
import { useNotifications, type NotificationItem } from '@/hooks/use-notifications';

export function NotificationsList({ initial }: { initial: NotificationItem[] }) {
  const { items, unread, markRead } = useNotifications(initial);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-headline-sm text-ink">
          <Icon name="notifications" className="text-slate" /> Notifications
          {unread ? <Badge variant="emerald">{unread} new</Badge> : null}
        </h2>
        {unread ? (
          <button
            type="button"
            className="text-label-sm text-slate hover:text-ink"
            onClick={() => void markRead(items.filter((n) => !n.read_at).map((n) => n.id))}
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-hairline bg-subtle px-4 py-6 text-center text-body-sm text-slate">
          Nothing yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider rounded-2xl border border-hairline">
          {items.map((n) => (
            <li key={n.id} className="flex gap-3 px-4 py-3">
              <span
                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-emerald'}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-label-md ${n.read_at ? 'text-slate' : 'text-ink'}`}>
                  {n.title}
                </span>
                <span className="text-body-sm text-body">{n.body}</span>
                <span className="mt-1 flex items-center gap-3 font-mono text-code text-faint">
                  {formatIST(n.created_at)}
                  {n.data?.deep_link ? (
                    <Link
                      className="inline-flex items-center gap-1 text-emerald-strong hover:text-emerald-deep"
                      href={n.data.deep_link}
                      onClick={() => void markRead([n.id])}
                    >
                      Open <Icon name="north_east" size={14} />
                    </Link>
                  ) : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
