import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useGame from './useGame';

describe('useGame Hook', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.fen).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(result.current.turn).toBe('white');
    expect(result.current.history).toHaveLength(0);
  });

  it('plays a valid move', () => {
    const { result } = renderHook(() => useGame());
    
    act(() => {
      const success = result.current.move('e2', 'e4');
      expect(success).toBe(true);
    });

    expect(result.current.turn).toBe('black');
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].san).toBe('e4');
  });

  it('rejects an illegal move', () => {
    const { result } = renderHook(() => useGame());
    
    act(() => {
      const success = result.current.move('e2', 'e5'); // Illegal pawn move
      expect(success).toBe(false);
    });

    expect(result.current.history).toHaveLength(0);
  });

  it('supports navigation (back/forward)', () => {
    const { result } = renderHook(() => useGame());
    
    act(() => {
      result.current.move('e2', 'e4');
    });
    
    expect(result.current.fen).not.toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'); // Changed

    act(() => {
      result.current.goBack();
    });

    expect(result.current.fen).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'); // Back to start

    act(() => {
      result.current.goForward();
    });
    
    expect(result.current.history[0].san).toBe('e4');
  });

  it('loads PGN correctly', () => {
    const { result } = renderHook(() => useGame());
    const pgn = '[Event "Test"]\n\n1. e4 e5 *';
    
    act(() => {
      result.current.loadPgn(pgn);
    });

    // Check that we can navigate loaded game
    expect(result.current.currentNode.children).toHaveLength(1); // e4
    
    act(() => {
        result.current.goForward(); // e4
    });
    expect(result.current.lastMove).toEqual(['e2', 'e4']);
    
    act(() => {
        result.current.goForward(); // e5
    });
    expect(result.current.lastMove).toEqual(['e7', 'e5']);
  });
});
