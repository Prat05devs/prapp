import Link from 'next/link';
import { BRAND_NAME } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { supportContacts } from './support';

export async function SiteFooter() {
  const s = await supportContacts();
  return (
    <footer className="mt-auto border-t border-hairline bg-subtle">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:justify-between">
        <div className="flex flex-col gap-3">
          <span className="font-display text-headline-sm font-bold text-ink">{BRAND_NAME}</span>
          <div className="flex flex-col gap-1.5 text-body-sm text-slate">
            {s.phone ? (
              <a className="flex items-center gap-2 hover:text-ink" href={`tel:${s.phone}`}>
                <Icon name="call" size={16} /> {s.phone}
              </a>
            ) : null}
            {s.email ? (
              <a className="flex items-center gap-2 hover:text-ink" href={`mailto:${s.email}`}>
                <Icon name="mail" size={16} /> {s.email}
              </a>
            ) : null}
            {s.whatsapp ? (
              <a
                className="flex items-center gap-2 hover:text-ink"
                href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="chat" size={16} /> WhatsApp
              </a>
            ) : null}
            {s.hours ? (
              <span className="flex items-center gap-2">
                <Icon name="schedule" size={16} /> {s.hours}
              </span>
            ) : null}
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-label-md text-body md:self-end">
          <Link className="hover:text-ink" href="/support">
            Support
          </Link>
          <Link className="hover:text-ink" href="/methodology">
            How we check
          </Link>
          <Link className="hover:text-ink" href="/terms">
            Terms
          </Link>
          <Link className="hover:text-ink" href="/privacy">
            Privacy
          </Link>
        </nav>
      </div>
      <div className="border-t border-hairline">
        <p className="mx-auto w-full max-w-7xl px-4 py-4 text-body-sm text-slate sm:px-6">
          © {new Date().getFullYear()} {BRAND_NAME} · Paid stories are published as sponsored
          content
        </p>
      </div>
    </footer>
  );
}
