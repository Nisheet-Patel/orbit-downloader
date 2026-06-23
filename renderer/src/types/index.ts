// Types
export type AppMode = 'single' | 'bulk' | 'settings';
export type Theme = 'light' | 'dark';
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Settings {
  downloadLocation: string;
  audioQuality: string;
  maxParallelDownloads: number;
  ffmpegLocation: string;
  ytdlpLocation: string;
  theme: Theme;
  lastFormat: 'video' | 'audio';
  lastVideoQuality: string;
  lastAudioQuality: string;
  cookiesFromBrowser: string;
}

export type TaskStatus =
  | 'pending'
  | 'waiting'
  | 'extracting_info'
  | 'downloading'
  | 'converting'
  | 'paused'
  | 'completed'
  | 'already_exists'
  | 'error';

export interface Task {
  id?: string;
  url: string;
  title: string;
  status: TaskStatus;
  progress: number;
  speed: string;
  duration: number;
  errorMessage: string;
  filePath: string;
  format: 'video' | 'audio';
  quality: string;
  thumbnailUrl?: string;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  version?: string;
  reason?: string;
  path?: string;
}

export interface Metadata {
  title: string;
  duration: number;
  uploader: string;
  viewCount: number;
  thumbnailUrl: string;
}

export interface QueueResult {
  added: string[];
  duplicates: string[];
  invalid: string[];
}

export interface QueueProgress {
  id?: string;
  url: string;
  status: TaskStatus;
  progress: number;
  speed: string;
}

export interface WindowOrbitAPI {
  getSettings: () => Promise<Settings>;
  saveSettings: (partial: Partial<Settings>) => Promise<{ success: boolean; error?: string; settings?: Settings }>;
  validateFfmpeg: (path: string) => Promise<ValidationResult>;
  resolveFfmpeg: (path: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  validateYtDlp: (path: string) => Promise<ValidationResult>;
  ensureYtDlp: () => Promise<{ ok: boolean; source?: string; error?: string }>;
  chooseDownloadFolder: () => Promise<string | null>;
  queueAdd: (urls: string[], options?: { format?: string; quality?: string }) => Promise<QueueResult>;
  queueRemove: (url: string) => Promise<{ success: boolean }>;
  queueClear: () => Promise<{ success: boolean }>;
  queueGet: () => Promise<Task[]>;
  queueStart: () => Promise<{ success: boolean; error?: string }>;
  folderOpen: () => Promise<{ success: boolean; error?: string }>;
  fetchMetadata: (url: string) => Promise<{ ok: boolean; title?: string; thumbnailUrl?: string; duration?: number; channel?: string; viewCount?: number; error?: string }>;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  getVersion: () => Promise<string>;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  onQueueProgress: (callback: (data: QueueProgress) => void) => (() => void);
  onQueueTaskUpdated: (callback: (data: Partial<Task> & { url: string }) => void) => (() => void);
}

declare global {
  interface Window {
    orbit: WindowOrbitAPI;
    __orbit_preload_ready__?: boolean;
    __orbit_preload_error__?: string;
  }
}
