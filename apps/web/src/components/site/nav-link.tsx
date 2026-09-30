'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Header / sidebar link with the Stitch active state (elevated plane). */
export function NavLink({
  href,
  children,
  exact = false,
  className = '',
}: {
  href: string;
  children: ReactNode;
  exact?: boolean;
  className?: string;
}) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-label-md whitespace-nowrap transition-colors duration-150 ${
        active ? 'bg-elevated text-ink' : 'text-body hover:bg-subtle hover:text-ink'
      } ${className}`}
    >
      {children}
    </Link>
  );
}
