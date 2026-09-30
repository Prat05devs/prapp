import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useFocusedData } from './use-async';

/**
 * GET /api/orders/:id, refreshed on focus. After a payment the app polls until the
 * webhook / reconciliation marks it paid (LLD §9.10 rows 3–4).
 */
export function useOrder(id: string, pollWhileUnpaid = false) {
  const state = useFocusedData(() => api.orders.get(id), id);
  const status = state.data?.order.status;
  const refresh = state.refresh;
  useEffect(() => {
    if (!pollWhileUnpaid || !status || !['pending_payment', 'expired', 'draft'].includes(status))
      return;
    const t = setInterval(() => void refresh(), 3000);
    const stop = setTimeout(() => clearInterval(t), 60_000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [pollWhileUnpaid, status, refresh]);
  return state;
}
