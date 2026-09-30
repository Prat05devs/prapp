// Material Symbols (the icon set Stitch uses), loaded as a subset font. Only the names below
// are in the subset; anything else would render as its raw ligature text, so the type is closed.
const ICONS = [
  'arrow_back',
  'arrow_forward',
  'bolt',
  'call',
  'chat',
  'check',
  'check_circle',
  'close',
  'content_copy',
  'dashboard',
  'delete',
  'description',
  'download',
  'edit',
  'error',
  'fact_check',
  'group',
  'history',
  'image',
  'inbox',
  'info',
  'inventory_2',
  'language',
  'link',
  'lock',
  'logout',
  'mail',
  'north_east',
  'notifications',
  'payments',
  'person',
  'picture_as_pdf',
  'priority_high',
  'progress_activity',
  'public',
  'receipt_long',
  'schedule',
  'settings',
  'share',
  'shield',
  'star',
  'upload',
  'verified',
  'verified_user',
  'warning',
] as const;

export type IconName = (typeof ICONS)[number];

/** Google Fonts requires icon_names sorted alphabetically. */
export const ICON_FONT_URL = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400,0..1,0&icon_names=${[...ICONS].sort().join(',')}&display=block`;

export function Icon({
  name,
  size = 18,
  filled = false,
  className = '',
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`material-symbols-outlined inline-block shrink-0 ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        ...(filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" } : {}),
      }}
    >
      {name}
    </span>
  );
}
