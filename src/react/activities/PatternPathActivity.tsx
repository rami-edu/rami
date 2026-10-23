import React, { useState, useRef } from 'react';
import { audioManager } from '../../managers/AudioManager';

export interface PatternSymbol {
  id: string;
  name: string;
  emoji: string;
}

export const PATTERN_SYMBOLS: PatternSymbol[] = [
  { id: 'leaf', name: 'Leaf', emoji: '🍃' },
  { id: 'acorn', name: 'Acorn', emoji: '🌰' },
  { id: 'flower', name: 'Flower', emoji: '🌸' },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄' },
  { id: 'shell', name: 'Shell', emoji: '🐚' }
];

export interface RoundData {
  patternItems: PatternSymbol[];
  targetAnswer: PatternSymbol;
  choices: PatternSymbol[];
  patternType: string;
}

export const generatePatternRound = (): RoundData => {
  const shuffled = [...PATTERN_SYMBOLS].sort(() => 0.5 - Math.random());
  const patternTypes = ['AB', 'ABC', 'AABB'];
  const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];

  let seq: PatternSymbol[];
  let answer: PatternSymbol;

  if (patternType === 'ABC') {
    const [symA, symB, symC] = shuffled;
    // A -> B -> C -> A -> [ B ]
    seq = [symA, symB, symC, symA];
    answer = symB;
  } else if (patternType === 'AABB') {
    const [symA, symB] = shuffled;
    // A -> A -> B -> B -> [ A ]
    seq = [symA, symA, symB, symB];
    answer = symA;
  } else {
    // ABAB: A -> B -> A -> B -> [ A ]
    const [symA, symB] = shuffled;
    seq = [symA, symB, symA, symB];
    answer = symA;
  }

  // 3 choices: target answer + 2 distractors
  const distractors = PATTERN_SYMBOLS.filter((s) => s.id !== answer.id).sort(
    () => 0.5 - Math.random()
  );
  const choices = [answer, distractors[0], distractors[1]].sort(() => 0.5 - Math.random());

  return {
    patternItems: seq,
    targetAnswer: answer,
    choices,
    patternType
  };
};

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const PatternPathActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [roundData, setRoundData] = useState<RoundData>(() => generatePatternRound());
  const [isSolved, setIsSolved] = useState(false);
  const [placedSymbol, setPlacedSymbol] = useState<PatternSymbol | null>(null);
  const [wobble, setWobble] = useState(false);
  const [wrongChoiceId, setWrongChoiceId] = useState<string | null>(null);

  // Drag-and-drop state
  const [draggedItem, setDraggedItem] = useState<PatternSymbol | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTargetHovered, setIsTargetHovered] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const targetSocketRef = useRef<HTMLDivElement | null>(null);

  const setupRound = () => {
    setIsSolved(false);
    setPlacedSymbol(null);
    setWobble(false);
    setWrongChoiceId(null);
    setDraggedItem(null);
    setDragPos(null);
    setIsDragging(false);
    setIsTargetHovered(false);
    hasMovedRef.current = false;
    dragStartRef.current = null;
    setRoundData(generatePatternRound());
  };

  const handleSelectStone = (stone: PatternSymbol) => {
    if (isSolved) return;

    if (stone.id === roundData.targetAnswer.id) {
      setIsSolved(true);
      setPlacedSymbol(stone);
      audioManager.playPortalReturn();
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1400);
    } else {
      setWrongChoiceId(stone.id);
      setWobble(true);
      onMistake();
      window.setTimeout(() => {
        setWrongChoiceId(null);
        setWobble(false);
      }, 600);
    }
  };

  // Drag-and-drop event handlers
  const handlePointerDown = (choice: PatternSymbol, e: React.PointerEvent) => {
    if (isSolved) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    setDraggedItem(choice);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !draggedItem) return;

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

      if (targetSocketRef.current) {
        const rect = targetSocketRef.current.getBoundingClientRect();
        const pad = 18;
        const isOver =
          e.clientX >= rect.left - pad &&
          e.clientX <= rect.right + pad &&
          e.clientY >= rect.top - pad &&
          e.clientY <= rect.bottom + pad;
        setIsTargetHovered(isOver);
      }
    }
  };

  const handlePointerUp = (choice: PatternSymbol, e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const wasDragging = hasMovedRef.current;
    dragStartRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
    setDragPos(null);

    if (wasDragging) {
      if (targetSocketRef.current) {
        const rect = targetSocketRef.current.getBoundingClientRect();
        const pad = 26;
        const isOver =
          e.clientX >= rect.left - pad &&
          e.clientX <= rect.right + pad &&
          e.clientY >= rect.top - pad &&
          e.clientY <= rect.bottom + pad;

        if (isOver) {
          handleSelectStone(choice);
        }
      }
      setDraggedItem(null);
      setIsTargetHovered(false);
    } else {
      setDraggedItem(null);
      setIsTargetHovered(false);
    }
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
    setDragPos(null);
    setDraggedItem(null);
    setIsTargetHovered(false);
  };

  return (
    <div className="pattern-path-container">
      {/* Pattern Trail Section: Order-aligned continuous stepping path */}
      <div className="pattern-trail-section">
        <div className="pattern-trail-track">
          {/* Subtle guide connector line behind stepping stones */}
          <div className="pattern-trail-line" />

          {/* Stepping Stone Path: Guaranteed ALL symbols in the EXACT same row */}
          <div className="pattern-stones-row">
            {roundData.patternItems.map((item, idx) => (
              <React.Fragment key={idx}>
                <div
                  className="stepping-stone"
                  data-order={idx + 1}
                  aria-label={`${item.name} at step ${idx + 1}`}
                >
                  <span className="stone-emoji">{item.emoji}</span>
                  <span className="stone-order-pill">{idx + 1}</span>
                </div>
                {/* Order Flow Indicator Arrow */}
                <div className="pattern-order-arrow" aria-hidden="true">
                  →
                </div>
              </React.Fragment>
            ))}

            {/* Target Missing Stone: Sits in the exact same row at the end of the order */}
            <div
              ref={targetSocketRef}
              className={`stepping-stone empty ${isSolved ? 'filled snapped' : ''} ${isTargetHovered ? 'drag-hover' : ''} ${wobble ? 'wobble' : ''}`}
              data-order={roundData.patternItems.length + 1}
              aria-label={
                isSolved
                  ? `Completed with ${placedSymbol?.name || roundData.targetAnswer.name}`
                  : `Missing pattern symbol at step ${roundData.patternItems.length + 1}`
              }
            >
              {isSolved ? (
                <>
                  <span className="stone-emoji">
                    {placedSymbol?.emoji || roundData.targetAnswer.emoji}
                  </span>
                  <span className="stone-order-pill solved-pill">
                    {roundData.patternItems.length + 1}
                  </span>
                  <div className="stone-celebration-burst">✨</div>
                </>
              ) : (
                <>
                  <span className="stone-question-mark">?</span>
                  <span className="stone-order-pill empty-pill">
                    {roundData.patternItems.length + 1}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Choice Stones Shelf: Order-aligned single row below */}
      <div className="pattern-choices-shelf">
        <div className="pattern-choices-row shape-choices-row">
          {roundData.choices.map((c, idx) => {
            const isBeingDragged = isDragging && draggedItem?.id === c.id;
            const isWobbling = wrongChoiceId === c.id;

            return (
              <button
                key={idx}
                type="button"
                className={`pattern-choice-stone shape-piece ${isBeingDragged ? 'is-dragged-origin' : ''} ${isWobbling ? 'wobble' : ''}`}
                onClick={() => {
                  if (!hasMovedRef.current) {
                    handleSelectStone(c);
                  }
                }}
                onPointerDown={(e) => handlePointerDown(c, e)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(c, e)}
                onPointerCancel={handlePointerCancel}
                aria-label={c.name}
              >
                <span className="choice-emoji">{c.emoji}</span>
                <div className="choice-sheen" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Drag Clone */}
      {isDragging && draggedItem && dragPos && (
        <div
          className="pattern-drag-clone"
          style={{
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`
          }}
        >
          <span className="drag-clone-emoji">{draggedItem.emoji}</span>
        </div>
      )}
    </div>
  );
};
