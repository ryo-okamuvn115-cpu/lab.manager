import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDataOptions {
  refreshInterval?: number;
}

export function useData<T>(
  fetchFn: () => Promise<T>,
  options: UseDataOptions = {},
) {
  const { refreshInterval = 5000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!hasLoadedRef.current && mountedRef.current) {
      setLoading(true);
    }

    try {
      const result = await fetchFn();

      if (!mountedRef.current) {
        return;
      }

      setData(result);
      setError(null);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setError(error instanceof Error ? error : new Error('不明なエラーが発生しました。'));
    } finally {
      if (!mountedRef.current) {
        return;
      }

      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchData();
    }, refreshInterval);

    const handleFocus = () => {
      void fetchData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}
