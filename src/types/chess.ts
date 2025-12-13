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
}
