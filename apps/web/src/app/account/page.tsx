import Link from 'next/link';
import { Icon, type IconName } from '@/components/icon';
import { Page, PageHeader } from '@/components/ui';
import { requireCompleteUser } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';
import { DeleteAccount } from './delete-account';
import { NotificationsList } from './notifications-list';
import { SignOutButton } from './sign-out-button';

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/orders', label: 'Your orders', icon: 'receipt_long' },
  { href: '/fact-check', label: 'Your fact checks', icon: 'fact_check' },
  { href: '/support', label: 'Support', icon: 'chat' },
];

export default async function AccountPage() {
  const me = await requireCompleteUser('/account');
  const db = await createServerSupabase();
  const { data: notifications } = await db
    .from('notifications')
    .select('id, title, body, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  return (
    <Page width="md">
      <PageHeader eyebrow="Account" title="Your account" />

      <section className="flex flex-col gap-5 rounded-2xl border border-hairline bg-subtle p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand font-display text-headline-sm text-white uppercase">
            {(me.fullName || me.email || '?').slice(0, 1)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-label-md text-ink">{me.fullName}</span>
            <span className="truncate font-mono text-code text-slate">{me.email}</span>
          </div>
        </div>
        <dl className="flex flex-col divide-y divide-hairline rounded-xl border border-hairline bg-canvas">
          {(
            [
              ['Name', me.fullName],
              ['Email', me.email],
              ['Phone', me.phone],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3 text-body-sm">
              <dt className="text-slate">{k}</dt>
              <dd className="truncate text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav className="flex flex-col divide-y divide-divider rounded-2xl border border-hairline">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center gap-3 px-4 py-3.5 text-label-md text-ink transition-colors hover:bg-subtle"
          >
            <Icon name={l.icon} className="text-slate" />
            <span className="flex-1">{l.label}</span>
            <Icon
              name="arrow_forward"
              size={16}
              className="text-faint transition-colors group-hover:text-ink"
            />
          </Link>
        ))}
      </nav>

      <NotificationsList
        initial={(notifications ?? []).map((n) => ({
          ...n,
          data: n.data as { deep_link?: string } | null,
        }))}
      />
      <SignOutButton />
      <DeleteAccount />
    </Page>
  );
}
