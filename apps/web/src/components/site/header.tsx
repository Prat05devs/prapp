import Link from 'next/link';
import { BRAND_NAME } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { buttonVariants } from '@/components/ui';
import { getCurrentUser } from '@/server/session';
import { NavLink } from './nav-link';

export function BrandMark() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
        <Icon name="verified" size={18} />
      </span>
      <span className="flex flex-col">
        <span className="font-display text-[17px] leading-none font-bold tracking-tight text-ink">
          {BRAND_NAME}
        </span>
        <span className="mt-1 font-mono text-[10px] leading-none tracking-wider text-faint uppercase">
          Fact check · Publish
        </span>
      </span>
    </Link>
  );
}

export async function SiteHeader() {
  const me = await getCurrentUser().catch(() => null);
  const staff = me && (me.role === 'editor' || me.role === 'admin');
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 md:h-16 md:flex-nowrap md:py-0">
        <BrandMark />
        <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:mx-0 md:ml-4 md:w-auto">
          <NavLink href="/fact-check">Fact check</NavLink>
          <NavLink href="/publish">Publish your story</NavLink>
          {me ? <NavLink href="/orders">Orders</NavLink> : null}
          <NavLink href="/methodology">How we check</NavLink>
          {staff ? <NavLink href="/admin">Admin</NavLink> : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {me ? (
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-full border border-hairline py-1 pr-3 pl-1 text-label-md text-ink transition-colors hover:border-ink"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-[11px] text-white uppercase">
                {(me.fullName || me.email || '?').slice(0, 1)}
              </span>
              <span className="max-w-32 truncate">{me.fullName || 'Account'}</span>
            </Link>
          ) : (
            <Link href="/login" className={buttonVariants({ size: 'sm' })}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
