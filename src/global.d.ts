// src/global.d.ts
import type { GameHeader } from '../electron/db/Database';
import type { EngineMetadata } from '../electron/engines/engine-metadata';

export interface LichessGameFilter {
  max?: number;
  rated?: boolean;
  perfType?: string;
  color?: 'white' | 'black';
  analysed?: boolean;
  tags?: boolean;
  clocks?: boolean;
  evals?: boolean;
  opening?: boolean;
}

export interface IElectronAPI {
  openPgnFile: () => Promise<string | null>;
  savePgnFile: (pgnContent: string) => Promise<string | null>;
  startEngine: () => Promise<boolean>;
  stopEngine: () => void;
  sendUciCommand: (command: string) => Promise<string | null>;
  onEngineAnalysisUpdate: (callback: (output: string) => void) => void;
  getGameHeaders: () => Promise<GameHeader[]>;
  fetchLichessGames: (username: string, filters: LichessGameFilter) => Promise<string>;
  selectEngine: () => Promise<string | null>;
  getEnginePath: () => Promise<string | null>;
  getBasename: (filePath: string) => Promise<string>;
  getAvailableEngines: () => Promise<EngineMetadata[]>;
  downloadEngine: (engineId: string) => Promise<string | null>;
  onEngineDownloadProgress: (callback: (data: { engineId: string, progress: number }) => void) => void;
  onEngineDownloadStatus: (callback: (data: { engineId: string, status: string }) => void) => void;
  onEngineDownloadError: (callback: (data: { engineId: string, error: string }) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}