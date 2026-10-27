import { SOCIAL_CHANNEL_LABELS, SOCIAL_CHANNEL_POSTS, type PlacementChannel } from './constants.ts';
import { formatMoney } from './money.ts';

// How a package is described to customers (VERBAL_SYSTEM.md §4.4, §21): price, tax, channels and
// timing together, worded the same on the site, the app, checkout and the delivery report.
// Prices are GST-inclusive (client decision, 2026-10-06), so the price line says so.

export interface OfferPackage {
  priceInrPaise: number;
  portalCount: number;
  includesInstagram: boolean;
  includesFacebook: boolean;
  turnaroundHours: number;
}

/** "₹499, GST included" */
export function offerPrice(pkg: Pick<OfferPackage, 'priceInrPaise'>): string {
  return `${formatMoney(pkg.priceInrPaise)}, GST included`;
}

/** The social channels a package posts on, in display order: ["instagram", "facebook"] */
export function offerSocialChannels(
  pkg: Pick<OfferPackage, 'includesInstagram' | 'includesFacebook'>,
): Exclude<PlacementChannel, 'portal'>[] {
  return [
    ...(pkg.includesInstagram ? (['instagram'] as const) : []),
    ...(pkg.includesFacebook ? (['facebook'] as const) : []),
  ];
}

/** ["5 news portals", "1 Instagram collaboration post", "1 Facebook page post"] */
export function offerChannels(pkg: OfferPackage): string[] {
  return [
    ...(pkg.portalCount
      ? [`${pkg.portalCount} news portal${pkg.portalCount === 1 ? '' : 's'}`]
      : []),
    ...offerSocialChannels(pkg).map(
      (c) => `1 ${SOCIAL_CHANNEL_LABELS[c]} ${SOCIAL_CHANNEL_POSTS[c].toLowerCase()}`,
    ),
  ];
}

/** "5 news portals, 1 Instagram collaboration post and 1 Facebook page post" */
export function offerChannelsSentence(pkg: OfferPackage): string {
  const parts = offerChannels(pkg);
  return parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
    : (parts[0] ?? '');
}

/**
 * The price line (VERBAL_SYSTEM.md §23, GST-inclusive):
 * "Publish on 5 news portals, 1 Instagram collaboration post and 1 Facebook page post for ₹499, GST included."
 */
export function offerLine(pkg: OfferPackage): string {
  return `Publish on ${offerChannelsSentence(pkg)} for ${offerPrice(pkg)}.`;
}
