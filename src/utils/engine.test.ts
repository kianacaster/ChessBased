import { describe, it, expect } from 'vitest';
import { parseUciInfo, parseBestMove } from './engine';

describe('UCI Engine Parsing', () => {
  it('parses info string with score cp correctly', () => {
    const input = 'info depth 20 seldepth 30 multipv 1 score cp 50 nodes 1000 nps 2000 time 500 pv e2e4 e7e5';
    const result = parseUciInfo(input);
    expect(result).not.toBeNull();
    expect(result?.depth).toBe(20);
    expect(result?.score.unit).toBe('cp');
    expect(result?.score.value).toBe(50);
    expect(result?.pv).toEqual(['e2e4', 'e7e5']);
  });

  it('parses info string with score mate correctly', () => {
    const input = 'info depth 10 score mate 5 nodes 100 nps 100 time 10 pv a1a2';
    const result = parseUciInfo(input);
    expect(result?.score.unit).toBe('mate');
    expect(result?.score.value).toBe(5);
  });

  it('parses bestmove correctly', () => {
    const input = 'bestmove e2e4 ponder e7e5';
    const result = parseBestMove(input);
    expect(result?.bestmove).toBe('e2e4');
    expect(result?.ponder).toBe('e7e5');
  });

  it('returns null for invalid info string', () => {
    expect(parseUciInfo('random string')).toBeNull();
  });
});
