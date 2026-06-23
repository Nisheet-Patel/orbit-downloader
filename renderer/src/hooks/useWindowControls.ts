import { ipcService } from '@/services/ipcService';

export function useWindowControls() {
  const minimize = () => ipcService.windowMinimize();
  const maximize = () => ipcService.windowMaximize();
  const close = () => ipcService.windowClose();
  const openFolder = () => ipcService.folderOpen();
  const chooseFolder = () => ipcService.chooseDownloadFolder();
  const getVersion = () => ipcService.getVersion();

  return { minimize, maximize, close, openFolder, chooseFolder, getVersion };
}
