import { useCallback } from 'react';
import { ipcService } from '@/services/ipcService';
import { useDownloadStore } from '@/stores/downloadStore';
import type { QueueResult } from '@/types';

export function useQueue() {
  const setAllTasks = useDownloadStore((s) => s.setAllTasks);
  const removeTaskUrl = useDownloadStore((s) => s.removeTask);
  const clearTasks = useDownloadStore((s) => s.clearTasks);

  const loadQueue = useCallback(async () => {
    try {
      const tasks = await ipcService.queueGet();
      setAllTasks(tasks);
    } catch (_err) {
      // ignore
    }
  }, [setAllTasks]);

  const addToQueue = useCallback(async (urls: string[], options?: { format?: string; quality?: string; startTime?: string; endTime?: string }): Promise<QueueResult> => {
    const res = await ipcService.queueAdd(urls, options);
    await loadQueue();
    return res;
  }, [loadQueue]);

  const removeFromQueue = useCallback(async (key: string) => {
    await ipcService.queueRemove(key);
    removeTaskUrl(key);
  }, [removeTaskUrl]);

  const clearQueue = useCallback(async () => {
    await ipcService.queueClear();
    clearTasks();
  }, [clearTasks]);

  const startQueue = useCallback(async () => {
    return ipcService.queueStart();
  }, []);

  return {
    loadQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    startQueue,
  };
}
