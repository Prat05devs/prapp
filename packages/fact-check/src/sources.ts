import type { SourceTier } from '../../shared/src/constants.ts';

export type TrustedSources = Map<string, SourceTier>;

/**
 * Tier for a domain from trusted_sources (exact or parent domain match).
 * DECISION: any *.gov.in / *.nic.in host counts as tier1 (government), as the seed intends.
 */
export function tierFor(domain: string | null, trusted: TrustedSources): SourceTier {
  if (!domain) return 'unknown';
  const host = domain.toLowerCase().replace(/^www\./, '');
  const labels = host.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const tier = trusted.get(labels.slice(i).join('.'));
    if (tier) return tier;
  }
  if (/\.(gov|nic)\.in$/.test(host)) return 'tier1';
  return 'unknown';
}

export const TIER_RANK: Record<SourceTier, number> = { tier1: 2, tier2: 1, unknown: 0 };
