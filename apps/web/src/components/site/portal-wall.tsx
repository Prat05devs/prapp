import { publicAssetUrl } from '@prapp/shared';

export interface WallPortal {
  name: string;
  domain: string;
  homepageUrl: string;
  logoPath: string | null;
}

/**
 * Our publishing network: every publicly listed portal, logo when we have one, name otherwise.
 * Logos are the portals' own marks from the public-assets bucket.
 */
export function PortalWall({
  portals,
  supabaseUrl,
  limit,
  className = '',
}: {
  portals: WallPortal[];
  supabaseUrl: string;
  limit?: number;
  className?: string;
}) {
  const shown = limit ? portals.slice(0, limit) : portals;
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {shown.map((p) => (
        <li key={p.domain}>
          <a
            href={p.homepageUrl}
            target="_blank"
            rel="noreferrer"
            title={`${p.name} · ${p.domain}`}
            className="group flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-hairline bg-paper px-4 py-3 transition-colors hover:border-ink"
          >
            {p.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element -- public bucket asset
              <img
                src={publicAssetUrl(supabaseUrl, p.logoPath)}
                alt={p.name}
                loading="lazy"
                className="h-11 w-full max-w-[150px] object-contain"
              />
            ) : (
              <span className="text-center font-display text-[17px] leading-tight font-semibold text-ink">
                {p.name}
              </span>
            )}
            <span className="text-[12px] text-slate group-hover:text-ink">{p.domain}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
