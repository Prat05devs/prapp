import type { Metadata } from 'next';
import { BRAND_NAME } from '@prapp/shared';
import { Icon, type IconName } from '@/components/icon';
import { NavLink } from '@/components/site/nav-link';
import { Eyebrow, LiveDot } from '@/components/ui';
import { requireStaffPage } from '@/server/admin-session';

export const metadata: Metadata = { title: `Admin · ${BRAND_NAME}`, robots: { index: false } };

const LINKS: { href: string; label: string; icon: IconName; admin?: boolean }[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/orders', label: 'Orders', icon: 'inbox' },
  { href: '/admin/attention', label: 'Attention', icon: 'priority_high', admin: true },
  { href: '/admin/payments', label: 'Payments', icon: 'payments', admin: true },
  { href: '/admin/showcase', label: 'Showcase', icon: 'star' },
  { href: '/admin/portals', label: 'Portals', icon: 'language', admin: true },
  { href: '/admin/packages', label: 'Packages', icon: 'inventory_2', admin: true },
  { href: '/admin/staff', label: 'Staff', icon: 'group', admin: true },
  { href: '/admin/settings', label: 'Settings', icon: 'settings', admin: true },
  { href: '/admin/trusted-sources', label: 'Trusted sources', icon: 'verified_user', admin: true },
];

// Control-centre layout from the Stitch admin screens: hairline sidebar, icon nav, operator card.
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const me = await requireStaffPage();
  const isAdmin = me.role === 'admin';
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col md:flex-row">
      <aside className="border-b border-hairline md:sticky md:top-16 md:flex md:h-[calc(100vh-4rem)] md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="hidden px-5 pt-6 pb-3 md:block">
          <Eyebrow>Admin desk</Eyebrow>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible md:px-3 md:py-0">
          {LINKS.filter((l) => isAdmin || !l.admin).map((l) => (
            <NavLink key={l.href} href={l.href} exact={l.href === '/admin'}>
              <Icon name={l.icon} className="text-slate" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden p-3 md:block">
          <div className="flex items-center gap-3 rounded-xl border border-hairline bg-subtle p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[11px] text-white uppercase">
              {(me.fullName || '?').slice(0, 1)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-label-sm text-ink">{me.fullName}</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate uppercase">
                <LiveDot className="scale-75" /> {me.role}
              </span>
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</div>
    </div>
  );
}
