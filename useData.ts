import { useState, useEffect, useCallback } from 'react';

interface UseDataOptions {
  refreshInterval?: number; // ミリ秒単位、デフォルト: 2000ms (2秒)
}

export function useData<T>(
  fetchFn: () => T,
  options: UseDataOptions = {}
) {
  const { refreshInterval = 2000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const result = fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  // 初回ロード
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 自動更新（ローカルストレージの変更を検知）
  useEffect(() => {
    const handleStorageChange = () => {
      fetchData();
    };

    // ローカルストレージの変更を監視
    window.addEventListener('storage', handleStorageChange);

    // 定期的に更新
    const interval = setInterval(fetchData, refreshInterval);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}
