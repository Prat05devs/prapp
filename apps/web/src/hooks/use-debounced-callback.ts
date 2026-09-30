'use client';

import { useEffect, useMemo, useRef } from 'react';

/** Returns a debounced version of `fn` (always calls the latest `fn`). */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
) {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => () => clearTimeout(timer.current), []);
  return useMemo(
    () => ({
      run: (...args: A) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => fnRef.current(...args), delayMs);
      },
      cancel: () => clearTimeout(timer.current),
    }),
    [delayMs],
  );
}
