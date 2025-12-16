import { parentPort } from 'worker_threads';
import fs from 'fs';
import { GameDatabase, GameHeader } from '../db/Database';

// In-memory cache for the worker
const loadedDatabases: Map<string, GameHeader[]> = new Map();
const gameDatabase = new GameDatabase();

// Handle messages from the main thread
if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      const { type, requestId, payload } = message;

      if (type === 'search') {
        const { dbPaths, moves } = payload;
        const result = await performSearch(dbPaths, moves);
        parentPort?.postMessage({ type: 'search-result', requestId, result });
      } else if (type === 'clear-cache') {
          const { dbPath } = payload;
          // Find ID by path? Or just clear all? Or pass ID.
          // Since we cache by path in this simple worker (to avoid ID mapping complexity), we use path.
          if (loadedDatabases.has(dbPath)) {
              loadedDatabases.delete(dbPath);
          }
          parentPort?.postMessage({ type: 'ack', requestId });
      }
    } catch (error) {
        console.error('Worker error:', error);
        parentPort?.postMessage({ 
            type: 'error', 
            requestId: message.requestId, 
            error: error instanceof Error ? error.message : String(error) 
        });
    }
  });
}

async function performSearch(dbPaths: string[], moves: string[]) {
    let allGames: GameHeader[] = [];

    for (const dbPath of dbPaths) {
        if (loadedDatabases.has(dbPath)) {
            allGames = allGames.concat(loadedDatabases.get(dbPath)!);
        } else {
            try {
                if (fs.existsSync(dbPath)) {
                    const content = fs.readFileSync(dbPath, 'utf-8');
                    gameDatabase.clearGames();
                    const headers = await gameDatabase.extractHeadersFromPgn(content);
                    loadedDatabases.set(dbPath, headers);
                    allGames = allGames.concat(headers);
                }
            } catch (e) {
                console.error(`Worker failed to load ${dbPath}`, e);
            }
        }
    }

    const { matchingGames, moveStats } = GameDatabase.filterGames(allGames, moves);

    // Calculate Aggregates
    let total = matchingGames.length;
    let w = 0, d = 0, b = 0;
    matchingGames.forEach(g => {
        if (g.Result === '1-0') w++;
        else if (g.Result === '0-1') b++;
        else d++;
    });

    const movesList = Array.from(moveStats.entries()).map(([san, s]) => ({
        san,
        white: s.w,
        draw: s.d,
        black: s.b,
        total: s.w + s.d + s.b
    })).sort((a, b) => b.total - a.total);

    return {
        games: matchingGames.slice(0, 100),
        moves: movesList,
        totalGames: total,
        whiteWinPercent: total ? (w / total) * 100 : 0,
        drawPercent: total ? (d / total) * 100 : 0,
        blackWinPercent: total ? (b / total) * 100 : 0
    };
}
