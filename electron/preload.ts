// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title: string) => ipcRenderer.send('set-title', title),
  openPgnFile: () => ipcRenderer.invoke('open-pgn-file'),
  savePgnFile: (pgnContent: string) => ipcRenderer.invoke('save-pgn-file', pgnContent),
  startEngine: () => ipcRenderer.invoke('start-engine'),
  stopEngine: () => ipcRenderer.invoke('stop-engine'),
  sendUciCommand: (command: string) => ipcRenderer.invoke('send-uci-command', command),
  onEngineAnalysisUpdate: (callback: (output: string) => void) => {
    ipcRenderer.on('engine-analysis-update', (event, output) => callback(output));
  },
  getGameHeaders: () => ipcRenderer.invoke('get-game-headers'),
  fetchLichessGames: (username: string, filters: any) => ipcRenderer.invoke('fetch-lichess-games', username, filters),
  selectEngine: () => ipcRenderer.invoke('select-engine'),
  getEnginePath: () => ipcRenderer.invoke('get-engine-path'),
  getBasename: (filePath: string) => ipcRenderer.invoke('get-basename', filePath),
  getAvailableEngines: () => ipcRenderer.invoke('get-available-engines'),
  downloadEngine: (engineId: string) => ipcRenderer.invoke('download-engine', engineId),
  onEngineDownloadProgress: (callback: (data: { engineId: string, progress: number }) => void) => {
    ipcRenderer.on('engine-download-progress', (event, data) => callback(data));
  },
  onEngineDownloadStatus: (callback: (data: { engineId: string, status: string }) => void) => {
    ipcRenderer.on('engine-download-status', (event, data) => callback(data));
  },
  onEngineDownloadError: (callback: (data: { engineId: string, error: string }) => void) => {
    ipcRenderer.on('engine-download-error', (event, data) => callback(data));
  },
  getInstalledEngines: () => ipcRenderer.invoke('get-installed-engines'),

  // Database & Persistent Lichess
  lichessDownloadBackground: (username: string, filters: any) => ipcRenderer.invoke('lichess-download-background', username, filters),
  onLichessDownloadComplete: (callback: (db: any) => void) => {
    ipcRenderer.on('lichess-download-complete', (event, db) => callback(db));
  },
  onLichessDownloadError: (callback: (data: { id: string, error: string }) => void) => {
    ipcRenderer.on('lichess-download-error', (event, data) => callback(data));
  },
  
  dbGetList: () => ipcRenderer.invoke('db-get-list'),
  dbCreate: (name: string) => ipcRenderer.invoke('db-create', name),
  dbImport: () => ipcRenderer.invoke('db-import'),
  dbLoadGames: (id: string) => ipcRenderer.invoke('db-load-games', id),
  dbAddGame: (id: string, pgn: string) => ipcRenderer.invoke('db-add-game', id, pgn),
  dbDelete: (id: string) => ipcRenderer.invoke('db-delete', id),
  dbSearch: (dbIds: string[], moves: string[]) => ipcRenderer.invoke('db-search', dbIds, moves),
});
