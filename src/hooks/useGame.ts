import { useState, useCallback, useMemo, useEffect } from 'react';
import { Chess } from 'chessops/chess';
import { parseUci } from 'chessops/util';
import { chessgroundDests as toDests } from 'chessops/compat';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSan, parseSan } from 'chessops/san';
import type { NormalMove } from 'chessops/types';
import type { TreeNode } from '../types/chess';
import type { GameHeader } from '../types/app'; // Added GameHeader import

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
  loadPgn: (pgn: string) => void;
  // Tree API
  nodes: Record<string, TreeNode>;
  currentNode: TreeNode;
  goToNode: (id: string) => void;
  lastMove?: [string, string];
  gameMetadata: GameHeader | null; // Added gameMetadata to interface
}

const generateId = () => Math.random().toString(36).substring(2, 10);

const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const useGame = (): UseGameResult => {
  const [nodes, setNodes] = useState<Record<string, TreeNode>>(() => {
    const rootId = generateId();
    return {
      [rootId]: {
        id: rootId,
        fen: initialFen,
        children: [],
        parentId: null,
        comments: []
      }
    };
  });
  
  // Initialize rootId and currentNodeId based on the initial nodes
  const [rootId, setRootId] = useState(() => Object.keys(nodes)[0]);
  const [currentNodeId, setCurrentNodeId] = useState(() => Object.keys(nodes)[0]);
  const [gameMetadata, setGameMetadata] = useState<GameHeader | null>(null); // Added gameMetadata state

  useEffect(() => {
    // console.log('Current Node ID:', currentNodeId);
  }, [currentNodeId]);


  // Helper to get path from root to a specific node
  const getPath = useCallback((targetId: string, currentNodes: Record<string, TreeNode>) => {
    const path: TreeNode[] = [];
    let curr: TreeNode | undefined = currentNodes[targetId];
    let depth = 0;
    while (curr && depth < 1000) { // Safety break
      path.unshift(curr);
      if (!curr.parentId) break;
      curr = currentNodes[curr.parentId];
      depth++;
    }
    return path;
  }, []);

  const currentNode = nodes[currentNodeId] || nodes[rootId];
  
  // Reconstruct Chess instance from current FEN
  const chess = useMemo(() => {
    try {
      const setup = parseFen(currentNode.fen).unwrap();
      return Chess.fromSetup(setup).unwrap();
    } catch (e) {
      console.error("Failed to parse FEN:", currentNode.fen, e);
      return Chess.default();
    }
  }, [currentNode.fen]);

  const turn = chess.turn;
  const dests = useMemo(() => toDests(chess), [chess]);

  // Backward compatibility: linear history of the current branch
  const historyPath = useMemo(() => getPath(currentNodeId, nodes), [currentNodeId, nodes, getPath]);
  
  // history for UI (excludes root, just moves)
  const history = useMemo(() => {
    return historyPath
      .slice(1) // Remove root
      .map(node => ({
        uci: node.move?.uci || '',
        san: node.move?.san || ''
      }));
  }, [historyPath]);

  const currentMoveIndex = history.length - 1;

  const move = useCallback((orig: string, dest: string): boolean => {
    const uciString = orig + dest;
    const uciMove = parseUci(uciString);
    if (!uciMove) {
        console.warn('Invalid UCI:', uciString);
        return false;
    }
    
    if (!('from' in uciMove) || !('to' in uciMove)) return false; 
    
    const tempChess = chess.clone();
    const legalDests = toDests(tempChess);
    const movesFromOrig = legalDests.get(orig as any);
    
    if (!movesFromOrig?.includes(dest as any)) {
        console.warn('Illegal move:', uciString, 'FEN:', chess.toSetup());
        return false;
    }

    // Check if this move already exists in children
    const existingChildId = currentNode.children.find(childId => {
      const child = nodes[childId];
      return child.move?.uci === uciString;
    });

    if (existingChildId) {
      setCurrentNodeId(existingChildId);
      return true;
    }

    // Create new node
    const san = makeSan(chess, uciMove as NormalMove);
    tempChess.play(uciMove as NormalMove);
    const newFen = makeFen(tempChess.toSetup());
    
    const newNodeId = generateId();
    
    const newNode: TreeNode = {
      id: newNodeId,
      fen: newFen,
      move: { uci: uciString, san },
      children: [],
      parentId: currentNodeId,
      comments: []
    };

    setNodes(prev => {
      const parent = prev[currentNodeId];
      return {
        ...prev,
        [currentNodeId]: { ...parent, children: [...parent.children, newNodeId] },
        [newNodeId]: newNode
      };
    });
    setCurrentNodeId(newNodeId);
    
    return true;
  }, [chess, currentNode, currentNodeId, nodes]);

  const jumpToMove = useCallback((index: number) => {
    // Legacy jump: assume we want to jump to the i-th node in the current path
    // If index is -1, go to root.
    if (index < -1) return;
    if (index === -1) {
      setCurrentNodeId(rootId);
      return;
    }
    
    const targetNode = historyPath[index + 1]; // +1 because index 0 is the first move (node 1), root is node 0
    if (targetNode) {
      setCurrentNodeId(targetNode.id);
    }
  }, [historyPath, rootId]);

  const goToNode = useCallback((id: string) => {
    if (nodes[id]) {
      setCurrentNodeId(id);
    }
  }, [nodes]);

  const lastMove = useMemo(() => {
    if (currentNode.move?.uci) {
      return [currentNode.move.uci.substring(0, 2), currentNode.move.uci.substring(2, 4)] as [string, string];
    }
    return undefined;
  }, [currentNode]);

  const loadPgn = useCallback((pgn: string) => {
      // Very basic PGN parser for main line
      // 1. Remove headers (anything in [])
      const body = pgn.replace(/\[.*?\]/gs, '');
      // 2. Remove comments (anything in {})
      const noComments = body.replace(/\{.*?\}/gs, '');
      // 3. Remove variations (anything in ()) - recursive needed but for now simple
      const noVariations = noComments.replace(/\(.*?\)/gs, '');
      // 4. Remove move numbers (1. or 1...)
      const clean = noVariations.replace(/\d+\.+/g, ' ');
      
      const tokens = clean.split(/\s+/).filter(t => t && t !== '*' && t !== '1-0' && t !== '0-1' && t !== '1/2-1/2');
      
      // Reset game
      const newRootId = generateId();
      const newNodes: Record<string, TreeNode> = {
          [newRootId]: {
              id: newRootId,
              fen: initialFen,
              children: [],
              parentId: null,
              comments: []
          }
      };
      
      let currentId = newRootId;
      let currentChess = Chess.default();
      
      for (const token of tokens) {
          try {
              const sanMove = parseSan(currentChess, token);
              if (!sanMove) continue;
              
              const uciMove = makeSan(currentChess, sanMove); // This gives SAN back, wait.
              // We need UCI. 
              // chessops Move object doesn't have UCI property directly?
              // We can construct it.
              const from = sanMove.from;
              const to = sanMove.to;
              const promotion = sanMove.promotion;
              // chessops squares are integers 0-63. We need to convert to algebraic.
              // Actually `parseUci` goes string -> Move.
              // We have Move. We need to apply it.
              
              // We need to store UCI string in node.
              // Helper to convert square int to string?
              // chessops/util has `makeUci`.
              // But `makeUci` takes a Move.
              
              // Let's rely on playing it on `currentChess` and getting the resulting FEN.
              // But we also need the move string (UCI) for the UI.
              
              // Let's implement a simple `toUci(move)`
               const file = (s: number) => 'abcdefgh'[s & 7];
               const rank = (s: number) => '12345678'[s >> 3];
               const square = (s: number) => file(s) + rank(s);
               
               let uci = square(from) + square(to);
               if (promotion) {
                   uci += promotion;
               }

              currentChess.play(sanMove);
              const newFen = makeFen(currentChess.toSetup());
              const newNodeId = generateId();
              
              const newNode: TreeNode = {
                  id: newNodeId,
                  fen: newFen,
                  move: { uci, san: token },
                  children: [],
                  parentId: currentId,
                  comments: []
              };
              
              newNodes[currentId].children.push(newNodeId);
              newNodes[newNodeId] = newNode;
              currentId = newNodeId;
              
          } catch (e) {
              console.warn('Failed to parse move:', token);
              break;
          }
      }
      
      setNodes(newNodes);
      setRootId(newRootId);
      setCurrentNodeId(newRootId); // Start at beginning of game? Or end? Usually end.
      // Let's go to the end
      setCurrentNodeId(currentId);
      
  }, []);

  const exportPgn = useCallback(() => {
      let pgn = '[Event "Casual Game"]\n[Site "ChessBased Clone"]\n[Date "' + new Date().toISOString().split('T')[0].replace(/-/g, '.') + '"]\n';
      pgn += '[White "White"]\n[Black "Black"]\n[Result "*"]\n\n';
      
      // Reconstruct moves from history
      // Note: history contains {uci, san}
      
      let moveString = '';
      history.forEach((move, i) => {
          if (i % 2 === 0) {
              moveString += `${(i / 2) + 1}. ${move.san} `;
          } else {
              moveString += `${move.san} `;
          }
      });
      
      return pgn + moveString.trim() + ' *';
  }, [history]);

  const goBack = useCallback(() => {
      if (currentNode.parentId) {
          setCurrentNodeId(currentNode.parentId);
      }
  }, [currentNode]);

  const goForward = useCallback(() => {
      if (currentNode.children.length > 0) {
          setCurrentNodeId(currentNode.children[0]);
      }
  }, [currentNode]);

  const goToStart = useCallback(() => {
      setCurrentNodeId(rootId);
  }, [rootId]);

  const goToEnd = useCallback(() => {
      let curr = currentNode;
      // Go to end of main line from current position
      while (curr.children.length > 0) {
          curr = nodes[curr.children[0]];
      }
      setCurrentNodeId(curr.id);
  }, [currentNode, nodes]);

  const playSan = useCallback((san: string) => {
      try {
          const moveObj = parseSan(chess, san);
          if (!moveObj) return false;
          
          const file = (s: number) => 'abcdefgh'[s & 7];
          const rank = (s: number) => '12345678'[s >> 3];
          const from = file(moveObj.from) + rank(moveObj.from);
          const to = file(moveObj.to) + rank(moveObj.to);
          const prom = moveObj.promotion || '';
          
          return move(from, to + prom);
      } catch (e) {
          console.error("playSan failed:", san, e);
          return false;
      }
  }, [chess, move]);

  const playLine = useCallback((sanMoves: string[]) => {
      // Clone chess state to validate moves without mutating current render state
      const tempChess = chess.clone();
      let startId = currentNodeId;

      setNodes(prev => {
          const nextNodes = { ...prev };
          let curr = startId;
          // We need a local chess instance that updates as we traverse/create nodes
          // But 'tempChess' captured outside is stale if we loop? 
          // No, tempChess is mutable (Chess class).
          
          for (const san of sanMoves) {
              try {
                  const moveObj = parseSan(tempChess, san);
                  if (!moveObj) break;
                  
                  const file = (s: number) => 'abcdefgh'[s & 7];
                  const rank = (s: number) => '12345678'[s >> 3];
                  const uci = file(moveObj.from) + rank(moveObj.from) + file(moveObj.to) + rank(moveObj.to) + (moveObj.promotion || '');
                  
                  const parent = nextNodes[curr];
                  const foundId = parent.children.find(cid => nextNodes[cid].move?.uci === uci);
                  
                  if (foundId) {
                      curr = foundId;
                      tempChess.play(moveObj);
                      continue;
                  }
                  
                  tempChess.play(moveObj);
                  const newFen = makeFen(tempChess.toSetup());
                  const newNodeId = generateId();
                  
                  const newNode: TreeNode = {
                      id: newNodeId,
                      fen: newFen,
                      move: { uci, san },
                      children: [],
                      parentId: curr,
                      comments: []
                  };
                  
                  nextNodes[curr] = { ...nextNodes[curr], children: [...nextNodes[curr].children, newNodeId] };
                  nextNodes[newNodeId] = newNode;
                  curr = newNodeId;
              } catch (e) {
                  console.warn("playLine error on move", san, e);
                  break;
              }
          }
          
          // Side effect: update current node
          // We can't call setCurrentNodeId here directly in updater?
          // Actually we can, but it might trigger re-render. 
          // Better to use useEffect or just call it after setNodes? 
          // But we don't know the final ID outside.
          // Hack: we can schedule the update.
          setTimeout(() => setCurrentNodeId(curr), 0);
          
          return nextNodes;
      });
  }, [chess, currentNodeId]);

  return { 
    fen: currentNode.fen, 
    turn, 
    move, 
    dests, 
    history, 
    currentMoveIndex, 
    jumpToMove,
    nodes,
    currentNode,
    goToNode,
    lastMove,
    loadPgn,
    exportPgn,
    goBack,
    goForward,
    goToStart,
    goToEnd,
    playSan,
    playLine
  };
};

export default useGame;