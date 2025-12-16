export interface DrawShape {
  orig: string;
  dest?: string; // If present, it's an arrow. If absent, it's a circle.
  brush?: string; // Color/style (e.g., 'green', 'red', 'blue', 'yellow')
}

export interface TreeNode {
  id: string;
  fen: string; // Position at this node
  move?: { // The move that led to this node (undefined for root)
    uci: string;
    san: string;
  };
  children: string[]; // IDs of children nodes
  parentId: string | null; // ID of parent node
  comments: string[];
  nags?: number[]; // Numeric Annotation Glyphs (e.g. 1 for !, 2 for ?, etc.)
  shapes?: DrawShape[]; // User-drawn shapes
}