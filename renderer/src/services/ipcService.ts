import type { Settings, Task, QueueProgress } from '@/types';

class IPCService {
  private get orbit() {
    if (!window.orbit) {
      throw new Error('Orbit API is not available. The preload script might have failed to load.');
    }
    return window.orbit;
  }

  getSettings = () => this.orbit.getSettings();
  saveSettings = (partial: Partial<Settings>) => this.orbit.saveSettings(partial);
  validateFfmpeg = (path: string) => this.orbit.validateFfmpeg(path);
  resolveFfmpeg = (path: string) => this.orbit.resolveFfmpeg(path);
  validateYtDlp = (path: string) => this.orbit.validateYtDlp(path);
  ensureYtDlp = () => this.orbit.ensureYtDlp();
  chooseDownloadFolder = () => this.orbit.chooseDownloadFolder();
  queueAdd = (urls: string[], options?: { format?: string; quality?: string }) => this.orbit.queueAdd(urls, options);
  queueRemove = (url: string) => this.orbit.queueRemove(url);
  queueClear = () => this.orbit.queueClear();
  queueGet = () => this.orbit.queueGet();
  queueStart = () => this.orbit.queueStart();
  folderOpen = () => this.orbit.folderOpen();
  fetchMetadata = (url: string) => this.orbit.fetchMetadata(url);
  openExternal = (url: string) => this.orbit.openExternal(url);
  getVersion = () => this.orbit.getVersion();
  windowMinimize = () => this.orbit.windowMinimize();
  windowMaximize = () => this.orbit.windowMaximize();
  windowClose = () => this.orbit.windowClose();
  onQueueProgress = (callback: (data: QueueProgress) => void): (() => void) =>
    this.orbit.onQueueProgress(callback);
  onQueueTaskUpdated = (callback: (data: Partial<Task> & { id?: string; url: string }) => void): (() => void) =>
    this.orbit.onQueueTaskUpdated(callback);
}

export const ipcService = new IPCService();
