import React from 'react';

interface NotationProps {
  history: string[]; // e.g., ["e4", "e5", "Nf3", "Nc6"]
  currentMoveIndex: number;
  onMoveClick?: (index: number) => void;
}

const Notation: React.FC<NotationProps> = ({ history, currentMoveIndex, onMoveClick }) => {
  const moves = [];
  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = history[i];
    const blackMove = history[i + 1];

    moves.push(
      <div key={moveNumber} className="move-pair">
        <span className="move-number">{moveNumber}.</span>
        <span
          className={`move ${currentMoveIndex === i ? 'highlight' : ''}`}
          onClick={() => onMoveClick && onMoveClick(i)}
        >
          {whiteMove}
        </span>
        {blackMove && (
          <span
            className={`move ${currentMoveIndex === i + 1 ? 'highlight' : ''}`}
            onClick={() => onMoveClick && onMoveClick(i + 1)}
          >
            {blackMove}
          </span>
        )}
      </div>
    );
  }

  return <div className="notation-panel">{moves}</div>;
};

export default Notation;
