import Image from 'next/image';
import type { Campaign } from '@prapp/shared';

export function CampaignImage({
  campaign,
  sizes = '(max-width: 767px) 100vw, 50vw',
}: {
  campaign: Campaign;
  sizes?: string;
}) {
  return (
    <Image
      src={`/images/campaigns/${campaign.id}.webp`}
      alt={campaign.alt}
      width={1600}
      height={900}
      sizes={sizes}
      className="aspect-video h-auto w-full rounded-md object-contain"
    />
  );
}
