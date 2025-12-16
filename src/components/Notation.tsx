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
         <div className="text-sm font-medium leading-relaxed break-words whitespace-normal">
           <InlineTree 
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

// Inline Tree for Paragraph View

const NAG_MAP: Record<number, string> = {
  1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!'
};

const InlineTree: React.FC<{

  nodeId: string;

  nodes: Record<string, TreeNode>;

  currentNodeId: string;

  onNodeClick: (id: string) => void;

  moveNumber: number;

  isWhite: boolean;

  forceShowNumber?: boolean;

}> = ({ nodeId, nodes, currentNodeId, onNodeClick, moveNumber, isWhite, forceShowNumber = false }) => {

  const node = nodes[nodeId];

  if (!node || node.children.length === 0) return null;



  const mainChildId = node.children[0];

  const mainChild = nodes[mainChildId];

  const variations = node.children.slice(1);

  

  const label = isWhite ? `${moveNumber}.` : `${moveNumber}...`;

  const nextMoveNumber = isWhite ? moveNumber : moveNumber + 1;

  const showNumber = isWhite || forceShowNumber;

  
  const nags = mainChild.nags?.map(n => NAG_MAP[n] || '').join('') || '';
  const comment = mainChild.comments?.[0];


  const MainMoveElement = (
      <React.Fragment key={mainChildId}>
      <span 

        data-node-id={mainChildId}

        data-active={currentNodeId === mainChildId}

        className={twMerge(

            "inline-block rounded px-1 py-0.5 cursor-pointer hover:bg-muted transition-colors align-baseline",

            currentNodeId === mainChildId && "bg-primary/20 text-primary font-bold"

        )}

        onClick={(e) => {

            e.stopPropagation();

            onNodeClick(mainChildId);

        }}

      >

        {showNumber && <span className="text-muted-foreground mr-1 font-mono select-none text-xs">{label}</span>}

        <span className="mr-0.5">{mainChild.move?.san}{nags}</span>

      </span>
      {comment && (
        <div className="block w-full my-1 pl-2 border-l-2 border-primary/40 text-muted-foreground italic text-xs font-normal">
            {comment}
        </div>
      )}
      </React.Fragment>

  );



  return (

    <>

      {MainMoveElement}

      

      {variations.length > 0 && (

          <span className="text-muted-foreground mx-1 align-baseline inline">

              {variations.map(varId => {

                  const varNode = nodes[varId];

                  const varLabel = isWhite ? `${moveNumber}.` : `${moveNumber}...`;
                  const varNags = varNode.nags?.map(n => NAG_MAP[n] || '').join('') || '';
                  const varComment = varNode.comments?.[0];

                  // For variation start, always show number? Yes usually.

                  return (

                      <span key={varId} className="inline-block mx-1">

                          (

                          <span 

                            data-node-id={varId}

                            data-active={currentNodeId === varId}

                            className={twMerge(

                                "inline-block rounded px-1 cursor-pointer hover:bg-muted transition-colors",

                                currentNodeId === varId && "bg-primary/20 text-primary font-bold"

                            )}

                            onClick={(e) => {

                                e.stopPropagation();

                                onNodeClick(varId);

                            }}

                          >

                             <span className="text-muted-foreground mr-1 font-mono text-xs">{varLabel}</span>

                             <span>{varNode.move?.san}{varNags}</span>

                          </span>
                          
                          {varComment && (
                            <span className="italic text-xs text-muted-foreground mx-1">
                                {varComment}
                            </span>
                          )}

                          <InlineTree 

                             nodeId={varId}

                             nodes={nodes}

                             currentNodeId={currentNodeId}

                             onNodeClick={onNodeClick}

                             moveNumber={nextMoveNumber}

                             isWhite={!isWhite}

                          />

                          )

                      </span>

                  );

              })}

          </span>

      )}



      <InlineTree 

         nodeId={mainChildId}

         nodes={nodes}

         currentNodeId={currentNodeId}

         onNodeClick={onNodeClick}

         moveNumber={nextMoveNumber}

         isWhite={!isWhite}

         forceShowNumber={variations.length > 0 && !isWhite} // If we had variations, and next move is Black, show number (1... e5)

      />

    </>

  );

}



export default Notation;
