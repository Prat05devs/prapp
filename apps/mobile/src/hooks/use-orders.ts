import { listMyOrders } from '@prapp/api-client';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useFocusedData } from './use-async';

export function useOrders() {
  const { me } = useAuth();
  return useFocusedData(
    () => (me ? listMyOrders(supabase, me.id) : Promise.resolve([])),
    me?.id ?? '',
  );
}
