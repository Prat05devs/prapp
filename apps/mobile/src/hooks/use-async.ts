import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data when the screen gains focus (and on pull-to-refresh). `key` identifies the
 * query (e.g. the order id); when it changes, the next focus/refresh loads the new data.
 * `load` is told whether the user asked for fresh data (`force`), so a cached loader can
 * answer focus reloads from its cache.
 */
export function useFocusedData<T>(load: (opts: { force: boolean }) => Promise<T>, key = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const run = useCallback(async (force: boolean) => {
    setLoading(true);
    try {
      setData(await loadRef.current({ force }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    // `key` is a dependency so a new query (another order id) reloads on the next focus
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => void run(false), [run, key]),
  );
  const refresh = useCallback(() => run(true), [run]);

  return { data, error, loading, refresh, setData };
}
