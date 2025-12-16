// electron/db/Database.ts

import { getEco } from '../utils/eco-data';

export interface GameHeader {
  Event: string;
  Site: string;
  Date: string;
  Round: string;
  White: string;
  Black: string;
  Result: string;
  pgn: string; // The full PGN of this game (headers + moves)
  moves?: string[]; // Cached moves for fast searching
  eco?: string; // ECO classification of the opening
  [key: string]: string | string[] | undefined; // Allow other tags
}

export class GameDatabase {
  private games: GameHeader[] = [];

  constructor() {
    console.log('GameDatabase initialized.');
  }

  public async extractHeadersFromPgn(pgnContent: string): Promise<GameHeader[]> {
    const headers: GameHeader[] = [];
    const lines = pgnContent.split('\n');
    console.log(`[GameDatabase] Parsing ${lines.length} lines.`);
    let currentHeader: Partial<GameHeader> = {};
    let currentGameLines: string[] = [];
    let inHeaders = true;
    
    // Helper to push current game
    const pushGame = () => {
        if (Object.keys(currentHeader).length > 0) {
            const fullPgn = currentGameLines.join('\n');
            currentHeader.pgn = fullPgn;
            
            // Pre-parse moves for optimization
            // Simple tokenization
            let body = fullPgn.replace(/\[.*?\]/gs, ''); // Remove headers block if any inside text (usually not if logic is sound)
            // Remove comments { ... }
            body = body.replace(/\{[^}]*\}/g, '');
            // Remove variations ( ... ) - simplistic
            body = body.replace(/\([^)]*\)/g, '');
            // Remove move numbers "1." "1..."
            body = body.replace(/\d+\.+/g, '');
            // Remove results
            body = body.replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '');
            
            const moves = body.trim().split(/\s+/).filter(m => m && m !== '.');
            currentHeader.moves = moves;

            // Determine ECO
            const eco = getEco(moves);
            if (eco) currentHeader.eco = eco;

            headers.push(currentHeader as GameHeader);
            currentHeader = {};
            currentGameLines = [];
        }
    };

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
         // If we were parsing moves (not in headers) and hit a new header, it's a new game.
         if (!inHeaders) {
             pushGame();
             inHeaders = true;
         }
         
        // PGN Tag Pair
        const match = trimmedLine.match(/^\[(\w+)\s+"(.*)"\]$/);
        if (match) {
          const tagName = match[1] as keyof GameHeader;
          const tagValue = match[2];
          currentHeader[tagName] = tagValue;
        }
      } else if (trimmedLine === '' && inHeaders) {
         // Empty line after headers marks start of moves
         if (Object.keys(currentHeader).length > 0) {
             inHeaders = false;
         }
      } 
      
      currentGameLines.push(line);
    }
    
    // Push last game
    pushGame();

    // Use concatenation or loop to avoid "Maximum call stack size exceeded" with spread operator on large arrays
    // this.games.push(...headers) fails for >~100k items
    this.games = this.games.concat(headers);
    
    return headers;
  }

  public getGames(): GameHeader[] {
    return this.games;
  }

  public clearGames(): void {
    this.games = [];
  }

  public static filterGames(games: GameHeader[], moves: string[]): { matchingGames: GameHeader[], moveStats: Map<string, { w: number, d: number, b: number }> } {
      const matchingGames: GameHeader[] = [];
      const moveStats = new Map<string, { w: number, d: number, b: number }>();

      for (const game of games) {
          // Use pre-parsed moves if available
          if (!game.moves) continue;

          // Check if game starts with 'moves'
          let match = true;
          if (game.moves.length < moves.length) {
              match = false;
          } else {
              // Fast array comparison
              for (let i = 0; i < moves.length; i++) {
                  if (game.moves[i] !== moves[i]) {
                      match = false;
                      break;
                  }
              }
          }

          if (match) {
              matchingGames.push(game);
              
              // Record next move if exists
              if (game.moves.length > moves.length) {
                  const nextMove = game.moves[moves.length];
                  
                  if (!moveStats.has(nextMove)) {
                      moveStats.set(nextMove, { w: 0, d: 0, b: 0 });
                  }
                  const stats = moveStats.get(nextMove)!;
                  
                  if (game.Result === '1-0') stats.w++;
                  else if (game.Result === '0-1') stats.b++;
                  else stats.d++;
              }
          }
      }
      return { matchingGames, moveStats };
  }
}
