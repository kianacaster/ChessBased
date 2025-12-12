import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chessops/chess';
import { parseUci } from 'chessops/util';
import { chessgroundDests as toDests } from 'chessops/compat';
import { makeFen } from 'chessops/fen';
import type { NormalMove } from 'chessops/types'; // Removed Move

interface UseGameResult {
  fen: string;
  move: (orig: string, dest: string) => boolean;
  dests: Map<string, string[]>;
  history: string[];
  currentMoveIndex: number;
  jumpToMove: (index: number) => void;
}

const useGame = (): UseGameResult => {
  const chessRef = useRef<Chess>(Chess.default());
  const [fen, setFen] = useState<string>(makeFen(chessRef.current.toSetup()));
  const [dests, setDests] = useState<Map<string, string[]>>(() => toDests(chessRef.current));
  const [history, setHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1); // -1 for initial position

  const applyMove = useCallback((orig: string, dest: string): boolean => {
    const uciMove = parseUci(orig + dest);
    if (!uciMove) return false;

    // Ensure it's a NormalMove (chessground doesn't do drops directly yet)
    if (!('from' in uciMove) || !('to' in uciMove)) {
      return false;
    }
    const normalMove = uciMove as NormalMove;

    const tempChess = chessRef.current.clone();
    const allDests = tempChess.allDests();

    const legalDestsForOrigSquare = allDests.get(normalMove.from);

    if (!legalDestsForOrigSquare) {
      return false;
    }

    // Check if the destination is in the legal moves for the origin square
    const moveExists = legalDestsForOrigSquare.has(normalMove.to);

    if (moveExists) {
      // If we are not at the end of the history, truncate it
      if (currentMoveIndex < history.length - 1) {
        setHistory((prev) => prev.slice(0, currentMoveIndex + 1));
      }
      
      chessRef.current.play(normalMove);
      const newFen = makeFen(chessRef.current.toSetup());
      setFen(newFen);
      setDests(toDests(chessRef.current));
      setHistory((prev) => [...prev, orig + dest]);
      setCurrentMoveIndex((prev) => prev + 1);
      return true;
    }
    return false;
  }, [history, currentMoveIndex]);

  const jumpToMove = useCallback((index: number) => {
    if (index < -1 || index >= history.length) return;

    setCurrentMoveIndex(index);
    const newChess = Chess.default();
    // Replay moves up to the selected index
    for (let i = 0; i <= index; i++) {
      if (history[i]) {
        const move = parseUci(history[i]);
        if (move) {
          newChess.play(move);
        } else {
          console.error("Invalid UCI in history:", history[i]);
          return;
        }
      }
    }
    chessRef.current = newChess;
    setFen(makeFen(newChess.toSetup()));
    setDests(toDests(newChess));
  }, [history]);

  return { fen, move: applyMove, dests, history, currentMoveIndex, jumpToMove };
};

export default useGame;
