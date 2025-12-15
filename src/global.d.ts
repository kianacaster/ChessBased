import type { IElectronAPI } from './types/app';

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
