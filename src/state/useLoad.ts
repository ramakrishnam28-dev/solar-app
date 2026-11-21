import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';

/** Loads data on mount and whenever deps change. Ignores answers that arrive late. */
export function useLoad<T>(fn: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (mode: 'load' | 'refresh') => {
    const id = ++seq.current;
    if (mode === 'load') setLoading(true); else setRefreshing(true);
    try {
      const d = await fnRef.current();
      if (id !== seq.current) return;
      setData(d); setError(null);
    } catch (e) {
      if (id !== seq.current) return;
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      if (id === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run('load'); }, deps);

  return { data, error, loading, refreshing, reload: () => run('load'), refresh: () => run('refresh') };
}
