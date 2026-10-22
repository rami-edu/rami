import React, { useState, useEffect, useRef } from 'react';

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
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
        <circle cx="50" cy="50" r="42" fill={c} stroke="#ffffff" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'square',
    name: 'Square',
    color: '#3a86ff',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
        <rect x="12" y="12" width="76" height="76" rx="14" fill={c} stroke="#ffffff" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'triangle',
    name: 'Triangle',
    color: '#ff006e',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
        <polygon points="50,10 90,85 10,85" fill={c} stroke="#ffffff" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'star',
    name: 'Star',
    color: '#ffd166',
    renderSvg: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
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
      <svg width={s} height={s} viewBox="0 0 100 100" className="shape-svg">
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

interface DragState {
  shape: ShapeDef;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

const getRandomRound = () => {
  const shuffled = [...ALL_SHAPES].sort(() => 0.5 - Math.random());
  const targets = shuffled.slice(0, 3);
  const choices = [...targets].sort(() => 0.5 - Math.random());
  return { targets, choices };
};

export const GeometryShapesActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [initialRound] = useState(() => getRandomRound());
  const [targetShapes, setTargetShapes] = useState<ShapeDef[]>(initialRound.targets);
  const [filledSocketIds, setFilledSocketIds] = useState<Set<string>>(new Set());
  const [availableChoices, setAvailableChoices] = useState<ShapeDef[]>(initialRound.choices);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredSocketId, setHoveredSocketId] = useState<string | null>(null);
  const [justSnappedId, setJustSnappedId] = useState<string | null>(null);

  const socketRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const suppressClickUntilRef = useRef<number>(0);

  // Setup a new puzzle round
  const setupRound = () => {
    const { targets, choices } = getRandomRound();
    setTargetShapes(targets);
    setFilledSocketIds(new Set());
    setAvailableChoices(choices);
    setDragState(null);
    setHoveredSocketId(null);
    setJustSnappedId(null);
  };

  const placePieceInSocket = (shapeId: string) => {
    const nextFilled = new Set(filledSocketIds);
    nextFilled.add(shapeId);
    setFilledSocketIds(nextFilled);
    setJustSnappedId(shapeId);
    window.setTimeout(() => setJustSnappedId(null), 500);

    // Remove from available choices
    setAvailableChoices((prev) => prev.filter((p) => p.id !== shapeId));

    if (nextFilled.size === targetShapes.length) {
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1100);
    }
  };

  const handleSelectPiece = (piece: ShapeDef) => {
    // Check if there is an unfilled socket for this shape
    if (targetShapes.some((s) => s.id === piece.id) && !filledSocketIds.has(piece.id)) {
      placePieceInSocket(piece.id);
    } else {
      onMistake();
    }
  };

  const handlePointerDown = (shape: ShapeDef, e: React.PointerEvent) => {
    // Only accept primary button / touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    setDragState({
      shape,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDragging: false
    });
  };

  // Find socket closest to (clientX, clientY) within generous toddler hit radius
  const getSocketAtPoint = (x: number, y: number): string | null => {
    for (const target of targetShapes) {
      if (filledSocketIds.has(target.id)) continue;
      const el = socketRefs.current[target.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(x - centerX, y - centerY);
      const hitRadius = Math.max(rect.width, rect.height) * 0.65 + 24;
      if (dist <= hitRadius) {
        return target.id;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
      const isDragging = dragState.isDragging || dist >= 6;

      const hoveredId = isDragging ? getSocketAtPoint(e.clientX, e.clientY) : null;
      setHoveredSocketId(hoveredId);

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              isDragging
            }
          : null
      );
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
      const wasDragging = dragState.isDragging || dist >= 6;

      // Suppress subsequent synthetic click events
      suppressClickUntilRef.current = Date.now() + 350;

      if (!wasDragging) {
        // Tap/click interaction
        handleSelectPiece(dragState.shape);
      } else {
        // Drag release interaction
        const droppedSocketId = getSocketAtPoint(e.clientX, e.clientY);
        if (droppedSocketId) {
          if (droppedSocketId === dragState.shape.id) {
            // Correct socket match!
            placePieceInSocket(dragState.shape.id);
          } else {
            // Dropped on incorrect socket
            onMistake();
          }
        }
        // Dropping into empty space cancels drag smoothly with no penalty
      }

      setDragState(null);
      setHoveredSocketId(null);
    };

    const handlePointerCancel = () => {
      setDragState(null);
      setHoveredSocketId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [dragState, targetShapes, filledSocketIds]);

  return (
    <div className="shape-nest-container">
      {/* Sockets Row (Silhouettes in wooden nests) */}
      <div className="shape-sockets-row">
        {targetShapes.map((shape) => {
          const isFilled = filledSocketIds.has(shape.id);
          const isHovered = hoveredSocketId === shape.id;
          const isMatchHover = isHovered && dragState?.shape.id === shape.id;
          const isWrongHover = isHovered && dragState?.shape.id !== shape.id;
          const isJustSnapped = justSnappedId === shape.id;

          const socketClasses = [
            'shape-socket',
            isFilled ? 'filled' : '',
            isMatchHover ? 'drag-hover-match' : '',
            isWrongHover ? 'drag-hover-wrong' : '',
            isJustSnapped ? 'socket-snapped' : ''
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={shape.id}
              ref={(el) => {
                socketRefs.current[shape.id] = el;
              }}
              className={socketClasses}
              aria-label={`${shape.name} socket ${isFilled ? 'filled' : 'empty'}`}
            >
              {isFilled
                ? shape.renderSvg(80, shape.color)
                : shape.renderSvg(76, isMatchHover ? shape.color : 'rgba(149, 213, 178, 0.22)')}
            </div>
          );
        })}
      </div>

      {/* Available choices to tap or drag */}
      <div className="shape-choices-row">
        {availableChoices.map((shape) => {
          const isBeingDragged = dragState?.shape.id === shape.id && dragState.isDragging;

          return (
            <button
              key={shape.id}
              type="button"
              className={`shape-piece ${isBeingDragged ? 'is-dragged' : ''}`}
              onPointerDown={(e) => handlePointerDown(shape, e)}
              onClick={() => {
                // Ensure keyboard Enter / Space triggers selection
                if (Date.now() > suppressClickUntilRef.current) {
                  handleSelectPiece(shape);
                }
              }}
              aria-label={`Select or drag ${shape.name}`}
            >
              {shape.renderSvg(82, shape.color)}
            </button>
          );
        })}
      </div>

      {/* Floating Drag Avatar following cursor / finger */}
      {dragState && dragState.isDragging && (
        <div
          className="shape-piece-floating"
          style={{
            left: `${dragState.currentX}px`,
            top: `${dragState.currentY}px`
          }}
        >
          {dragState.shape.renderSvg(90, dragState.shape.color)}
        </div>
      )}
    </div>
  );
};
