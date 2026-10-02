import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useFocusedData } from './use-async';

export function useOrders() {
  const { me } = useAuth();
  return useFocusedData(() => (me ? api.orders.list() : Promise.resolve([])), me?.id ?? '');
}
