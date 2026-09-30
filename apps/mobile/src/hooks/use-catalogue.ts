import { fetchCatalogue } from '@prapp/api-client';
import { supabase } from '@/lib/supabase';
import { useFocusedData } from './use-async';

export function useCatalogue() {
  return useFocusedData(() => fetchCatalogue(supabase));
}
