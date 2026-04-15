import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storageAPI } from '@/lib/api';
import type {
  InventoryItemDraft,
  LabSnapshot,
  OrderDraft,
  ProtocolDraft,
} from '@/lib/types';

function toError(error: unknown) {
  return error instanceof Error ? error : new Error('不明なエラーが発生しました。');
}

export function useLabManager(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<LabSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);

  const resetState = useCallback(() => {
    hasLoadedRef.current = false;
    setSnapshot(null);
    setLoading(false);
    setSaving(false);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      resetState();
      return;
    }

    if (!hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      const nextSnapshot = await storageAPI.getSnapshot();
      setSnapshot(nextSnapshot);
      setError(null);
      hasLoadedRef.current = true;
    } catch (error) {
      setError(toError(error));
    } finally {
      setLoading(false);
    }
  }, [enabled, resetState]);

  useEffect(() => {
    if (!enabled) {
      resetState();
      return;
    }

    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, 15000);

    const unsubscribe = storageAPI.subscribeToChanges(() => {
      void refresh();
    });

    const handleFocus = () => {
      void refresh();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refresh, resetState]);

  const runMutation = useCallback(
    async <T,>(callback: () => Promise<T>) => {
      setSaving(true);

      try {
        const result = await callback();
        await refresh();
        return result;
      } catch (error) {
        const nextError = toError(error);
        setError(nextError);
        throw nextError;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const actions = useMemo(
    () => ({
      createInventoryItem: (payload: InventoryItemDraft) =>
        runMutation(() => storageAPI.createInventoryItem(payload)),
      updateInventoryItem: (id: string, payload: InventoryItemDraft) =>
        runMutation(() => storageAPI.updateInventoryItem(id, payload)),
      deleteInventoryItem: (id: string) =>
        runMutation(() => storageAPI.deleteInventoryItem(id)),
      createOrder: (payload: OrderDraft) => runMutation(() => storageAPI.createOrder(payload)),
      updateOrder: (id: string, payload: OrderDraft) =>
        runMutation(() => storageAPI.updateOrder(id, payload)),
      deleteOrder: (id: string) => runMutation(() => storageAPI.deleteOrder(id)),
      createProtocol: (payload: ProtocolDraft) =>
        runMutation(() => storageAPI.createProtocol(payload)),
      updateProtocol: (id: string, payload: ProtocolDraft) =>
        runMutation(() => storageAPI.updateProtocol(id, payload)),
      deleteProtocol: (id: string) => runMutation(() => storageAPI.deleteProtocol(id)),
    }),
    [runMutation],
  );

  return {
    snapshot,
    loading,
    saving,
    error,
    refresh,
    ...actions,
  };
}
