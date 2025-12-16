import { parentPort } from 'worker_threads';
import fs from 'fs';
import { GameDatabase, GameHeader } from '../db/Database';

// In-memory cache for the worker
const loadedDatabases: Map<string, GameHeader[]> = new Map();
const gameDatabase = new GameDatabase();

interface GameFilter {
  white?: string;
  black?: string;
  event?: string;
  dateStart?: string; // YYYY.MM.DD
  dateEnd?: string;
  result?: '1-0' | '0-1' | '1/2-1/2' | '*';
  minElo?: number;
  maxElo?: number;
}

// Handle messages from the main thread
if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      const { type, requestId, payload } = message;

      if (type === 'search') {
        const { dbPaths, moves, filter } = payload;
        const result = await performSearch(dbPaths, moves, filter);
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

async function performSearch(dbPaths: string[], moves: string[], filter?: GameFilter) {
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

    // Apply Advanced Filters BEFORE move filtering to reduce set size
    if (filter) {
        allGames = allGames.filter(g => {
            const white = Array.isArray(g.White) ? g.White[0] : g.White;
            const black = Array.isArray(g.Black) ? g.Black[0] : g.Black;
            const event = Array.isArray(g.Event) ? g.Event[0] : g.Event;
            const date = Array.isArray(g.Date) ? g.Date[0] : g.Date;
            const result = Array.isArray(g.Result) ? g.Result[0] : g.Result;
            const whiteElo = parseInt((Array.isArray(g.WhiteElo) ? g.WhiteElo[0] : g.WhiteElo) || '0');
            const blackElo = parseInt((Array.isArray(g.BlackElo) ? g.BlackElo[0] : g.BlackElo) || '0');

            if (filter.white && !white?.toLowerCase().includes(filter.white.toLowerCase())) return false;
            if (filter.black && !black?.toLowerCase().includes(filter.black.toLowerCase())) return false;
            if (filter.event && !event?.toLowerCase().includes(filter.event.toLowerCase())) return false;
            if (filter.result && result !== filter.result) return false;
            
            if (filter.dateStart || filter.dateEnd) {
                // Dates in PGN are YYYY.MM.DD
                const gameDate = date || '';
                if (filter.dateStart && gameDate < filter.dateStart) return false;
                if (filter.dateEnd && gameDate > filter.dateEnd) return false;
            }

            if (filter.minElo || filter.maxElo) {
                const avgElo = (whiteElo + blackElo) / 2;
                
                let effectiveElo = 0;
                if (whiteElo && blackElo) effectiveElo = (whiteElo + blackElo) / 2;
                else if (whiteElo) effectiveElo = whiteElo;
                else if (blackElo) effectiveElo = blackElo;
                
                if (effectiveElo > 0) {
                    if (filter.minElo && effectiveElo < filter.minElo) return false;
                    if (filter.maxElo && effectiveElo > filter.maxElo) return false;
                }
            }
            
            return true;
        });
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
