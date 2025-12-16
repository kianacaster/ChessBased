// electron/db/Database.ts

export interface GameHeader {
  Event: string;
  Site: string;
  Date: string;
  Round: string;
  White: string;
  Black: string;
  Result: string;
  pgn: string; // The full PGN of this game (headers + moves)
  [key: string]: string; // Allow other tags
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
            currentHeader.pgn = currentGameLines.join('\n');
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
      
      // Always add line to current game PGN
      // Note: We might want to be careful about where the split happened, 
      // but assuming we are just reconstructing, adding the line is safe.
      // However, the logic above for "new game detection" relies on `!inHeaders`.
      // If we have a file with multiple games, we need to ensure we don't accidentally merge them 
      // if there are blank lines between games.
      
      currentGameLines.push(line);
    }
    
    // Push last game
    pushGame();

    this.games.push(...headers); 
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
          if (!game.pgn) continue;

          // Simple tokenization
          // Remove comments { ... }
          let body = game.pgn.replace(/\{[^}]*\}/g, '');
          // Remove variations ( ... ) - nested variations need recursive removal, simplistic for now
          // A robust PGN parser handles this, but for "starts with", simplistic regex might fail on complex nested comments.
          // Let's rely on basic stripping.
          body = body.replace(/\([^)]*\)/g, '');
          // Remove tag pairs if any left (shouldn't be in pgn body usually if split correctly)
          body = body.replace(/\[[^\]]*\]/g, '');
          // Remove move numbers "1." "1..."
          body = body.replace(/\d+\.+/g, '');
          
          const tokens = body.trim().split(/\s+/);
          
          // Check if game starts with 'moves'
          let match = true;
          if (tokens.length < moves.length) {
              match = false;
          } else {
              for (let i = 0; i < moves.length; i++) {
                  if (tokens[i] !== moves[i]) {
                      match = false;
                      break;
                  }
              }
          }

          if (match) {
              matchingGames.push(game);
              
              // Record next move if exists
              if (tokens.length > moves.length) {
                  const nextMove = tokens[moves.length];
                  // Filter out results like 1-0, 0-1, 1/2-1/2, *
                  if (!['1-0', '0-1', '1/2-1/2', '*'].includes(nextMove)) {
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
      }
      return { matchingGames, moveStats };
  }
}
