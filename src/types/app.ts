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
  getInstalledEngines: () => Promise<{ name: string; path: string }[]>;

  // Database & Persistent Lichess
  lichessDownloadBackground: (username: string, filters: LichessGameFilter) => Promise<DatabaseEntry>;
  onLichessDownloadComplete: (callback: (db: DatabaseEntry) => void) => void;
  onLichessDownloadError: (callback: (data: { id: string, error: string }) => void) => void;
  
  dbGetList: () => Promise<DatabaseEntry[]>;
  dbCreate: (name: string) => Promise<DatabaseEntry>;
  dbImport: () => Promise<DatabaseEntry | null>;
  dbLoadGames: (id: string) => Promise<GameHeader[]>;
  dbAddGame: (id: string, pgn: string) => Promise<void>;
  dbDelete: (id: string) => Promise<void>;
  dbSearch: (dbIds: string[], moves: string[]) => Promise<ExplorerResult>;
  dbCompare: (dbIdsA: string[], dbIdsB: string[], moves: string[]) => Promise<PrepScenario[]>;
  dbGetPrepScenarios: (dbIdsA: string[], dbIdsB: string[], moves: string[], limit: number) => Promise<PrepScenario[]>;
  extractPgnHeaders: (pgnContent: string) => Promise<GameHeader | null>;
  
  // Public Databases
  getPublicDatabases: () => Promise<PublicDatabaseMetadata[]>;
  downloadPublicDatabase: (dbId: string) => Promise<boolean>;
  onPublicDbDownloadProgress: (callback: (data: { dbId: string, progress: number }) => void) => void;
  onPublicDbDownloadStatus: (callback: (data: { dbId: string, status: string }) => void) => void;
  onPublicDbDownloadError: (callback: (data: { dbId: string, error: string }) => void) => void;
}

export interface PublicDatabaseMetadata {
  id: string;
  name: string;
  description: string;
  url: string;
  size: string;
  source: string;
  credit: string;
  category: 'players' | 'masters' | 'engines';
}

export interface ExplorerMoveStats {
  san: string;
  white: number;
  draw: number;
  black: number;
  total: number;
}

export interface ExplorerResult {
  games: GameHeader[]; // Recent games or top games
  moves: ExplorerMoveStats[];
  totalGames: number;
  whiteWinPercent: number;
  drawPercent: number;
  blackWinPercent: number;
}

export interface PrepComparisonResult {
  statsA: ExplorerResult;
  statsB: ExplorerResult;
  // Merged move list for easy rendering
  moves: {
    san: string;
    statsA?: ExplorerMoveStats;
    statsB?: ExplorerMoveStats;
  }[];
}

export interface PrepScenario {
  line: string[]; // Sequence of moves from root
  probability: number; // 0-1
  heroStats: { w: number, d: number, b: number, total: number, exampleGame?: string | null }; 
  // Actually, hero stats usually matter for the *result* of the line.
  opponentStats: { w: number, d: number, b: number, total: number };
}
