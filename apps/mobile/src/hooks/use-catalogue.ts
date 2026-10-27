import { api } from '@/lib/api';
import { useFocusedData } from './use-async';

/** How long a loaded catalogue is reused before a screen focus fetches it again. */
const FRESH_MS = 5 * 60_000;

type Catalogue = Awaited<ReturnType<typeof api.catalogue.get>>;

let cached: { data: Catalogue; at: number } | null = null;
let inflight: Promise<Catalogue> | null = null;

/**
 * The catalogue changes rarely and several screens show it (home, publish, edit, profile), so
 * they share one copy: reused for FRESH_MS, with concurrent loads merged into one request.
 * Pull-to-refresh always fetches a new one.
 */
function loadCatalogue(force: boolean): Promise<Catalogue> {
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.data);
  inflight ??= api.catalogue
    .get()
    .then((data) => {
      cached = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Packages, publicly listed portals, the showcase and public settings (GET /api/catalogue). */
export function useCatalogue() {
  return useFocusedData(({ force }) => loadCatalogue(force));
}
