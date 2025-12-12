import React, { useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { MoveData } from '../hooks/useGame';

interface NotationProps {
  history: MoveData[];
  currentMoveIndex: number;
  onMoveClick?: (index: number) => void;
  className?: string;
}

const Notation: React.FC<NotationProps> = ({ history, currentMoveIndex, onMoveClick, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to current move
  useEffect(() => {
    const activeElement = scrollRef.current?.querySelector('[data-active="true"]');
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMoveIndex]);

  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMoveIndex = i;
    const blackMoveIndex = i + 1;
    const whiteMove = history[whiteMoveIndex];
    const blackMove = history[blackMoveIndex];

    rows.push(
      <div key={moveNumber} className={clsx(
        "grid grid-cols-[2.5rem_1fr_1fr] items-center px-4 py-1 text-sm font-medium hover:bg-white/5 transition-colors gap-2",
        moveNumber % 2 === 0 ? "bg-white/5" : "bg-transparent"
      )}>
        <span className="text-gray-500 font-mono text-xs">{moveNumber}.</span>
        <span
          data-active={currentMoveIndex === whiteMoveIndex}
          className={twMerge(
            "cursor-pointer px-2 py-0.5 rounded-sm transition-colors select-none w-full text-left",
            currentMoveIndex === whiteMoveIndex 
              ? "bg-[#4b91f1] text-white" 
              : "text-gray-300 hover:text-white hover:bg-white/10"
          )}
          onClick={() => onMoveClick && onMoveClick(whiteMoveIndex)}
        >
          {whiteMove.san}
        </span>
        {blackMove ? (
          <span
            data-active={currentMoveIndex === blackMoveIndex}
            className={twMerge(
              "cursor-pointer px-2 py-0.5 rounded-sm transition-colors select-none w-full text-left",
              currentMoveIndex === blackMoveIndex 
                ? "bg-[#4b91f1] text-white" 
                : "text-gray-300 hover:text-white hover:bg-white/10"
            )}
            onClick={() => onMoveClick && onMoveClick(blackMoveIndex)}
          >
            {blackMove.san}
          </span>
        ) : (
          <span /> /* Empty cell to maintain grid structure if needed, though 1fr handles it */
        )}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={twMerge("flex flex-col h-full overflow-y-auto bg-[#262421] text-[#c0c0c0]", className)}>
      <div className="sticky top-0 bg-[#262421] px-4 py-2 border-b border-[#302e2c] text-xs font-bold text-gray-500 uppercase tracking-wider z-10 shadow-sm grid grid-cols-[2.5rem_1fr_1fr] gap-2 items-center">
        <span className="">#</span>
        <span className="">White</span>
        <span className="">Black</span>
      </div>
      <div className="flex-1 py-1">
        {rows.length === 0 ? (
          <div className="p-4 text-center text-gray-600 text-sm">No moves yet</div>
        ) : rows}
      </div>
    </div>
  );
};

export default Notation;