import { ReactNode } from 'react';

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
  isPlaylist?: boolean;
  videoIds?: string[];
  playlistId?: string;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: ReactNode;
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
  error?: string;
}

export interface QueueProgress {
  id?: string;
  url: string;
  status: TaskStatus;
  progress: number;
  speed: string;
}

export type DependencyStatus = 'installed' | 'missing' | 'downloading' | 'failed';

export interface DependencyInfo {
  id: string;
  name: string;
  exeName: string;
  url: string;
  status: DependencyStatus;
  progress: number;
  error?: string | null;
}

export interface WindowOrbitAPI {
  getSettings: () => Promise<Settings>;
  saveSettings: (partial: Partial<Settings>) => Promise<{ success: boolean; error?: string; settings?: Settings }>;
  validateFfmpeg: (path: string) => Promise<ValidationResult>;
  resolveFfmpeg: (path: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  validateYtDlp: (path: string) => Promise<ValidationResult>;
  ensureYtDlp: () => Promise<{ ok: boolean; path?: string; source?: string; error?: string }>;
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
  getDependencyStatus: () => Promise<Record<string, DependencyInfo>>;
  downloadDependency: (id: string) => Promise<{ success: boolean; error?: string }>;
  downloadAllDependencies: () => Promise<Record<string, 'installed' | 'missing'>>;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  onQueueProgress: (callback: (data: QueueProgress) => void) => (() => void);
  onQueueTaskUpdated: (callback: (data: Partial<Task> & { url: string }) => void) => (() => void);
  onQueueReloadNeeded: (callback: () => void) => (() => void);
  onDependencyStatusChange: (callback: (data: DependencyInfo) => void) => (() => void);
}

declare global {
  interface Window {
    orbit: WindowOrbitAPI;
    __orbit_preload_ready__?: boolean;
    __orbit_preload_error__?: string;
  }
}
