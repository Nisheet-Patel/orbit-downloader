import { create } from 'zustand';
import type { AppMode, Theme, Settings } from '@/types';

interface AppStore {
  mode: AppMode;
  theme: Theme;
  settingsModalOpen: boolean;
  aboutModalOpen: boolean;
  settings: Partial<Settings>;
  isLoadingSettings: boolean;
  appVersion: string;
  setMode: (mode: AppMode) => void;
  setTheme: (theme: Theme) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openAboutModal: () => void;
  closeAboutModal: () => void;
  setSettings: (settings: Partial<Settings>) => void;
  setIsLoadingSettings: (v: boolean) => void;
  setAppVersion: (v: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  mode: 'single',
  theme: 'light',
  settingsModalOpen: false,
  aboutModalOpen: false,
  settings: {},
  isLoadingSettings: false,
  appVersion: '1.0.0',
  setMode: (mode) => set({ mode }),
  setTheme: (theme) => set({ theme }),
  openSettingsModal: () => set({ settingsModalOpen: true }),
  closeSettingsModal: () => set({ settingsModalOpen: false }),
  openAboutModal: () => set({ aboutModalOpen: true }),
  closeAboutModal: () => set({ aboutModalOpen: false }),
  setSettings: (settings) => set({ settings }),
  setIsLoadingSettings: (isLoadingSettings) => set({ isLoadingSettings }),
  setAppVersion: (appVersion) => set({ appVersion }),
}));
