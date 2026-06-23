import { useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { StatusBar } from '@/components/layout/StatusBar'
import { SingleDownload } from '@/components/views/SingleDownload'
import { BulkDownload } from '@/components/views/BulkDownload'
import { SettingsPage } from '@/components/views/SettingsPage'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { useAppStore } from '@/stores/appStore'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'
import { useWindowControls } from '@/hooks/useWindowControls'
import { useQueue } from '@/hooks/useQueue'
import { ipcService } from '@/services/ipcService'
import { useDownloadStore } from '@/stores/downloadStore'
import { validateYoutubeUrl } from '@/utils/validators'
import type { Task } from '@/types'

export function App() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const { loadSettings } = useSettings()
  const { setTheme } = useTheme()
  const { getVersion } = useWindowControls()
  const setAppVersion = useAppStore((s) => s.setAppVersion)
  const { loadQueue } = useQueue()

  useEffect(() => {
    loadSettings().then((settings) => {
      if (settings?.theme) {
        setTheme(settings.theme)
      }
    })
    getVersion().then((v) => setAppVersion(v))
    loadQueue()
  }, [loadQueue])

  // Global drag-and-drop URL handling
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const text = e.dataTransfer?.getData('text') || '';
      if (text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex);
        if (matches && matches.length > 0) {
          const ytUrls = matches.filter(url => validateYoutubeUrl(url));
          if (ytUrls.length > 0) {
            window.dispatchEvent(new CustomEvent('orbit:url-dropped', { detail: { urls: ytUrls } }));
          }
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Setup global IPC progress/update listeners
  useEffect(() => {
    const removeProgress = ipcService.onQueueProgress((data) => {
      const key = data.id || data.url;
      if (!key) return;
      useDownloadStore.getState().updateTask(key, {
        status: data.status as Task['status'],
        progress: data.progress,
        speed: data.speed,
      });
    });

    const removeTaskUpdate = ipcService.onQueueTaskUpdated((data) => {
      const key = data.id || data.url;
      if (!key) return;
      useDownloadStore.getState().updateTask(key, data as Task);
    });

    return () => {
      removeProgress();
      removeTaskUpdate();
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        setMode(mode === 'single' ? 'bulk' : 'single');
      } else if (e.ctrlKey && (e.key === ',' || e.key === 'Comma')) {
        e.preventDefault();
        setMode('settings');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, setMode]);

  return (
    <div className="h-screen w-screen grid grid-rows-[56px_1fr_36px] grid-cols-1 overflow-hidden bg-[var(--color-bg)]">
      <div className="row-start-1 row-end-2">
        <TopBar />
      </div>
      <main className="row-start-2 row-end-3 bg-[var(--color-bg)] p-4 sm:p-6 md:p-8 overflow-hidden relative">
        <div className={`h-full min-h-0 ${mode === 'single' ? 'animate-panel-in' : ''}`}>
          {mode === 'single' && <SingleDownload />}
          {mode === 'bulk' && <BulkDownload />}
          {mode === 'settings' && <SettingsPage />}
        </div>
      </main>
      <div className="row-start-3 row-end-4">
        <StatusBar />
      </div>
      <ToastContainer />
    </div>
  );
}
