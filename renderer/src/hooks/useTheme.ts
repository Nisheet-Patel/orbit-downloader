import { useAppStore } from '@/stores/appStore';
import { ipcService } from '@/services/ipcService';
import type { Theme } from '@/types';

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const setAppStoreTheme = useAppStore((s) => s.setTheme);

  const setTheme = async (t: Theme) => {
    setAppStoreTheme(t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    await ipcService.saveSettings({ theme: t }).catch(() => {});
  };

  return { theme, setTheme };
}
