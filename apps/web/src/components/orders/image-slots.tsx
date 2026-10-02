'use client';

import type { OrderImage } from '@prapp/api-client';
import { Icon } from '@/components/icon';
import { useSignedUrls } from '@/hooks/use-signed-urls';

export function ImageSlots({
  orderId,
  images,
  slots,
  busy,
  editable,
  onPick,
  onRemove,
}: {
  orderId: string;
  images: OrderImage[];
  slots: (1 | 2)[];
  busy: 1 | 2 | null;
  editable: boolean;
  onPick: (file: File, position: 1 | 2) => void;
  onRemove: (image: OrderImage) => void;
}) {
  const urls = useSignedUrls(
    orderId,
    images.map((i) => i.storagePath),
  );
  const filled = slots.filter((s) => images.some((i) => i.position === s)).length;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-label-md text-ink">Images (1 required, up to 2)</h2>
        <span
          className={`font-mono text-code uppercase ${filled ? 'text-emerald-strong' : 'text-slate'}`}
        >
          {filled} of {slots.length} added
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((position) => {
          const image = images.find((i) => i.position === position);
          const url = image ? urls[image.storagePath] : undefined;
          const pickInput = (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onPick(file, position);
              }}
            />
          );
          return image ? (
            <div
              key={position}
              className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas"
            >
              <div className="relative">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                  <img src={url} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="aspect-video w-full bg-elevated" />
                )}
                <span className="absolute top-3 left-3 rounded-md bg-ink/80 px-2 py-0.5 font-mono text-[11px] text-white uppercase">
                  Photo {position}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="font-mono text-code text-slate">
                  {image.width} × {image.height} px · {Math.round(image.sizeBytes / 1024)} KB
                </p>
                <Icon name="check_circle" className="text-emerald" />
              </div>
              {editable ? (
                <div className="flex gap-4 border-t border-divider px-4 py-2.5 text-label-sm">
                  <label className="cursor-pointer text-ink hover:text-emerald-strong">
                    Replace
                    {pickInput}
                  </label>
                  <button
                    type="button"
                    className="text-slate hover:text-danger"
                    disabled={busy !== null}
                    onClick={() => onRemove(image)}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <label
              key={position}
              className={`flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline bg-subtle p-4 text-center transition-colors ${
                editable ? 'cursor-pointer hover:border-ink' : ''
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-canvas text-slate">
                <Icon
                  name={busy === position ? 'progress_activity' : 'upload'}
                  size={20}
                  className={busy === position ? 'animate-spin' : ''}
                />
              </span>
              <span className="text-label-md text-ink">
                {busy === position ? 'Uploading…' : `Add photo ${position}`}
              </span>
              <span className="font-mono text-code text-slate uppercase">JPG, PNG or WebP</span>
              {editable ? pickInput : null}
            </label>
          );
        })}
      </div>
    </section>
  );
}
