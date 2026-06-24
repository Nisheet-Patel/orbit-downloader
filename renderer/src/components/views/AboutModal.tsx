import { useAppStore } from '@/stores/appStore'
import { Modal } from '@/components/ui/Modal'
import { ipcService } from '@/services/ipcService'

export function AboutModal() {
  const isOpen = useAppStore((s) => s.aboutModalOpen)
  const close = useAppStore((s) => s.closeAboutModal)
  const appVersion = useAppStore((s) => s.appVersion)

  return (
    <Modal isOpen={isOpen} onClose={close} className="text-center">
      <div className="flex flex-col items-center gap-4">
        <img src="./orbit-logo.svg" alt="Orbit" className="w-20 h-20" />
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">Orbit Downloader</h2>
        <p className="text-sm text-[var(--color-text-secondary)] m-0">A modern cross-platform media downloader supporting YouTube, Spotify, and other platforms.</p>
        <div className="w-full h-px bg-[var(--color-border)]" />
        <p className="text-sm text-[var(--color-text-primary)] m-0">
          <strong>Developer:</strong>{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              ipcService.openExternal('https://nisheetpatel.vercel.app/');
            }}
            className="text-[var(--color-accent-red)] no-underline font-medium hover:underline cursor-pointer"
          >
            Nisheet Patel
          </a>
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] m-0">
          <strong>Version:</strong> v{appVersion}
        </p>
        <p className="text-xs text-[var(--color-text-disabled)] mt-4 leading-relaxed">
          Powered by yt-dlp and FFmpeg.<br />All rights reserved.
        </p>
      </div>
    </Modal>
  )
}
