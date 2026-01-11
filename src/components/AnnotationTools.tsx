import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Trash2, MessageSquare } from 'lucide-react';
import type { TreeNode } from '../types/chess';

interface AnnotationToolsProps {
  currentNode: TreeNode;
  onUpdateComment: (id: string, comment: string) => void;
  onUpdateNags: (id: string, nags: number[]) => void;
  onClearShapes: (id: string) => void;
}

const NAGs = [
  { value: 1, label: '!', description: 'Good move', color: 'text-green-500' },
  { value: 2, label: '?', description: 'Mistake', color: 'text-orange-500' },
  { value: 3, label: '!!', description: 'Brilliant move', color: 'text-green-600 font-bold' },
  { value: 4, label: '??', description: 'Blunder', color: 'text-red-500 font-bold' },
  { value: 5, label: '!?', description: 'Interesting move', color: 'text-blue-500' },
  { value: 6, label: '?!', description: 'Dubious move', color: 'text-yellow-500' },
];

const AnnotationTools: React.FC<AnnotationToolsProps> = ({ currentNode, onUpdateComment, onUpdateNags, onClearShapes }) => {
  const [comment, setComment] = useState(currentNode.comments?.[0] || '');

  useEffect(() => {
    setComment(currentNode.comments?.[0] || '');
  }, [currentNode.id, currentNode.comments]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };
  
  const handleCommentBlur = () => {
      if (comment !== (currentNode.comments?.[0] || '')) {
        onUpdateComment(currentNode.id, comment);
      }
  };

  const toggleNag = (nagValue: number) => {
    const currentNags = currentNode.nags || [];
    let newNags;
    if (currentNags.includes(nagValue)) {
      newNags = currentNags.filter(n => n !== nagValue);
    } else {
      const exclusives = [1, 2, 3, 4, 5, 6];
      if (exclusives.includes(nagValue)) {
          newNags = currentNags.filter(n => !exclusives.includes(n)).concat(nagValue);
      } else {
          newNags = [...currentNags, nagValue];
      }
    }
    onUpdateNags(currentNode.id, newNags);
  };

  return (
    <div className="flex flex-col space-y-4 p-4 border-t border-border bg-sidebar-accent/10">
      <div className="flex items-center space-x-2">
         <MessageSquare size={16} className="text-muted-foreground" />
         <span className="text-xs font-semibold text-muted-foreground uppercase">Annotations</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {NAGs.map(nag => (
          <button
            key={nag.value}
            onClick={() => toggleNag(nag.value)}
            title={nag.description}
            className={clsx(
              "w-8 h-8 flex items-center justify-center rounded border transition-colors text-sm font-serif",
              currentNode.nags?.includes(nag.value) 
                ? "bg-background border-primary shadow-sm ring-1 ring-primary" 
                : "bg-sidebar hover:bg-background border-border",
               nag.color
            )}
          >
            {nag.label}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={handleCommentChange}
        onBlur={handleCommentBlur}
        placeholder="Add a comment to this position..."
        className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
      />
      
      {(currentNode.shapes && currentNode.shapes.length > 0) && (
          <button 
            onClick={() => onClearShapes(currentNode.id)}
            className="self-start text-xs text-red-400 hover:text-red-500 flex items-center space-x-1 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
          >
             <Trash2 size={12} />
             <span>Clear Drawings</span>
          </button>
      )}
    </div>
  );
};

export default AnnotationTools;
