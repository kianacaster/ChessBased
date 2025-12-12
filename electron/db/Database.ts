// electron/db/Database.ts

export interface GameHeader {
  Event: string;
  Site: string;
  Date: string;
  Round: string;
  White: string;
  Black: string;
  Result: string;
  // Add other common PGN tags as needed
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
    let inHeaders = true;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        // PGN Tag Pair
        const match = trimmedLine.match(/^\[(\w+)\s+"(.*)"\]$/);
        if (match) {
          const tagName = match[1] as keyof GameHeader;
          const tagValue = match[2];
          currentHeader[tagName] = tagValue;
        }
      } else if (trimmedLine === '' && inHeaders) {
        // Empty line separates headers from moves
        // If we have collected any headers, push them
        if (Object.keys(currentHeader).length > 0) {
          headers.push(currentHeader as GameHeader);
          currentHeader = {}; // Reset for next game
        }
        inHeaders = false; // Once an empty line is encountered, assume moves follow
      } else if (trimmedLine !== '' && !inHeaders) {
        // We are in the moves section, or a new game starts with headers
        // If we encounter a new header tag, it means a new game starts
        if (trimmedLine.startsWith('[')) {
          inHeaders = true;
          // Re-process this line as a header for the new game
          const match = trimmedLine.match(/^\[(\w+)\s+"(.*)"\]$/);
          if (match) {
            const tagName = match[1] as keyof GameHeader;
            const tagValue = match[2];
            currentHeader[tagName] = tagValue;
          }
        }
      }
    }
    // Add any remaining header if the file ends without an empty line after the last game's headers
    if (Object.keys(currentHeader).length > 0) {
      headers.push(currentHeader as GameHeader);
    }

    this.games.push(...headers); // Add extracted headers to the in-memory store
    return headers;
  }

  public getGames(): GameHeader[] {
    return this.games;
  }

  public clearGames(): void {
    this.games = [];
  }
}
