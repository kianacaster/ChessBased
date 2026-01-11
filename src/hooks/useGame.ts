import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chessops/chess';
import { parseUci } from 'chessops/util';
import { chessgroundDests as toDests } from 'chessops/compat';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSan, parseSan } from 'chessops/san';
import type { NormalMove } from 'chessops/types';
import type { TreeNode, DrawShape } from '../types/chess';
import type { GameHeader } from '../types/app';

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
  nodes: Record<string, TreeNode>;
  currentNode: TreeNode;
  goToNode: (id: string) => void;
  lastMove?: [string, string];
  gameMetadata: GameHeader | null;
  
  exportPgn: () => string;
  goBack: () => void;
  goForward: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  playSan: (san: string) => boolean;
  playLine: (sanMoves: string[]) => void;

  setNodeComment: (id: string, comment: string) => void;
  setNodeNags: (id: string, nags: number[]) => void;
  setNodeShapes: (id: string, shapes: DrawShape[]) => void;
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
        comments: [],
        nags: [],
        shapes: []
      }
    };
  });
  
  const [rootId, setRootId] = useState(() => Object.keys(nodes)[0]);
  const [currentNodeId, setCurrentNodeId] = useState(() => Object.keys(nodes)[0]);
  const [gameMetadata, setGameMetadata] = useState<GameHeader | null>(null); 

  const setNodeComment = useCallback((id: string, comment: string) => {
    setNodes(prev => {
        if (!prev[id]) return prev;
        return {
            ...prev,
            [id]: { ...prev[id], comments: [comment] }
        };
    });
  }, []);

  const setNodeNags = useCallback((id: string, nags: number[]) => {
      setNodes(prev => {
        if (!prev[id]) return prev;
        return {
            ...prev,
            [id]: { ...prev[id], nags }
        };
      });
  }, []);

  const setNodeShapes = useCallback((id: string, shapes: DrawShape[]) => {
      setNodes(prev => {
        if (!prev[id]) return prev;
        return {
            ...prev,
            [id]: { ...prev[id], shapes }
        };
      });
  }, []);

  const getPath = useCallback((targetId: string, currentNodes: Record<string, TreeNode>) => {
    const path: TreeNode[] = [];
    let curr: TreeNode | undefined = currentNodes[targetId];
    let depth = 0;
    while (curr && depth < 1000) {
      path.unshift(curr);
      if (!curr.parentId) break;
      curr = currentNodes[curr.parentId];
      depth++;
    }
    return path;
  }, []);

  const currentNode = nodes[currentNodeId] || nodes[rootId];
  
  const chess = useMemo(() => {
    try {
      const setup = parseFen(currentNode.fen).unwrap();
      return Chess.fromSetup(setup).unwrap();
    } catch {
      console.error("Failed to parse FEN:", currentNode.fen);
      return Chess.default();
    }
  }, [currentNode.fen]);

  const turn = chess.turn;
  const dests = useMemo(() => toDests(chess), [chess]);

  const historyPath = useMemo(() => getPath(currentNodeId, nodes), [currentNodeId, nodes, getPath]);
  
  const history = useMemo(() => {
    return historyPath
      .slice(1)
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

    const existingChildId = currentNode.children.find(childId => {
      const child = nodes[childId];
      return child.move?.uci === uciString;
    });

    if (existingChildId) {
      setCurrentNodeId(existingChildId);
      return true;
    }

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
      comments: [],
      nags: [],
      shapes: []
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
    if (index < -1) return;
    if (index === -1) {
      setCurrentNodeId(rootId);
      return;
    }
    
    const targetNode = historyPath[index + 1];
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
      const headerRegex = /\s*\[(\w+)\s+"(.*?)"\]/g;
      let match;
      const headers: any = {};
      while ((match = headerRegex.exec(pgn)) !== null) {
          headers[match[1]] = match[2];
      }
      setGameMetadata(headers as GameHeader);
      
      const body = pgn.replace(/\s*\[.*?\]/gs, '');
      
      const regex = /\{([\s\S]*?)\}|(\$\d+)|\(|\)|(\d+\.+)|([-a-zA-Z0-9+=#]+)|(\*|1-0|0-1|1\/2-1\/2)/g;
      
      const newRootId = generateId();
      const newNodes: Record<string, TreeNode> = {
          [newRootId]: {
              id: newRootId,
              fen: initialFen,
              children: [],
              parentId: null,
              comments: [],
              nags: [],
              shapes: []
          }
      };
      
      let currentId = newRootId;
      const currentChess = Chess.default();
      let variationDepth = 0; 
      
      let token;
      while ((token = regex.exec(body)) !== null) {
          const [full, comment, nag, moveNum, san, result] = token;
          
          if (comment) {
              if (variationDepth === 0) {
                  let text = comment.trim();
                  const shapes: DrawShape[] = [];
                  
                  const shapeRegex = /\s*\[% (cal|csl)\s+(.*?) \]/g;
                  let shapeMatch;
                  while ((shapeMatch = shapeRegex.exec(text)) !== null) {
                      const type = shapeMatch[1];
                      const data = shapeMatch[2].split(',');
                      data.forEach(d => {
                         d = d.trim();
                         if (!d) return;
                         const colorCode = d.charAt(0);
                         const rest = d.substring(1);
                         
                         let brush = 'green';
                         if (colorCode === 'R') brush = 'red';
                         if (colorCode === 'B') brush = 'blue';
                         if (colorCode === 'Y') brush = 'yellow';
                         
                         if (type === 'cal' && rest.length >= 4) {
                             const orig = rest.substring(0, 2);
                             const dest = rest.substring(2, 4);
                             shapes.push({ orig, dest, brush });
                         } else if (type === 'csl' && rest.length >= 2) {
                             const orig = rest.substring(0, 2);
                             shapes.push({ orig, brush });
                         }
                      });
                  }
                  
                  text = text.replace(/\s*\[% (cal|csl)\s+.*? \]/g, '').trim();
                  
                  const node = newNodes[currentId];
                  if (node) {
                      if (text) node.comments.push(text);
                      if (shapes.length > 0) node.shapes = [...(node.shapes || []), ...shapes];
                  }
              }
          } else if (nag) {
               if (variationDepth === 0) {
                   const nagCode = parseInt(nag.substring(1));
                   const node = newNodes[currentId];
                   if (node) {
                       node.nags = [...(node.nags || []), nagCode];
                   }
               }
          } else if (full === '(') {
              variationDepth++;
          } else if (full === ')') {
              if (variationDepth > 0) variationDepth--;
          } else if (moveNum) {
              // Ignore
          } else if (result) {
              // Ignore
          } else if (san) {
              if (variationDepth === 0) {
                  try {
                       const sanMove = parseSan(currentChess, san) as NormalMove;
                       if (sanMove) {
                           const file = (s: number) => 'abcdefgh'[s & 7];
                           const rank = (s: number) => '12345678'[s >> 3];
                           const from = file(sanMove.from) + rank(sanMove.from);
                           const to = file(sanMove.to) + rank(sanMove.to);
                           const prom = sanMove.promotion || '';
                           const uci = from + to + prom;
                           
                           currentChess.play(sanMove);
                           const newFen = makeFen(currentChess.toSetup());
                           const newNodeId = generateId();
                           
                           const newNode: TreeNode = {
                               id: newNodeId,
                               fen: newFen,
                               move: { uci, san },
                               children: [],
                               parentId: currentId,
                               comments: [],
                               nags: [],
                               shapes: []
                           };
                           
                           newNodes[currentId].children.push(newNodeId);
                           newNodes[newNodeId] = newNode;
                           currentId = newNodeId;
                       }
                  } catch {
                      console.warn('Move parse error', san);
                  }
              }
          }
      }
      
      setNodes(newNodes);
      setRootId(newRootId);
      setCurrentNodeId(newRootId);
      
  }, []);

  const exportPgn = useCallback(() => {
      let pgn = '';
      if (gameMetadata) {
          Object.entries(gameMetadata).forEach(([key, value]) => {
              if (key !== 'pgn' && key !== 'id') {
                 pgn += `[${key} "${value}"]\n`;
              }
          });
          if (!gameMetadata.Date) {
               pgn += '[Date "' + new Date().toISOString().split('T')[0].replace(/-/g, '.') + '"]\n';
          }
      } else {
          pgn = '[Event "Casual Game"]\n[Site "ChessBased Clone"]\n[Date "' + new Date().toISOString().split('T')[0].replace(/-/g, '.') + '"]\n';
          pgn += '[White "White"]\n[Black "Black"]\n[Result "*"]\n\n';
      }
      
      const moves = historyPath.slice(1);
      
      let moveString = '';
      moves.forEach((node, i) => {
          const moveNumber = Math.floor(i / 2) + 1;
          const isWhite = i % 2 === 0;
          
          if (isWhite) {
              moveString += `${moveNumber}. ${node.move?.san} `;
          } else {
              moveString += `${node.move?.san} `;
          }
          
          if (node.nags && node.nags.length > 0) {
              moveString += node.nags.map(n => `$${n}`).join(' ') + ' ';
          }
          
          const comments = node.comments || [];
          const shapes = node.shapes || [];
          
          let commentString = comments.join(' ').trim();
          
          if (shapes.length > 0) {
              const arrows: string[] = [];
              const circles: string[] = [];
              
              shapes.forEach(shape => {
                  let c = 'G'; 
                  const b = shape.brush || 'green';
                  
                  if (b === 'red' || b === 'paleRed') c = 'R';
                  else if (b === 'blue' || b === 'paleBlue') c = 'B';
                  else if (b === 'yellow') c = 'Y';
                  else if (b === 'green' || b === 'paleGreen') c = 'G';
                  
                  if (shape.dest) {
                      arrows.push(`${c}${shape.orig}${shape.dest}`);
                  } else {
                      circles.push(`${c}${shape.orig}`);
                  }
              });
              
              let shapeCmds = '';
              if (arrows.length > 0) shapeCmds += `[%cal ${arrows.join(',')}]`;
              if (circles.length > 0) shapeCmds += ` ${circles.length > 0 && arrows.length > 0 ? '' : ''}[%csl ${circles.join(',')}]`;
              
              if (commentString) {
                  commentString += ' ' + shapeCmds.trim();
              } else {
                  commentString = shapeCmds.trim();
              }
          }
          
          if (commentString) {
              moveString += `{ ${commentString} } `;
          }
      });
      
      return pgn + moveString.trim() + ' *';
  }, [historyPath, gameMetadata]);

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
      while (curr.children.length > 0) {
          curr = nodes[curr.children[0]];
      }
      setCurrentNodeId(curr.id);
  }, [currentNode, nodes]);

  const playSan = useCallback((san: string) => {
      try {
          const moveObj = parseSan(chess, san) as NormalMove;
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
      const tempChess = chess.clone();
      const startId = currentNodeId;

      setNodes(prev => {
          const nextNodes = { ...prev };
          let curr = startId;
          
          for (const san of sanMoves) {
              try {
                  const moveObj = parseSan(tempChess, san) as NormalMove;
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
                      comments: [],
                      nags: [],
                      shapes: []
                  };
                  
                  nextNodes[curr] = { ...nextNodes[curr], children: [...nextNodes[curr].children, newNodeId] };
                  nextNodes[newNodeId] = newNode;
                  curr = newNodeId;
              } catch (e) {
                  console.warn("playLine error on move", san, e);
                  break;
              }
          }
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
    playLine,
    gameMetadata,
    setNodeComment,
    setNodeNags,
    setNodeShapes
  };
};

export default useGame;
