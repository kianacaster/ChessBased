import { describe, it, expect, vi } from 'vitest';
import { GameDatabase } from './Database';

// Mock getEco since it is imported
vi.mock('../utils/eco-data', () => ({
  getEco: () => 'A00'
}));

describe('GameDatabase', () => {
  it('extracts headers from PGN correctly', async () => {
    const pgn = `[Event "Test Game"]
[Site "Local"]
[Date "2023.01.01"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`;
    const db = new GameDatabase();
    const headers = await db.extractHeadersFromPgn(pgn);
    
    expect(headers).toHaveLength(1);
    expect(headers[0].Event).toBe('Test Game');
    expect(headers[0].Result).toBe('1-0');
    expect(headers[0].moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('filters games correctly', async () => {
    const db = new GameDatabase();
    const pgn1 = `[Result "1-0"]

1. e4 e5 1-0`;
    const pgn2 = `[Result "0-1"]

1. d4 d5 0-1`;
    const pgn3 = `[Result "1/2-1/2"]

1. e4 c5 1/2-1/2`;

    const headers = await db.extractHeadersFromPgn(pgn1 + '\n' + pgn2 + '\n' + pgn3);
    
    const result = GameDatabase.filterGames(headers, ['e4']);
    expect(result.matchingGames).toHaveLength(2); // Game 1 and 3
    
    const stats = result.moveStats;
    expect(stats.get('e5')).toEqual({ w: 1, d: 0, b: 0 });
    expect(stats.get('c5')).toEqual({ w: 0, d: 1, b: 0 });
  });
});
