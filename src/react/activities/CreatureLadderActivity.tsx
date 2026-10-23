import React, { useState, useRef } from 'react';
import { audioManager } from '../../managers/AudioManager';

export interface SizedCreature {
  id: string;
  name: string;
  emoji: string;
  sizeRank: number; // 1: small, 2: medium, 3: big
  displaySizePx: number;
}

export const ALL_SIZED_CREATURES: SizedCreature[] = [
  // Rank 1: Tiny/Small
  { id: 'ladybug', name: 'Ladybug', emoji: '🐞', sizeRank: 1, displaySizePx: 48 },
  { id: 'frog', name: 'Frog', emoji: '🐸', sizeRank: 1, displaySizePx: 52 },
  { id: 'caterpillar', name: 'Caterpillar', emoji: '🐛', sizeRank: 1, displaySizePx: 48 },
  { id: 'snail', name: 'Snail', emoji: '🐌', sizeRank: 1, displaySizePx: 50 },

  // Rank 2: Medium
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰', sizeRank: 2, displaySizePx: 76 },
  { id: 'fox', name: 'Fox', emoji: '🦊', sizeRank: 2, displaySizePx: 78 },
  { id: 'hedgehog', name: 'Hedgehog', emoji: '🦔', sizeRank: 2, displaySizePx: 74 },
  { id: 'squirrel', name: 'Squirrel', emoji: '🐿️', sizeRank: 2, displaySizePx: 76 },

  // Rank 3: Big/Giant
  { id: 'bear', name: 'Bear', emoji: '🐻', sizeRank: 3, displaySizePx: 110 },
  { id: 'whale', name: 'Whale', emoji: '🐋', sizeRank: 3, displaySizePx: 112 },
  { id: 'elephant', name: 'Elephant', emoji: '🐘', sizeRank: 3, displaySizePx: 114 },
  { id: 'lion', name: 'Lion', emoji: '🦁', sizeRank: 3, displaySizePx: 108 }
];

export const generateCreatureRound = (): SizedCreature[] => {
  const smalls = ALL_SIZED_CREATURES.filter((c) => c.sizeRank === 1).sort(() => 0.5 - Math.random());
  const mediums = ALL_SIZED_CREATURES.filter((c) => c.sizeRank === 2).sort(() => 0.5 - Math.random());
  const bigs = ALL_SIZED_CREATURES.filter((c) => c.sizeRank === 3).sort(() => 0.5 - Math.random());

  const selected = [smalls[0], mediums[0], bigs[0]];

  // Guarantee an initially unsorted permutation
  const unsortedPermutations = [
    [selected[1], selected[0], selected[2]], // [2, 1, 3]
    [selected[2], selected[0], selected[1]], // [3, 1, 2]
    [selected[2], selected[1], selected[0]], // [3, 2, 1]
    [selected[0], selected[2], selected[1]], // [1, 3, 2]
    [selected[1], selected[2], selected[0]]  // [2, 3, 1]
  ];

  return unsortedPermutations[Math.floor(Math.random() * unsortedPermutations.length)];
};

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const CreatureLadderActivityComponent: React.FC<Props> = ({ onSolved }) => {
  const [creatures, setCreatures] = useState<SizedCreature[]>(() => generateCreatureRound());
  const [isSolved, setIsSolved] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  const dragStartRef = useRef<{ x: number; y: number; index: number } | null>(null);
  const hasMovedRef = useRef(false);
  const slotRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const setupRound = () => {
    setIsSolved(false);
    setSelectedSlot(null);
    setDraggedIndex(null);
    setDragPos(null);
    setIsDragging(false);
    setHoveredSlotIndex(null);
    hasMovedRef.current = false;
    dragStartRef.current = null;
    setCreatures(generateCreatureRound());
  };

  const checkAndApplySwap = (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx) return;

    const next = [...creatures];
    const temp = next[sourceIdx];
    next[sourceIdx] = next[targetIdx];
    next[targetIdx] = temp;
    setCreatures(next);

    // Check if sorted from smallest to largest: rank 1, rank 2, rank 3
    const isSorted = next.every((c, i) => i === 0 || c.sizeRank >= next[i - 1].sizeRank);

    if (isSorted) {
      setIsSolved(true);
      audioManager.playPortalReturn();
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1400);
    }
  };

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    if (isSolved) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, index };
    hasMovedRef.current = false;
    setDraggedIndex(index);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || draggedIndex === null) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!hasMovedRef.current && Math.hypot(dx, dy) > 8) {
      hasMovedRef.current = true;
      setIsDragging(true);
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    }

    if (hasMovedRef.current) {
      setDragPos({ x: e.clientX, y: e.clientY });

      // Hit-test other slots
      let foundHover: number | null = null;
      for (let i = 0; i < creatures.length; i++) {
        const el = slotRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const pad = 20;
        if (
          e.clientX >= rect.left - pad &&
          e.clientX <= rect.right + pad &&
          e.clientY >= rect.top - pad &&
          e.clientY <= rect.bottom + pad
        ) {
          if (i !== dragStartRef.current.index) {
            foundHover = i;
          }
          break;
        }
      }
      setHoveredSlotIndex(foundHover);
    }
  };

  const handlePointerUp = (_index: number, e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const wasDragging = hasMovedRef.current;
    const sourceIdx = dragStartRef.current?.index ?? null;
    const targetIdx = hoveredSlotIndex;

    dragStartRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
    setDragPos(null);
    setDraggedIndex(null);
    setHoveredSlotIndex(null);

    if (wasDragging && sourceIdx !== null && targetIdx !== null) {
      checkAndApplySwap(sourceIdx, targetIdx);
    }
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
    setDragPos(null);
    setDraggedIndex(null);
    setHoveredSlotIndex(null);
  };

  const handleCardClick = (index: number) => {
    if (isSolved || hasMovedRef.current) return;

    if (selectedSlot === null) {
      setSelectedSlot(index);
    } else if (selectedSlot === index) {
      setSelectedSlot(null);
    } else {
      checkAndApplySwap(selectedSlot, index);
      setSelectedSlot(null);
    }
  };

  return (
    <div className="creature-ladder-container creature-sorting-container">
      {/* Sorting Meadow Stage: Animals Only */}
      <div className="creature-sort-stage">
        {/* Visual size flow guide: sprout -> leaf -> tree (Zero text) */}
        <div className="creature-size-flow-guide" aria-hidden="true">
          <span className="size-guide-step">🌱</span>
          <div className="size-guide-line">
            <span className="size-guide-arrow">→</span>
          </div>
          <span className="size-guide-step">🌿</span>
          <div className="size-guide-line">
            <span className="size-guide-arrow">→</span>
          </div>
          <span className="size-guide-step">🌳</span>
        </div>

        {/* Animal Sorting Row: In-place sortable cards */}
        <div className="creature-sort-row">
          {creatures.map((creature, idx) => {
            const isBeingDragged = isDragging && draggedIndex === idx;
            const isHoveredTarget = isDragging && hoveredSlotIndex === idx;
            const isSelected = selectedSlot === idx;

            return (
              <div
                key={creature.id}
                ref={(el) => {
                  slotRefs.current[idx] = el;
                }}
                className={`creature-sort-slot ${isHoveredTarget ? 'slot-hover-target' : ''}`}
                data-slot-index={idx}
              >
                {/* The Animal Card sitting in place */}
                <div
                  className={`creature-sort-card ${isBeingDragged ? 'is-dragged-origin' : ''} ${isSelected ? 'is-selected' : ''} ${isSolved ? 'solved-bounce' : ''}`}
                  onPointerDown={(e) => handlePointerDown(idx, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => handlePointerUp(idx, e)}
                  onPointerCancel={handlePointerCancel}
                  onClick={() => handleCardClick(idx)}
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                  aria-label={`${creature.name}, rank ${creature.sizeRank}`}
                >
                  {/* Proportional Animal Display */}
                  <span
                    className="creature-emoji"
                    style={{
                      fontSize: `${creature.displaySizePx}px`
                    }}
                  >
                    {creature.emoji}
                  </span>

                  {/* Natural pedestal base and sheen */}
                  <div className="creature-pedestal" />
                  <div className="creature-card-sheen" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Celebration Sparkles on Solution */}
        {isSolved && (
          <div className="creature-celebration-sparkles">
            <span>✨</span>
            <span style={{ animationDelay: '0.2s' }}>🌟</span>
            <span style={{ animationDelay: '0.4s' }}>✨</span>
          </div>
        )}
      </div>

      {/* Floating Drag Clone */}
      {isDragging && draggedIndex !== null && dragPos && (
        <div
          className="creature-drag-clone"
          style={{
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`
          }}
        >
          <span
            style={{
              fontSize: `${creatures[draggedIndex].displaySizePx * 1.08}px`,
              lineHeight: 1
            }}
          >
            {creatures[draggedIndex].emoji}
          </span>
          <div className="creature-card-sheen" />
        </div>
      )}
    </div>
  );
};
