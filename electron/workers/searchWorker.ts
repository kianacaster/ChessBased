import { parentPort } from 'worker_threads';
import fs from 'fs';
import { GameDatabase, GameHeader } from '../db/Database';
import { getEco } from '../utils/eco-data';
import { Chess } from 'chessops/chess';
import { parseSan } from 'chessops/san';
import { makeFen } from 'chessops/fen';
import { Square } from 'chessops/types';

// In-memory cache for the worker
const loadedDatabases: Map<string, GameHeader[]> = new Map();
const gameDatabase = new GameDatabase();

interface MaterialCriteria {
    white?: { [key: string]: number };
    black?: { [key: string]: number };
}

interface PositionCriteria {
    [square: string]: string;
}

interface GameFilter {
  white?: string;
  black?: string;
  event?: string;
  dateStart?: string; // YYYY.MM.DD
  dateEnd?: string;
  result?: '1-0' | '0-1' | '1/2-1/2' | '*';
  minElo?: number;
  maxElo?: number;
  eco?: string;
  
  material?: MaterialCriteria;
  position?: PositionCriteria;
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

// Helper to convert algebraic square (e4) to index (0-63)
function squareToIndex(sq: string): number {
    const file = sq.charCodeAt(0) - 97; // 'a' -> 0
    const rank = sq.charCodeAt(1) - 49; // '1' -> 0
    return rank * 8 + file;
}

const ROLE_TO_CHAR: Record<string, 'p'|'n'|'b'|'r'|'q'|'k'> = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k'
};

function getMaterial(chess: Chess) {
    const material = {
        white: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
        black: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }
    };
    
    for (let i = 0; i < 64; i++) {
        const piece = chess.board.get(i);
        if (piece) {
            const role = piece.role;
            const char = ROLE_TO_CHAR[role];
            const color = piece.color; // 'white' | 'black'
            if (color === 'white') material.white[char]++;
            else material.black[char]++;
        }
    }
    return material;
}

function checkAdvancedCriteria(game: GameHeader, filter: GameFilter): boolean {
    if (!game.moves) return false;
    
    // Optimizations:
    // If searching for "Queen vs Rook" (Endgame), we might only check the end?
    // But user might want "passed through this position".
    // Let's do ANY for now.
    
    const chess = Chess.default();
    
    // Check start position?
    // Usually people search for developed positions.
    
    for (const san of game.moves) {
         const move = parseSan(chess, san);
         if (!move) break; 
         chess.play(move);
         
         // Check after every move
         let matches = true;

         // Check Position
         if (filter.position) {
             for (const [sq, pieceCode] of Object.entries(filter.position)) {
                 const idx = squareToIndex(sq);
                 const piece = chess.board.get(idx);
                 
                 if (!pieceCode) {
                     // Expect empty?
                     if (piece) { matches = false; break; }
                 } else {
                     if (!piece) { matches = false; break; }
                     // Code: wP, bN etc.
                     const color = pieceCode[0] === 'w' ? 'white' : 'black';
                     const role = pieceCode[1].toLowerCase();
                     if (piece.color !== color || piece.role !== role) {
                         matches = false;
                         break;
                     }
                 }
             }
         }
         if (!matches) continue; // Position failed, try next move

         // Check Material
         if (filter.material) {
             const currentMat = getMaterial(chess);
             
             if (filter.material.white) {
                 for (const [role, count] of Object.entries(filter.material.white)) {
                     if (currentMat.white[role as keyof typeof currentMat.white] !== count) {
                         matches = false; break;
                     }
                 }
             }
             if (!matches) continue;
             
             if (filter.material.black) {
                 for (const [role, count] of Object.entries(filter.material.black)) {
                     if (currentMat.black[role as keyof typeof currentMat.black] !== count) {
                         matches = false; break;
                     }
                 }
             }
         }
         
         if (matches) return true; // Found a position that matches all criteria
    }
    
    return false;
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

    // Apply Basic Filters
    if (filter) {
        allGames = allGames.filter(g => {
            const white = Array.isArray(g.White) ? g.White[0] : g.White;
            const black = Array.isArray(g.Black) ? g.Black[0] : g.Black;
            const event = Array.isArray(g.Event) ? g.Event[0] : g.Event;
            const date = Array.isArray(g.Date) ? g.Date[0] : g.Date;
            const result = Array.isArray(g.Result) ? g.Result[0] : g.Result;
            const whiteElo = parseInt((Array.isArray(g.WhiteElo) ? g.WhiteElo[0] : g.WhiteElo) || '0');
            const blackElo = parseInt((Array.isArray(g.BlackElo) ? g.BlackElo[0] : g.BlackElo) || '0');
            const eco = Array.isArray(g.eco) ? g.eco[0] : g.eco;

            if (filter.white && !white?.toLowerCase().includes(filter.white.toLowerCase())) return false;
            if (filter.black && !black?.toLowerCase().includes(filter.black.toLowerCase())) return false;
            if (filter.event && !event?.toLowerCase().includes(filter.event.toLowerCase())) return false;
            if (filter.result && result !== filter.result) return false;
            
            if (filter.dateStart || filter.dateEnd) {
                const gameDate = date || '';
                if (filter.dateStart && gameDate < filter.dateStart) return false;
                if (filter.dateEnd && gameDate > filter.dateEnd) return false;
            }

            if (filter.minElo || filter.maxElo) {
                let effectiveElo = 0;
                if (whiteElo && blackElo) effectiveElo = (whiteElo + blackElo) / 2;
                else if (whiteElo) effectiveElo = whiteElo;
                else if (blackElo) effectiveElo = blackElo;
                
                if (effectiveElo > 0) {
                    if (filter.minElo && effectiveElo < filter.minElo) return false;
                    if (filter.maxElo && effectiveElo > filter.maxElo) return false;
                }
            }

            if (filter.eco && !eco?.toLowerCase().includes(filter.eco.toLowerCase())) return false;
            
            return true;
        });
    }

    const { matchingGames, moveStats } = GameDatabase.filterGames(allGames, moves);
    
    // Apply Advanced Filters (Material/Position)
    let finalGames: GameHeader[] = [];
    if (filter && (filter.material || filter.position)) {
        // This is the slow part
        for (const game of matchingGames) {
            if (checkAdvancedCriteria(game, filter)) {
                finalGames.push(game);
            }
        }
    } else {
        finalGames = matchingGames;
    }

    // Calculate Aggregates on FINAL set
    let total = finalGames.length;
    let w = 0, d = 0, b = 0;
    finalGames.forEach(g => {
        if (g.Result === '1-0') w++;
        else if (g.Result === '0-1') b++;
        else d++;
    });

    // Move stats should technically be re-calculated based on finalGames if we want accuracy
    // But `GameDatabase.filterGames` returned stats for `matchingGames` (before advanced filter).
    // If we filter significantly, the stats for "next moves" might be wrong (showing moves that lead to non-matching games).
    // So we should re-calculate move stats for finalGames.
    
    let finalMoveStats = moveStats;
    if (filter && (filter.material || filter.position)) {
        // Re-run simple filter logic just to get stats, but on the filtered set
        // Actually, we can just do it manually here for the `movesList`
        const reCalc = GameDatabase.filterGames(finalGames, moves);
        finalMoveStats = reCalc.moveStats;
    }

    const movesList = Array.from(finalMoveStats.entries()).map(([san, s]) => ({
        san,
        white: s.w,
        draw: s.d,
        black: s.b,
        total: s.w + s.d + s.b
    })).sort((a, b) => b.total - a.total);

    return {
        games: finalGames.slice(0, 100),
        moves: movesList,
        totalGames: total,
        whiteWinPercent: total ? (w / total) * 100 : 0,
        drawPercent: total ? (d / total) * 100 : 0,
        blackWinPercent: total ? (b / total) * 100 : 0
    };
}
