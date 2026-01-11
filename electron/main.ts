import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { UciEngine } from './engine/UciEngine';
import { GameDatabase, GameHeader } from './db/Database';
import { LichessService, LichessGameFilter } from './lichess/LichessService';
import { loadConfig, saveConfig } from './config';
import { EngineDownloader } from './engines/EngineDownloader';
import { AVAILABLE_ENGINES } from './engines/engine-metadata';
import type { EngineMetadata } from './engines/engine-types';
import { DatabaseManager } from './db/DatabaseManager';
import { DatabaseDownloader } from './db/DatabaseDownloader';
import { PUBLIC_DATABASES } from './db/public-databases';

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let uciEngine: UciEngine;
let gameDatabase: GameDatabase;
let lichessService: LichessService;
let engineDownloader: EngineDownloader;
let databaseManager: DatabaseManager;
let databaseDownloader: DatabaseDownloader;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.on('ready', () => {
  createWindow();

  const config = loadConfig();
  const enginePath = config.enginePath || 'stockfish';

  uciEngine = new UciEngine({ 
    path: enginePath,
    onOutput: (output: string) => {
      if (mainWindow) {
        mainWindow.webContents.send('engine-analysis-update', output);
      }
    }
  });

  gameDatabase = new GameDatabase();
  lichessService = new LichessService();
  engineDownloader = EngineDownloader.getInstance();
  databaseManager = new DatabaseManager();
  databaseDownloader = DatabaseDownloader.getInstance(databaseManager);
});

ipcMain.handle('get-public-databases', () => {
    return PUBLIC_DATABASES;
});

ipcMain.handle('download-public-database', async (event, dbId: string) => {
    if (!mainWindow) return;
    try {
        await databaseDownloader.downloadDatabase(
            dbId,
            (progress) => mainWindow?.webContents.send('public-db-download-progress', { dbId, progress }),
            (status) => mainWindow?.webContents.send('public-db-download-status', { dbId, status })
        );
        return true;
    } catch (e) {
        console.error("Public DB Download Error", e);
        mainWindow.webContents.send('public-db-download-error', { dbId, error: e instanceof Error ? e.message : String(e) });
        return false;
    }
});

ipcMain.handle('fetch-lichess-games', async (event, username: string, filters: LichessGameFilter) => {
  try {
    const pgn = await lichessService.fetchUserGames(username, filters);
    gameDatabase.clearGames();
    await gameDatabase.extractHeadersFromPgn(pgn);
    return pgn;
  } catch (error) {
    console.error('IPC fetch-lichess-games error:', error);
    throw error;
  }
});

ipcMain.handle('lichess-download-background', async (event, username: string, filters: LichessGameFilter) => {
    const dbName = `lichess_${username}_${Date.now()}`;
    const dbEntry = await databaseManager.createDatabase(dbName);
    
    lichessService.downloadUserGames(username, dbEntry.path, filters)
        .then(async () => {
            console.log(`Lichess download for ${username} completed.`);
            try {
               await databaseManager.loadDatabaseGames(dbEntry.id);
               if (mainWindow) {
                   mainWindow.webContents.send('lichess-download-complete', dbEntry);
               }
            } catch (e) {
                console.error('Error post-processing lichess download', e);
            }
        })
        .catch((err: any) => {
             console.error(`Lichess download for ${username} failed:`, err);
             if (mainWindow) {
                 mainWindow.webContents.send('lichess-download-error', { id: dbEntry.id, error: err.message });
             }
        });

    return dbEntry;
});

ipcMain.handle('db-get-list', async () => {
    return databaseManager.getDatabases();
});

ipcMain.handle('db-create', async (event, name: string) => {
    return databaseManager.createDatabase(name);
});

ipcMain.handle('db-import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'PGN Files', extensions: ['pgn'] }],
    });
    
    if (!canceled && filePaths.length > 0) {
        return databaseManager.addDatabase(filePaths[0]);
    }
    return null;
});

ipcMain.handle('db-load-games', async (event, id: string) => {
    return databaseManager.loadDatabaseGames(id);
});

ipcMain.handle('db-add-game', async (event, id: string, pgn: string) => {
    return databaseManager.addGameToDatabase(id, pgn);
});

ipcMain.handle('db-delete', async (event, id: string) => {
    return databaseManager.deleteDatabase(id);
});

ipcMain.handle('db-rename', async (event, id: string, newName: string) => {
    return databaseManager.renameDatabase(id, newName);
});

ipcMain.handle('db-merge', async (event, sourceIds: string[], newName: string) => {
    return databaseManager.mergeDatabases(sourceIds, newName);
});

ipcMain.handle('db-remove-games', async (event, id: string, gameIndices: number[]) => {
    return databaseManager.removeGames(id, gameIndices);
});

ipcMain.handle('db-search', async (event, dbIds: string[], moves: string[], filter?: any) => {
    return databaseManager.searchGames(dbIds, moves, filter);
});

ipcMain.handle('db-compare', async (event, dbIdsA: string[], dbIdsB: string[], moves: string[]) => {
    return databaseManager.compareGames(dbIdsA, dbIdsB, moves);
});

ipcMain.handle('db-get-prep-scenarios', async (event, dbIdsA: string[], dbIdsB: string[], rootMoves: string[], depth: number, context?: any) => {
    return databaseManager.getPrepScenarios(dbIdsA, dbIdsB, rootMoves, depth, context);
});

ipcMain.handle('db-extract-pgn-headers', async (event, pgnContent: string) => {
  try {
    gameDatabase.clearGames();
    const headers = await gameDatabase.extractHeadersFromPgn(pgnContent);
    return headers.length > 0 ? headers[0] : null;
  } catch (error) {
    console.error('Failed to extract PGN headers:', error);
    return null;
  }
});

ipcMain.handle('open-pgn-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PGN Files', extensions: ['pgn'] }],
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const content = await fs.readFile(filePaths[0], 'utf-8');
      gameDatabase.clearGames();
      await gameDatabase.extractHeadersFromPgn(content);
      return content;
    }  catch (error) {
      console.error('Failed to read PGN file:', error);
      return null;
    }
  }
  return null;
});

ipcMain.handle('save-pgn-file', async (event, pgnContent) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'PGN Files', extensions: ['pgn'] }],
  });

  if (!canceled && filePath) {
    try {
      await fs.writeFile(filePath, pgnContent, 'utf-8');
      return filePath;
    } catch (error) {
      console.error('Failed to save PGN file:', error);
      return null;
    }
  }
  return null;
});

ipcMain.handle('start-engine', async () => {
  try {
    await uciEngine.start();
    return true;
  } catch (error) {
    console.error('Error starting engine:', error);
    return false;
  }
});

ipcMain.handle('stop-engine', () => {
  uciEngine.stop();
  return true;
});

ipcMain.handle('send-uci-command', async (event, command: string) => {
  try {
    const response = await uciEngine.sendUciCommand(command);
    return response;
  } catch (error) {
    console.error(`Error sending UCI command ${command}:`, error);
    return null;
  }
});

ipcMain.handle('get-game-headers', (): GameHeader[] => {
  return gameDatabase.getGames();
});

ipcMain.handle('select-engine', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: 'Select Chess Engine Executable',
    filters: [
      { name: 'Executables', extensions: ['exe', ''] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!canceled && filePaths.length > 0) {
    const newPath = filePaths[0];
    saveConfig({ enginePath: newPath });
    
    uciEngine.stop();
    uciEngine = new UciEngine({
      path: newPath,
      onOutput: (output: string) => {
        if (mainWindow) {
          mainWindow.webContents.send('engine-analysis-update', output);
        }
      }
    });
    
    return newPath;
  }
  return null;
});

ipcMain.handle('get-engine-path', () => {
  const config = loadConfig();
  return config.enginePath;
});

ipcMain.handle('get-basename', (event, filePath: string) => {
  return path.basename(filePath);
});

ipcMain.handle('get-available-engines', (): EngineMetadata[] => {
  return AVAILABLE_ENGINES;
});

ipcMain.handle('get-installed-engines', async () => {
    const enginesDir = engineDownloader.getEnginesDirectory();
    
    async function getFiles(dir: string, depth: number): Promise<{ name: string; path: string }[]> {
        if (depth > 2) return [];
        let results: { name: string; path: string }[] = [];
        try {
            const list = await fs.readdir(dir);
            for (const file of list) {
                const filePath = path.join(dir, file);
                const stats = await fs.stat(filePath);
                if (stats && stats.isDirectory()) {
                    results = results.concat(await getFiles(filePath, depth + 1));
                } else {
                    const isWindows = process.platform === 'win32';
                    const ext = path.extname(file).toLowerCase();
                    let isExecutable = false;

                    if (isWindows) {
                        isExecutable = ext === '.exe';
                    } else {
                        try {
                            await fs.access(filePath, fs.constants.X_OK);
                            const ignoredExts = ['.sh', '.bash', '.py', '.js', '.c', '.cpp', '.h', '.hpp', '.o', '.a', '.txt', '.md', '.json', '.xml', '.zip', '.tar', '.gz'];
                            if (!ignoredExts.includes(ext) && !file.startsWith('.')) {
                                isExecutable = true;
                            }
                        } catch {
                            isExecutable = false;
                        }
                    }

                    if (isExecutable) {
                         results.push({ name: file, path: filePath });
                    }
                }
            }
        } catch {
            // Ignore errors
        }
        return results;
    }

    return getFiles(enginesDir, 0);
});

ipcMain.handle('download-engine', async (event, engineId: string) => {
  if (!mainWindow) return null;

  try {
    const downloadedPath = await engineDownloader.downloadAndExtract(
      engineId,
      (progress) => {
        mainWindow?.webContents.send('engine-download-progress', { engineId, progress });
      },
      (status) => {
        mainWindow?.webContents.send('engine-download-status', { engineId, status });
      }
    );

    if (downloadedPath) {
      saveConfig({ enginePath: downloadedPath });
      uciEngine.stop();
      uciEngine = new UciEngine({
        path: downloadedPath,
        onOutput: (output: string) => {
          if (mainWindow) {
            mainWindow.webContents.send('engine-analysis-update', output);
          }
        }
      });
    }
    return downloadedPath;
  } catch (error) {
    console.error(`Error downloading engine ${engineId}:`, error);
    mainWindow?.webContents.send('engine-download-error', { engineId, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});