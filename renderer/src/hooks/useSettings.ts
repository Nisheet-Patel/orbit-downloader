import { useCallback } from 'react';
import { ipcService } from '@/services/ipcService';
import { useAppStore } from '@/stores/appStore';
import type { Settings } from '@/types';

export function useSettings() {
  const settings = useAppStore((s) => s.settings as Settings);
  const setStoreSettings = useAppStore((s) => s.setSettings);
  const isLoading = useAppStore((s) => s.isLoadingSettings);
  const setIsLoading = useAppStore((s) => s.setIsLoadingSettings);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ipcService.getSettings();
      setStoreSettings(data);
      return data;
    } catch (err) {
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [setStoreSettings, setIsLoading]);

  const saveSettings = useCallback(async (partial: Partial<Settings>) => {
    try {
      const result = await ipcService.saveSettings(partial);
      if (result.success && result.settings) {
        setStoreSettings(result.settings);
      }
      return result;
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }, [setStoreSettings]);

  return { settings, isLoading, loadSettings, saveSettings };
}
