'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Header / sidebar link active page underlined in brand blue. */
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
      className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-body-sm font-semibold whitespace-nowrap transition-colors duration-150 ${
        active
          ? 'text-ink underline decoration-brand decoration-2 underline-offset-8'
          : 'text-body hover:text-ink'
      } ${className}`}
    >
      {children}
    </Link>
  );
}
