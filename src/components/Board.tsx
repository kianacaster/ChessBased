import React, { useRef, useEffect } from 'react';
import { Chessground } from 'chessground';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

interface Shape {
  orig: string;
  dest?: string;
  brush?: string;
}

interface BoardProps {
  fen?: string;
  turn?: 'white' | 'black';
  onMove?: (orig: string, dest: string) => void;
  dests: Map<string, string[]>;
  shapes?: Shape[];
  lastMove?: string[];
}

const Board: React.FC<BoardProps> = ({ fen = 'start', turn = 'white', onMove, dests, shapes = [], lastMove }) => {
  const cgRef = useRef<any | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const onMoveRef = useRef(onMove);

  // Keep onMoveRef up to date
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    if (elementRef.current) {
      const config: any = {
        fen: fen,
        movable: {
          free: false,
          color: 'both',
          dests: dests,
          showDests: true,
        },
        draggable: {
          showGhost: true,
        },
        drawable: {
          shapes: shapes,
        },
        lastMove: lastMove, 
        events: {
          move: (orig: any, dest: any) => {
            if (onMoveRef.current) {
               onMoveRef.current(orig, dest);
            }
          },
        },
      };
      cgRef.current = Chessground(elementRef.current, config);
    }

    return () => {
      if (cgRef.current) {
        cgRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (cgRef.current) {
      cgRef.current.set({ 
        fen, 
        movable: { dests, color: 'both' },
        drawable: { shapes },
        lastMove: lastMove 
      });
    }
  }, [fen, dests, turn, shapes, lastMove]);

  return <div ref={elementRef} style={{ width: '100%', height: '100%' }} />;
};

export default Board;