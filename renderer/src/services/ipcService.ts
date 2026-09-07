import type { Settings, Task, QueueProgress, DependencyInfo } from '@/types';

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
  updateYtDlp = () => this.orbit.updateYtDlp();
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
  getDependencyStatus = () => this.orbit.getDependencyStatus();
  downloadDependency = (id: string) => this.orbit.downloadDependency(id);
  downloadAllDependencies = () => this.orbit.downloadAllDependencies();
  checkUpdates = () => this.orbit.checkUpdates();
  downloadUpdate = () => this.orbit.downloadUpdate();
  installUpdate = () => this.orbit.installUpdate();
  windowMinimize = () => this.orbit.windowMinimize();
  windowMaximize = () => this.orbit.windowMaximize();
  windowClose = () => this.orbit.windowClose();
  onQueueProgress = (callback: (data: QueueProgress) => void): (() => void) =>
    this.orbit.onQueueProgress(callback);
  onQueueTaskUpdated = (callback: (data: Partial<Task> & { id?: string; url: string }) => void): (() => void) =>
    this.orbit.onQueueTaskUpdated(callback);
  onQueueReloadNeeded = (callback: () => void): (() => void) =>
    this.orbit.onQueueReloadNeeded(callback);
  onDependencyStatusChange = (callback: (data: DependencyInfo) => void): (() => void) =>
    this.orbit.onDependencyStatusChange(callback);
  onUpdateStatusChange = (callback: (data: { event: string; version?: string; error?: string; percent?: number; bytesPerSecond?: number; transferred?: number; total?: number }) => void): (() => void) =>
    this.orbit.onUpdateStatusChange(callback);
}

export const ipcService = new IPCService();
