import React, { useState, useEffect } from 'react';

interface ShapeDef {
  id: string;
  name: string;
  color: string;
  renderSvg: (size: number, color: string) => React.ReactNode;
}

const ALL_SHAPES: ShapeDef[] = [
  {
    id: 'circle',
    name: 'Circle',
    color: '#ffbe0b',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill={c} stroke="#ffffff" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'square',
    name: 'Square',
    color: '#3a86ff',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100">
        <rect x="12" y="12" width="76" height="76" rx="14" fill={c} stroke="#ffffff" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'triangle',
    name: 'Triangle',
    color: '#ff006e',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100">
        <polygon points="50,10 90,85 10,85" fill={c} stroke="#ffffff" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'star',
    name: 'Star',
    color: '#ffd166',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100">
        <polygon
          points="50,8 63,35 94,37 70,57 78,88 50,71 22,88 30,57 6,37 37,35"
          fill={c}
          stroke="#ffffff"
          strokeWidth="4"
        />
      </svg>
    )
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    color: '#8338ec',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100">
        <polygon
          points="50,8 88,28 88,72 50,92 12,72 12,28"
          fill={c}
          stroke="#ffffff"
          strokeWidth="4"
        />
      </svg>
    )
  }
];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const GeometryShapesActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [targetShapes, setTargetShapes] = useState<ShapeDef[]>([]);
  const [filledSocketIds, setFilledSocketIds] = useState<Set<string>>(new Set());
  const [availableChoices, setAvailableChoices] = useState<ShapeDef[]>([]);

  // Setup a new puzzle round
  const setupRound = () => {
    // Pick 3 distinct shapes
    const shuffled = [...ALL_SHAPES].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    setTargetShapes(selected);
    setFilledSocketIds(new Set());
    // Choices in random order
    setAvailableChoices([...selected].sort(() => 0.5 - Math.random()));
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handleSelectPiece = (piece: ShapeDef) => {
    // Check if there is an unfilled socket for this shape
    if (targetShapes.some((s) => s.id === piece.id) && !filledSocketIds.has(piece.id)) {
      const nextFilled = new Set(filledSocketIds);
      nextFilled.add(piece.id);
      setFilledSocketIds(nextFilled);

      // Remove from available choices
      setAvailableChoices((prev) => prev.filter((p) => p.id !== piece.id));

      if (nextFilled.size === targetShapes.length) {
        onSolved();
        window.setTimeout(() => {
          setupRound();
        }, 1100);
      }
    } else {
      onMistake();
    }
  };

  return (
    <div className="shape-nest-container">
      {/* Sockets Row (Silhouettes in wooden nests) */}
      <div className="shape-sockets-row">
        {targetShapes.map((shape) => {
          const isFilled = filledSocketIds.has(shape.id);
          return (
            <div
              key={shape.id}
              className={`shape-socket ${isFilled ? 'filled' : ''}`}
            >
              {isFilled
                ? shape.renderSvg(80, shape.color)
                : shape.renderSvg(76, 'rgba(149, 213, 178, 0.22)')}
            </div>
          );
        })}
      </div>

      {/* Available choices to tap / match */}
      <div className="shape-choices-row">
        {availableChoices.map((shape) => (
          <button
            key={shape.id}
            type="button"
            className="shape-piece"
            onClick={() => handleSelectPiece(shape)}
            aria-label={shape.name}
          >
            {shape.renderSvg(82, shape.color)}
          </button>
        ))}
      </div>
    </div>
  );
};
