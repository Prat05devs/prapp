import { api } from '@/lib/api';
import { useFocusedData } from './use-async';

/** Packages, publicly listed portals and public settings (GET /api/catalogue). */
export function useCatalogue() {
  return useFocusedData(() => api.catalogue.get());
}
