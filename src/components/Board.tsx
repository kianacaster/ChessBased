import React, { useRef, useEffect } from 'react';
import { Chessground } from 'chessground';
// import { Config } from 'chessground/dist/config'; // Temporarily removed
// import { Key } from 'chessground/dist/types'; // Temporarily removed
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
}

const Board: React.FC<BoardProps> = ({ fen = 'start', turn = 'white', onMove, dests, shapes = [] }) => {
  const cgRef = useRef<any | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const onMoveRef = useRef(onMove);

  // Keep onMoveRef up to date
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    if (elementRef.current) {
      const config: any = { // Temporarily using any for Config
        fen: fen,
        movable: {
          free: false,
          color: turn,
          dests: dests,
          showDests: true,
        },
        draggable: {
          showGhost: true,
        },
        drawable: {
          shapes: shapes,
        },
        events: {
          move: (orig: any, dest: any) => { // Temporarily using any for Key
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
        movable: { dests, color: turn },
        drawable: { shapes } 
      });
    }
  }, [fen, dests, turn, shapes]);

  return <div ref={elementRef} style={{ width: '100%', height: '100%' }} />;
};

export default Board;
