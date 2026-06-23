import { useState, useCallback, useEffect } from 'react'
import { ipcService } from '@/services/ipcService'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/stores/appStore'
import { useToastStore } from '@/stores/toastStore'
import type { Settings } from '@/types'

export function SettingsModal() {
  const isOpen = useAppStore((s) => s.settingsModalOpen)
  const close = useAppStore((s) => s.closeSettingsModal)
  const addToast = useToastStore((s) => s.addToast)
  const [settings, setLocalSettings] = useState<Partial<Settings>>({})
  const [ffmpegValid, setFfmpegValid] = useState<'neutral' | 'success' | 'error'>('neutral')
  const [ytdlpValid, setYtdlpValid] = useState<'neutral' | 'success' | 'error'>('neutral')

  const load = useCallback(async () => {
    try {
      const s = await ipcService.getSettings()
      setLocalSettings(s)
      // Auto-validate on modal open
      if (s.ffmpegLocation) {
        ipcService.resolveFfmpeg(s.ffmpegLocation).then(res => setFfmpegValid(res.ok ? 'success' : 'error')).catch(() => setFfmpegValid('error'));
      } else {
        ipcService.resolveFfmpeg('').then(res => setFfmpegValid(res.ok ? 'success' : 'error')).catch(() => setFfmpegValid('error'));
      }

      if (s.ytdlpLocation) {
        ipcService.validateYtDlp(s.ytdlpLocation).then(res => setYtdlpValid(res.valid ? 'success' : 'error')).catch(() => setYtdlpValid('error'));
      } else {
        ipcService.ensureYtDlp().then(res => setYtdlpValid(res.ok ? 'success' : 'error')).catch(() => setYtdlpValid('error'));
      }
    } catch {
      addToast('error', 'Failed to load settings')
    }
  }, [addToast])

  useEffect(() => {
    if (isOpen) {
      load()
    }
  }, [isOpen, load])

  const browse = async () => {
    try {
      const path = await ipcService.chooseDownloadFolder()
      if (path) setLocalSettings((prev) => ({ ...prev, downloadLocation: path }))
    } catch {
      addToast('error', 'Failed to open folder picker')
    }
  }

  const save = async () => {
    try {
      const result = await ipcService.saveSettings(settings)
      if (result.success) {
        addToast('success', 'Settings saved')
        close()
      } else {
        addToast('error', result.error || 'Failed to save settings')
      }
    } catch {
      addToast('error', 'Failed to save settings')
    }
  }

  const validateFfmpeg = async () => {
    setFfmpegValid('neutral')
    try {
      const res = await ipcService.resolveFfmpeg(settings.ffmpegLocation || '')
      setFfmpegValid(res.ok ? 'success' : 'error')
    } catch {
      setFfmpegValid('error')
    }
  }

  const validateYtdlp = async () => {
    setYtdlpValid('neutral')
    try {
      const path = settings.ytdlpLocation || '';
      if (!path) {
        const res = await ipcService.ensureYtDlp();
        setYtdlpValid(res.ok ? 'success' : 'error');
      } else {
        const res = await ipcService.validateYtDlp(path);
        setYtdlpValid(res.valid ? 'success' : 'error');
      }
    } catch {
      setYtdlpValid('error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={close}>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] m-0">Settings</h2>
      <div className="mt-6 space-y-5">
        <div className="pb-5 border-b border-[var(--color-border)]">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Download Location</label>
          <div className="flex gap-2 items-center">
            <input type="text" value={settings.downloadLocation || ''} readOnly onChange={(e) => setLocalSettings((p) => ({ ...p, downloadLocation: e.target.value }))} className="flex-1 h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 text-sm text-[var(--color-text-primary)] outline-none" />
            <button onClick={browse} className="h-10 px-4 rounded-md text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer border-0">Browse</button>
          </div>
        </div>
        <div className="pb-5 border-b border-[var(--color-border)]">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Max Parallel Downloads</label>
          <div className="flex items-center gap-4">
            <input type="range" min={1} max={10} value={settings.maxParallelDownloads || 3} onChange={(e) => setLocalSettings((p) => ({ ...p, maxParallelDownloads: Number(e.target.value) }))} className="flex-1 h-2 bg-[var(--color-border)] rounded-full appearance-none outline-none cursor-pointer accent-[var(--color-accent-red)]" />
            <span className="text-base font-semibold text-[var(--color-accent-red)] min-w-[1.5rem] text-center">{settings.maxParallelDownloads || 3}</span>
          </div>
        </div>
        <div className="pb-5 border-b border-[var(--color-border)]">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Cookies from Browser</label>
          <select value={settings.cookiesFromBrowser || ''} onChange={(e) => setLocalSettings((p) => ({ ...p, cookiesFromBrowser: e.target.value }))} className="w-full h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 text-sm text-[var(--color-text-primary)] outline-none appearance-none cursor-pointer">
            <option value="">None</option>
            <option value="chrome">Chrome</option>
            <option value="firefox">Firefox</option>
            <option value="edge">Edge</option>
          </select>
        </div>
        <div className="pb-5 border-b border-[var(--color-border)]">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">FFmpeg Location</label>
          <div className="flex gap-2 items-center">
            <input type="text" value={settings.ffmpegLocation || ''} onChange={(e) => setLocalSettings((p) => ({ ...p, ffmpegLocation: e.target.value }))} className="flex-1 h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 text-sm text-[var(--color-text-primary)] outline-none" placeholder="Leave empty for auto-resolution..." />
            <button onClick={validateFfmpeg} className="h-10 px-4 rounded-md text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">Validate</button>
          </div>
          <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            ffmpegValid === 'success' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
            ffmpegValid === 'error' ? 'bg-[rgba(232,0,42,0.08)] text-[var(--color-error)]' :
            'bg-[rgba(0,0,0,0.04)] text-[var(--color-text-disabled)]'
          }`}>
            <span className="text-[11px]">●</span>
            <span>{ffmpegValid === 'success' ? 'FFmpeg found' : ffmpegValid === 'error' ? 'FFmpeg not found' : 'Checking...'}</span>
          </div>
        </div>
        <div className="pb-5">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">yt-dlp Location</label>
          <div className="flex gap-2 items-center">
            <input type="text" value={settings.ytdlpLocation || ''} onChange={(e) => setLocalSettings((p) => ({ ...p, ytdlpLocation: e.target.value }))} className="flex-1 h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 text-sm text-[var(--color-text-primary)] outline-none" placeholder="Leave empty for auto-resolution..." />
            <button onClick={validateYtdlp} className="h-10 px-4 rounded-md text-sm font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">Validate</button>
          </div>
          <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            ytdlpValid === 'success' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
            ytdlpValid === 'error' ? 'bg-[rgba(232,0,42,0.08)] text-[var(--color-error)]' :
            'bg-[rgba(0,0,0,0.04)] text-[var(--color-text-disabled)]'
          }`}>
            <span className="text-[11px]">●</span>
            <span>{ytdlpValid === 'success' ? 'yt-dlp found' : ytdlpValid === 'error' ? 'yt-dlp not found' : 'Checking...'}</span>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={save} className="h-10 px-4 rounded-md text-sm font-semibold bg-[var(--color-accent-red)] text-white hover:bg-[var(--color-accent-red-hover)] transition-colors cursor-pointer border-0">Save Settings</button>
        </div>
      </div>
    </Modal>
  )
}
