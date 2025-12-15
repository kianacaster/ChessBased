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
}
