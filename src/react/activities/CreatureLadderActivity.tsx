import React, { useState, useEffect, useRef } from 'react';

export interface SizedCreature {
  id: string;
  name: string;
  emoji: string;
  sizeRank: number; // 1: small, 2: medium, 3: big
  displaySizePx: number;
}

export const ALL_SIZED_CREATURES: SizedCreature[] = [
  { id: 'ladybug', name: 'Ladybug', emoji: '🐞', sizeRank: 1, displaySizePx: 44 },
  { id: 'frog', name: 'Frog', emoji: '🐸', sizeRank: 1, displaySizePx: 48 },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰', sizeRank: 2, displaySizePx: 64 },
  { id: 'fox', name: 'Fox', emoji: '🦊', sizeRank: 2, displaySizePx: 68 },
  { id: 'bear', name: 'Bear', emoji: '🐻', sizeRank: 3, displaySizePx: 88 },
  { id: 'whale', name: 'Whale', emoji: '🐋', sizeRank: 3, displaySizePx: 92 }
];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

interface DragState {
  creature: SizedCreature;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

export const CreatureLadderActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  // Slots 0: Small (bottom), 1: Medium (middle), 2: Big (top)
  const [ladderSlots, setLadderSlots] = useState<(SizedCreature | null)[]>([null, null, null]);
  const [availableChoices, setAvailableChoices] = useState<SizedCreature[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);
  const [justSnappedSlot, setJustSnappedSlot] = useState<number | null>(null);
  const [nudgeCreatureId, setNudgeCreatureId] = useState<string | null>(null);

  const rungRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const setupRound = () => {
    // Pick 1 small (rank 1), 1 medium (rank 2), 1 big (rank 3)
    const smalls = ALL_SIZED_CREATURES.filter((c) => c.sizeRank === 1).sort(() => 0.5 - Math.random());
    const mediums = ALL_SIZED_CREATURES.filter((c) => c.sizeRank === 2).sort(() => 0.5 - Math.random());
    const bigs = ALL_SIZED_CREATURES.filter((c) => c.sizeRank === 3).sort(() => 0.5 - Math.random());

    const selected = [smalls[0], mediums[0], bigs[0]];
    setLadderSlots([null, null, null]);
    // Choices shuffled
    setAvailableChoices([...selected].sort(() => 0.5 - Math.random()));
    setDragState(null);
    setHoveredSlotIndex(null);
    setJustSnappedSlot(null);
    setNudgeCreatureId(null);
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handlePointerDown = (creature: SizedCreature, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    setDragState({
      creature,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDragging: false
    });
  };

  // Find ladder rung closest to (clientX, clientY) within generous toddler hit radius
  const getRungAtPoint = (x: number, y: number): number | null => {
    for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
      if (ladderSlots[slotIdx] !== null) continue; // already filled
      const el = rungRefs.current[slotIdx];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(x - centerX, y - centerY);
      const hitRadius = Math.max(rect.width, rect.height) * 0.7 + 30;
      if (dist <= hitRadius) {
        return slotIdx;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
      const isDragging = dragState.isDragging || dist >= 6;

      const hoveredIdx = isDragging ? getRungAtPoint(e.clientX, e.clientY) : null;
      setHoveredSlotIndex(hoveredIdx);

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

      if (!wasDragging) {
        // Tap/click: ONLY drag-and-drop allowed!
        // Show gentle hint nudge so the child knows to drag
        setNudgeCreatureId(dragState.creature.id);
        window.setTimeout(() => {
          setNudgeCreatureId((curr) => (curr === dragState.creature.id ? null : curr));
        }, 600);
      } else {
        // Drag release interaction
        const droppedSlotIdx = getRungAtPoint(e.clientX, e.clientY);
        if (droppedSlotIdx !== null) {
          const expectedRank = droppedSlotIdx + 1;
          if (dragState.creature.sizeRank === expectedRank) {
            // Correct match on ladder!
            const nextSlots = [...ladderSlots];
            nextSlots[droppedSlotIdx] = dragState.creature;
            setLadderSlots(nextSlots);
            setJustSnappedSlot(droppedSlotIdx);
            window.setTimeout(() => setJustSnappedSlot(null), 500);

            // Remove from available choices
            setAvailableChoices((prev) => prev.filter((c) => c.id !== dragState.creature.id));

            if (nextSlots.every((s) => s !== null)) {
              onSolved();
              window.setTimeout(() => {
                setupRound();
              }, 1200);
            }
          } else {
            // Dropped onto wrong rung
            onMistake();
          }
        }
        // Dropping into empty space cancels drag smoothly with no penalty
      }

      setDragState(null);
      setHoveredSlotIndex(null);
    };

    const handlePointerCancel = () => {
      setDragState(null);
      setHoveredSlotIndex(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [dragState, ladderSlots]);

  return (
    <div className="creature-ladder-container">
      {/* Wooden Ladder (Top: Big [2], Middle: Medium [1], Bottom: Small [0]) */}
      <div className="ladder-stand">
        {[2, 1, 0].map((slotIdx) => {
          const creature = ladderSlots[slotIdx];
          const expectedRank = slotIdx + 1;
          const rungWidth = 110 + slotIdx * 45; // 110px (small), 155px (medium), 200px (big)
          const isFilled = creature !== null;
          const isHovered = hoveredSlotIndex === slotIdx;
          const isMatchHover = isHovered && dragState?.creature.sizeRank === expectedRank;
          const isWrongHover = isHovered && dragState?.creature.sizeRank !== expectedRank;
          const isJustSnapped = justSnappedSlot === slotIdx;

          const rungClasses = [
            'ladder-rung',
            isFilled ? 'filled' : '',
            isMatchHover ? 'drag-hover-match' : '',
            isWrongHover ? 'drag-hover-wrong' : '',
            isJustSnapped ? 'rung-snapped' : ''
          ]
            .filter(Boolean)
            .join(' ');

          const rankIcon = expectedRank === 1 ? '🌱' : expectedRank === 2 ? '🌿' : '🌳';
          const rankLabel = expectedRank === 1 ? 'Small' : expectedRank === 2 ? 'Medium' : 'Big';

          return (
            <div
              key={slotIdx}
              ref={(el) => {
                rungRefs.current[slotIdx] = el;
              }}
              className={rungClasses}
              style={{
                width: `${rungWidth}px`
              }}
              aria-label={`Ladder rung for ${rankLabel} creature ${isFilled ? `filled with ${creature.name}` : 'empty'}`}
            >
              {creature ? (
                <span style={{ fontSize: `${creature.displaySizePx}px`, lineHeight: 1 }}>
                  {creature.emoji}
                </span>
              ) : (
                <div className="ladder-rung-placeholder">
                  <span style={{ opacity: 0.45, fontSize: `${24 + slotIdx * 8}px` }}>{rankIcon}</span>
                  <span className="ladder-rung-size-label">{rankLabel}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Available Creatures to drag onto the ladder */}
      <div className="creature-choices-col">
        {availableChoices.map((c) => {
          const isBeingDragged = dragState?.creature.id === c.id && dragState.isDragging;
          const isNudged = nudgeCreatureId === c.id;

          return (
            <button
              key={c.id}
              type="button"
              className={`shape-piece ${isBeingDragged ? 'is-dragged' : ''} ${isNudged ? 'drag-hint-nudge' : ''}`}
              style={{ width: '96px', height: '96px' }}
              onPointerDown={(e) => handlePointerDown(c, e)}
              onClick={() => {
                // Tapping/clicking is disabled - hint to drag
                setNudgeCreatureId(c.id);
                window.setTimeout(() => {
                  setNudgeCreatureId((curr) => (curr === c.id ? null : curr));
                }, 600);
              }}
              aria-label={`Drag ${c.name} onto the ladder`}
            >
              <span style={{ fontSize: `${c.displaySizePx}px`, pointerEvents: 'none' }}>{c.emoji}</span>
            </button>
          );
        })}
      </div>

      {/* Floating Drag Avatar following cursor / finger */}
      {dragState && dragState.isDragging && (
        <div
          className="ladder-creature-piece-floating"
          style={{
            left: `${dragState.currentX}px`,
            top: `${dragState.currentY}px`
          }}
        >
          <span style={{ fontSize: `${dragState.creature.displaySizePx * 1.1}px`, pointerEvents: 'none' }}>
            {dragState.creature.emoji}
          </span>
        </div>
      )}
    </div>
  );
};
