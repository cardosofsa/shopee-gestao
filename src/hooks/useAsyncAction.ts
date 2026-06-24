import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Wraps an async function with managed loading state.
 * Prevents concurrent calls while in-flight.
 * Uses a layout-effect ref sync so callers can pass inline functions
 * without causing `run` to be recreated on every render.
 */
export function useAsyncAction<T = void>(
  fn: () => Promise<T>
): [run: () => Promise<T | undefined>, loading: boolean] {
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const fnRef = useRef(fn);

  // Sync ref in layout effect (synchronous, before paint — no stale-closure window)
  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(async (): Promise<T | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setLoading(true);
    try {
      return await fnRef.current();
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  return [run, loading];
}
