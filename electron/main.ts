import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises'; // Import fs.promises for async file operations
import { UciEngine } from './engine/UciEngine'; // Import UciEngine
import { GameDatabase, GameHeader } from './db/Database'; // Import GameDatabase and GameHeader

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let uciEngine: UciEngine; // Declare uciEngine here
let gameDatabase: GameDatabase; // Declare gameDatabase here

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In production, load the local index.html.
  // In development, load the vite dev server URL.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  createWindow();

  // Initialize UCI Engine after mainWindow is created
  uciEngine = new UciEngine({ 
    path: 'stockfish', // Assuming 'stockfish' is in PATH for now
    onOutput: (output: string) => {
      if (mainWindow) {
        mainWindow.webContents.send('engine-analysis-update', output);
      }
    }
  });

  // Initialize GameDatabase after mainWindow is created
  gameDatabase = new GameDatabase();
});

// IPC Handlers
ipcMain.handle('open-pgn-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PGN Files', extensions: ['pgn'] }],
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const content = await fs.readFile(filePaths[0], 'utf-8');
      gameDatabase.clearGames(); // Clear previous games
      await gameDatabase.extractHeadersFromPgn(content); // Extract headers
      return content;
    } catch (error) {
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

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

