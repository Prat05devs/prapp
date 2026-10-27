import { describe, expect, it } from 'vitest';
import { offerChannels, offerLine, offerPrice } from './offer.ts';

const story = {
  priceInrPaise: 49900,
  portalCount: 5,
  includesInstagram: true,
  includesFacebook: true,
  turnaroundHours: 24,
};

describe('offer copy', () => {
  it('states the GST-inclusive price', () => {
    expect(offerPrice(story)).toBe('₹499, GST included');
  });
  it('lists every channel in the package', () => {
    expect(offerChannels(story)).toEqual([
      '5 news portals',
      '1 Instagram collaboration post',
      '1 Facebook page post',
    ]);
    expect(offerChannels({ ...story, portalCount: 1, includesFacebook: false })).toEqual([
      '1 news portal',
      '1 Instagram collaboration post',
    ]);
  });
  it('builds the price line', () => {
    expect(offerLine(story)).toBe(
      'Publish on 5 news portals, 1 Instagram collaboration post and 1 Facebook page post for ₹499, GST included.',
    );
  });
});
