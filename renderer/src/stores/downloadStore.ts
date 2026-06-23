import { create } from 'zustand';
import type { Task } from '@/types';

interface DownloadStore {
  tasks: Record<string, Task>;
  activeUrl: string | null;
  isDownloading: boolean;
  setTask: (task: Task) => void;
  setAllTasks: (tasks: Task[]) => void;
  removeTask: (url: string) => void;
  clearTasks: () => void;
  setActiveUrl: (url: string | null) => void;
  setIsDownloading: (v: boolean) => void;
  getAllTasks: () => Task[];
  updateTask: (url: string, updates: Partial<Task>) => void;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  tasks: {},
  activeUrl: null,
  isDownloading: false,
  setTask: (task) =>
    set((s) => {
      const key = task.id || task.url;
      return { tasks: { ...s.tasks, [key]: task } };
    }),
  setAllTasks: (tasks) =>
    set({ tasks: Object.fromEntries(tasks.map((t) => [t.id || t.url, t])) }),
  removeTask: (key) =>
    set((s) => {
      const { [key]: _, ...rest } = s.tasks;
      return { tasks: rest };
    }),
  clearTasks: () => set({ tasks: {} }),
  setActiveUrl: (url) => set({ activeUrl: url }),
  setIsDownloading: (isDownloading) => set({ isDownloading }),
  getAllTasks: () => Object.values(get().tasks),
  updateTask: (key, updates) =>
    set((s) => {
      const existing = s.tasks[key];
      if (!existing) return s;
      return { tasks: { ...s.tasks, [key]: { ...existing, ...updates } } };
    }),
}));
