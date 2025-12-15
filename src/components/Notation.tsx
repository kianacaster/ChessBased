import React, { useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { MoveData } from '../hooks/useGame';
import type { TreeNode } from '../types/chess';

interface NotationProps {
  history: MoveData[];
  currentMoveIndex: number;
  onMoveClick?: (index: number) => void;
  className?: string;
  // New Tree Props
  nodes?: Record<string, TreeNode>;
  currentNodeId?: string;
  onNodeClick?: (id: string) => void;
}

const Notation: React.FC<NotationProps> = ({ 
  history, 
  currentMoveIndex, 
  onMoveClick, 
  className,
  nodes,
  currentNodeId,
  onNodeClick
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll (simplified for now)
  useEffect(() => {
    const activeElement = scrollRef.current?.querySelector('[data-active="true"]');
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMoveIndex, currentNodeId]);

  if (nodes && currentNodeId && onNodeClick) {
    const rootId = Object.keys(nodes).find(k => nodes[k].parentId === null);
    if (!rootId) return <div className={className}>Empty Tree</div>;

    return (
      <div ref={scrollRef} className={twMerge("flex flex-col h-full overflow-y-auto bg-background text-foreground p-2", className)}>
         <div 
           className={twMerge(
             "flex items-center px-2 py-1.5 cursor-pointer transition-colors rounded-sm mb-1",
             currentNodeId === rootId
               ? "bg-primary/20 text-foreground" 
               : "text-muted-foreground hover:bg-muted hover:text-foreground"
           )}
           onClick={() => onNodeClick(rootId)}
         >
           <span className="font-semibold text-xs uppercase tracking-wider">Game Start</span>
         </div>
         <div className="text-sm font-medium leading-6 break-words">
           <RecursiveTree 
             nodeId={rootId} 
             nodes={nodes} 
             currentNodeId={currentNodeId} 
             onNodeClick={onNodeClick} 
             moveNumber={1}
             isWhite={true}
           />
         </div>
      </div>
    );
  }

  // Legacy Linear View
  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMoveIndex = i;
    const blackMoveIndex = i + 1;
    const whiteMove = history[whiteMoveIndex];
    const blackMove = history[blackMoveIndex];

    rows.push(
      <div key={moveNumber} className={clsx(
        "grid grid-cols-[2.5rem_1fr_1fr] items-center px-4 py-1 text-sm font-medium transition-colors gap-2",
        moveNumber % 2 === 0 ? "bg-muted/30" : "bg-transparent"
      )}>
        <span className="text-muted-foreground font-mono text-xs">{moveNumber}.</span>
        <span
          data-active={currentMoveIndex === whiteMoveIndex}
          className={twMerge(
            "cursor-pointer px-2 py-0.5 rounded-sm transition-colors select-none w-full text-left",
            currentMoveIndex === whiteMoveIndex 
              ? "bg-primary text-primary-foreground" 
              : "text-foreground hover:bg-muted hover:text-foreground"
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
                ? "bg-primary text-primary-foreground" 
                : "text-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => onMoveClick && onMoveClick(blackMoveIndex)}
          >
            {blackMove.san}
          </span>
        ) : (
          <span />
        )}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={twMerge("flex flex-col h-full overflow-y-auto bg-background text-foreground", className)}>
      <div className="sticky top-0 bg-background px-4 py-2 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider z-10 shadow-sm grid grid-cols-[2.5rem_1fr_1fr] gap-2 items-center">
        <span className="">#</span>
        <span className="">White</span>
        <span className="">Black</span>
      </div>
      <div className="flex-1 py-1">
        {rows.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">No moves yet</div>
        ) : rows}
      </div>
    </div>
  );
};

// Recursive Component for Vertical Tree View
const RecursiveTree: React.FC<{
  nodeId: string;
  nodes: Record<string, TreeNode>;
  currentNodeId: string;
  onNodeClick: (id: string) => void;
  moveNumber: number;
  isWhite: boolean;
  depth?: number;
}> = ({ nodeId, nodes, currentNodeId, onNodeClick, moveNumber, isWhite, depth = 0 }) => {
  const node = nodes[nodeId];
  if (!node || node.children.length === 0) return null;

  return (
    <div className="flex flex-col w-full">
      {node.children.map((childId, index) => {
        const child = nodes[childId];
        if (!child) return null;
        
        const label = isWhite 
          ? `${moveNumber}.` 
          : `${moveNumber}...`;

        const nextMoveNumber = isWhite ? moveNumber : moveNumber + 1;

        return (
          <div key={childId} className="flex flex-col">
            <div 
              data-node-id={childId}
              data-active={currentNodeId === childId}
              className={twMerge(
                "flex items-center px-2 py-1.5 cursor-pointer transition-colors border-l-2 rounded-r-sm",
                currentNodeId === childId 
                  ? "bg-primary/20 text-foreground border-primary" 
                  : "border-transparent text-foreground hover:bg-muted",
              )}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={(e) => {
                e.stopPropagation();
                onNodeClick(childId);
              }}
            >
              <span className="font-mono text-xs text-muted-foreground w-8 inline-block mr-2 text-right shrink-0 select-none">{label}</span>
              <span className={twMerge("font-semibold", currentNodeId === childId && "text-primary")}>{child.move?.san}</span>
              {index > 0 && <span className="ml-2 text-xs text-muted-foreground italic">(Var)</span>}
            </div>
            
            <RecursiveTree 
              nodeId={childId} 
              nodes={nodes} 
              currentNodeId={currentNodeId} 
              onNodeClick={onNodeClick} 
              moveNumber={nextMoveNumber}
              isWhite={!isWhite}
              depth={depth + 1}
            />
          </div>
        );
      })}
    </div>
  );
}

export default Notation;