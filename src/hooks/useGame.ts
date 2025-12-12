import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chessops/chess';
import { parseUci } from 'chessops/util';
import { chessgroundDests as toDests } from 'chessops/compat';
import { makeFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import type { NormalMove } from 'chessops/types';

export interface MoveData {
  uci: string;
  san: string;
}

interface UseGameResult {
  fen: string;
  turn: 'white' | 'black';
  move: (orig: string, dest: string) => boolean;
  dests: Map<string, string[]>;
  history: MoveData[];
  currentMoveIndex: number;
  jumpToMove: (index: number) => void;
}

const useGame = (): UseGameResult => {
  const chessRef = useRef<Chess>(Chess.default());
  const [fen, setFen] = useState<string>(makeFen(chessRef.current.toSetup()));
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [dests, setDests] = useState<Map<string, string[]>>(() => toDests(chessRef.current));
  const [history, setHistory] = useState<MoveData[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1); // -1 for initial position

  const applyMove = useCallback((orig: string, dest: string): boolean => {
    const uciMove = parseUci(orig + dest);
    if (!uciMove) return false;

    // Ensure it's a NormalMove
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

    const moveExists = legalDestsForOrigSquare.has(normalMove.to);

    if (moveExists) {
      if (currentMoveIndex < history.length - 1) {
        setHistory((prev) => prev.slice(0, currentMoveIndex + 1));
      }
      
      const san = makeSan(chessRef.current, normalMove);
      
      chessRef.current.play(normalMove);
      const newFen = makeFen(chessRef.current.toSetup());
      setFen(newFen);
      setTurn(chessRef.current.turn);
      setDests(toDests(chessRef.current));
      setHistory((prev) => [...prev, { uci: orig + dest, san }]);
      setCurrentMoveIndex((prev) => prev + 1);
      return true;
    }
    return false;
  }, [history, currentMoveIndex]);

  const jumpToMove = useCallback((index: number) => {
    if (index < -1 || index >= history.length) return;

    setCurrentMoveIndex(index);
    const newChess = Chess.default();
    
    for (let i = 0; i <= index; i++) {
      if (history[i]) {
        const move = parseUci(history[i].uci);
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
    setTurn(newChess.turn);
    setDests(toDests(newChess));
  }, [history]);

  return { fen, turn, move: applyMove, dests, history, currentMoveIndex, jumpToMove };
};

export default useGame;