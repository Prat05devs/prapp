'use client';

import { useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/icon';
import { Button, buttonVariants } from '@/components/ui';

const noSubscribe = () => () => {};

/** Mobile web: Web Share API. Desktop: copy link + download image / PDF (LLD §11.4). */
export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  // false on the server and during hydration, then the real value: avoids a hydration mismatch.
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === 'function',
    () => false,
  );
  return (
    <div className="flex flex-wrap gap-2">
      {canShare ? (
        <Button
          variant="accent"
          onClick={() => void navigator.share({ title, url }).catch(() => {})}
        >
          <Icon name="share" /> Share
        </Button>
      ) : null}
      <Button
        variant="outline"
        onClick={() =>
          void navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
      >
        <Icon name={copied ? 'check' : 'content_copy'} /> {copied ? 'Link copied' : 'Copy link'}
      </Button>
      <a className={buttonVariants({ variant: 'outline' })} href={`${url}/image.png`} download>
        <Icon name="image" /> Download image
      </a>
      <a
        className={buttonVariants({ variant: 'outline' })}
        href={`${url}/report.pdf`}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="picture_as_pdf" /> PDF
      </a>
    </div>
  );
}
