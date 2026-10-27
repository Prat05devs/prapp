import { Image, type ImageSource } from 'expo-image';
import type { Campaign } from '@prapp/shared';

// Literal requires let Metro include these in the app, including offline installs.
const SOURCES: Record<Campaign['id'], ImageSource> = {
  '01-business-launch': require('../../assets/campaigns/01-business-launch.webp'),
  '02-cafe-event': require('../../assets/campaigns/02-cafe-event.webp'),
  '03-home-business': require('../../assets/campaigns/03-home-business.webp'),
  '04-citizen-story': require('../../assets/campaigns/04-citizen-story.webp'),
  '05-human-interest': require('../../assets/campaigns/05-human-interest.webp'),
  '06-family-fact-check': require('../../assets/campaigns/06-family-fact-check.webp'),
};

/** The bundled photo for a campaign scene (sliders take the source, not the image). */
export function campaignSource(id: Campaign['id']): ImageSource {
  return SOURCES[id];
}

export function CampaignImage({ campaign }: { campaign: Campaign }) {
  return (
    <Image
      source={SOURCES[campaign.id]}
      accessible
      accessibilityLabel={campaign.alt}
      contentFit="contain"
      style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }}
      accessibilityIgnoresInvertColors
    />
  );
}
