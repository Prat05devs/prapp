/** Domain age via RDAP (https://rdap.org/domain/<domain>), LLD §11.2 step 1. */
export async function domainAgeDays(
  domain: string,
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<number | null> {
  // RDAP knows registrable domains: try the host, then drop leading labels.
  const labels = domain.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join('.');
    const res = await fetchImpl(`https://rdap.org/domain/${encodeURIComponent(candidate)}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) continue;
    if (!res.ok) return null;
    const json = (await res.json()) as { events?: { eventAction?: string; eventDate?: string }[] };
    const reg = json.events?.find((e) => e.eventAction === 'registration')?.eventDate;
    if (!reg) return null;
    return Math.max(0, Math.floor((now - new Date(reg).getTime()) / 86_400_000));
  }
  return null;
}
