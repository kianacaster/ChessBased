// src/global.d.ts
import { GameHeader } from '../electron/db/Database'; // Import GameHeader

export interface IElectronAPI {
  openPgnFile: () => Promise<string | null>;
  savePgnFile: (pgnContent: string) => Promise<string | null>;
  startEngine: () => Promise<boolean>;
  stopEngine: () => void;
  sendUciCommand: (command: string) => Promise<string | null>;
  onEngineAnalysisUpdate: (callback: (output: string) => void) => void;
  getGameHeaders: () => Promise<GameHeader[]>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
