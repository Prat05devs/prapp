import Link from 'next/link';
import { BRAND_NAME } from '@prapp/shared';
import { buttonVariants } from '@/components/ui';
import { getCurrentUser } from '@/server/session';
import { NavLink } from './nav-link';

export function BrandMark() {
  return (
    <Link href="/" className="flex shrink-0 items-center">
      <span className="font-display text-[22px] leading-none font-bold text-ink">{BRAND_NAME}</span>
    </Link>
  );
}

export async function SiteHeader() {
  const me = await getCurrentUser().catch(() => null);
  const staff = me && (me.role === 'editor' || me.role === 'admin');
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
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
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-white uppercase">
                {(me.fullName || me.email || '?').slice(0, 1)}
              </span>
              <span className="max-w-32 truncate">{me.fullName || 'Account'}</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
                Log in
              </Link>
              <Link href="/login?mode=signup" className={buttonVariants({ size: 'sm' })}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
