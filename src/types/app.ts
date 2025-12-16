// Dummy export to ensure this file is treated as a module with runtime presence if needed
export const TYPES = true;

export interface GameHeader {
  Event: string;
  Site: string;
  Date: string;
  Round: string;
  White: string;
  Black: string;
  Result: string;
  pgn: string;
  [key: string]: string;
}

export interface EngineMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  githubRepo?: string;
  githubReleaseTag?: string;
  githubAssetPatterns?: {
    [osAndArch: string]: string;
  };
  executableName: string;
  isArchived: boolean;
}

export interface DatabaseEntry {
  id: string;
  name: string;
  path: string;
  gameCount: number;
  lastModified: number;
}

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
<<<<<<< HEAD
=======
  getInstalledEngines: () => Promise<{ name: string; path: string }[]>;
>>>>>>> bug/engine-manager-fix

  // Database & Persistent Lichess
  lichessDownloadBackground: (username: string, filters: LichessGameFilter) => Promise<DatabaseEntry>;
  onLichessDownloadComplete: (callback: (db: DatabaseEntry) => void) => void;
  onLichessDownloadError: (callback: (data: { id: string, error: string }) => void) => void;
  
  dbGetList: () => Promise<DatabaseEntry[]>;
  dbCreate: (name: string) => Promise<DatabaseEntry>;
  dbImport: () => Promise<DatabaseEntry | null>;
  dbLoadGames: (id: string) => Promise<GameHeader[]>;
  dbAddGame: (id: string, pgn: string) => Promise<void>;
}
