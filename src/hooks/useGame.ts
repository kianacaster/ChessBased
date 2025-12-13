import { useState, useCallback, useMemo, useEffect } from 'react';
import { Chess } from 'chessops/chess';
import { parseUci } from 'chessops/util';
import { chessgroundDests as toDests } from 'chessops/compat';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import type { NormalMove } from 'chessops/types';
import type { TreeNode } from '../types/chess';

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
  // Tree API
  nodes: Record<string, TreeNode>;
  currentNode: TreeNode;
  goToNode: (id: string) => void;
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
  const [rootId] = useState(() => Object.keys(nodes)[0]);
  const [currentNodeId, setCurrentNodeId] = useState(() => Object.keys(nodes)[0]);

  useEffect(() => {
    console.log('Current Node ID:', currentNodeId);
    console.log('Nodes count:', Object.keys(nodes).length);
  }, [currentNodeId, nodes]);

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
    if (!uciMove) return false;
    
    if (!('from' in uciMove) || !('to' in uciMove)) return false; 
    
    const tempChess = chess.clone();
    const legalDests = toDests(tempChess);
    const movesFromOrig = legalDests.get(orig as any);
    
    if (!movesFromOrig?.includes(dest as any)) return false;

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
    goToNode
  };
};

export default useGame;