import { CHECKED_SOURCES, CHECKED_SOURCES_TEXT_ONLY, publicAssetUrl } from '@prapp/shared';

/**
 * "Where we look": the outlets and fact-checkers our checks search. Their names and marks show
 * where evidence comes from; they are not partners. Google and PIB are text only (rule 9).
 */
export function SourceStrip({ supabaseUrl }: { supabaseUrl: string }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2">
        {CHECKED_SOURCES.map((s) => (
          <li
            key={s.domain}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper py-1 pr-3 pl-1 text-body-sm text-ink"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- public bucket asset */}
            <img
              src={publicAssetUrl(supabaseUrl, `sources/${s.domain}.webp`)}
              alt=""
              loading="lazy"
              className="h-6 w-6 rounded-full border border-hairline bg-white object-contain"
            />
            {s.name}
          </li>
        ))}
      </ul>
      <p className="max-w-3xl text-body-sm text-slate">
        Plus {CHECKED_SOURCES_TEXT_ONLY.join(', ')}, government sites and 100+ trusted outlets.
        Names show where evidence comes from; they are not partners or endorsements.
      </p>
    </div>
  );
}
