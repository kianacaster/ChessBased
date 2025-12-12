import React, { useRef, useEffect } from 'react';
import { Chessground } from 'chessground';
// import { Config } from 'chessground/dist/config'; // Temporarily removed
// import { Key } from 'chessground/dist/types'; // Temporarily removed
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.dark.css';

interface BoardProps {
  fen?: string;
  onMove?: (orig: string, dest: string) => void;
  dests: Map<string, string[]>;
}

const Board: React.FC<BoardProps> = ({ fen = 'start', onMove, dests }) => {
  const cgRef = useRef<any | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      const config: any = { // Temporarily using any for Config
        fen: fen,
        movable: {
          free: false,
          color: 'white', // Can be dynamic later
          dests: dests,
          showDests: true,
        },
        draggable: {
          showGhost: true,
        },
        events: {
          move: (orig: any, dest: any) => { // Temporarily using any for Key
            onMove && onMove(orig, dest);
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
      cgRef.current.set({ fen, movable: { dests } });
    }
  }, [fen, dests]);

  return <div ref={elementRef} style={{ width: '100%', height: '100%' }} />;
};

export default Board;
