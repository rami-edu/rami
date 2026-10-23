import React, { useState, useRef } from 'react';
import { audioManager } from '../../managers/AudioManager';

export interface ShadowAnimal {
  id: string;
  name: string;
  emoji: string;
}

export const SHADOW_ANIMALS: ShadowAnimal[] = [
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰' },
  { id: 'deer', name: 'Deer', emoji: '🦌' },
  { id: 'owl', name: 'Owl', emoji: '🦉' },
  { id: 'butterfly', name: 'Butterfly', emoji: '🦋' },
  { id: 'bear', name: 'Bear', emoji: '🐻' },
  { id: 'squirrel', name: 'Squirrel', emoji: '🐿️' },
  { id: 'hedgehog', name: 'Hedgehog', emoji: '🦔' },
  { id: 'turtle', name: 'Turtle', emoji: '🐢' },
  { id: 'frog', name: 'Frog', emoji: '🐸' },
  { id: 'otter', name: 'Otter', emoji: '🦦' }
];

export interface ShadowRoundData {
  targetAnimal: ShadowAnimal;
  choices: ShadowAnimal[];
}

export const generateShadowRound = (): ShadowRoundData => {
  const shuffled = [...SHADOW_ANIMALS].sort(() => 0.5 - Math.random());
  const target = shuffled[0];
  const distractors = shuffled.slice(1, 3);
  const roundChoices = [target, ...distractors].sort(() => 0.5 - Math.random());

  return {
    targetAnimal: target,
    choices: roundChoices
  };
};

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const ShadowMatchActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [roundData, setRoundData] = useState<ShadowRoundData>(() => generateShadowRound());
  const [isRevealed, setIsRevealed] = useState(false);
  const [wobble, setWobble] = useState(false);
  const [wrongChoiceId, setWrongChoiceId] = useState<string | null>(null);

  // Drag-and-drop state
  const [draggedAnimal, setDraggedAnimal] = useState<ShadowAnimal | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTargetHovered, setIsTargetHovered] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const targetBoxRef = useRef<HTMLDivElement | null>(null);

  const setupRound = () => {
    setIsRevealed(false);
    setWobble(false);
    setWrongChoiceId(null);
    setDraggedAnimal(null);
    setDragPos(null);
    setIsDragging(false);
    setIsTargetHovered(false);
    hasMovedRef.current = false;
    dragStartRef.current = null;
    setRoundData(generateShadowRound());
  };

  const handleSelectAnimal = (choice: ShadowAnimal) => {
    if (isRevealed) return;

    if (choice.id === roundData.targetAnimal.id) {
      setIsRevealed(true);
      audioManager.playPortalReturn();
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1400);
    } else {
      setWrongChoiceId(choice.id);
      setWobble(true);
      onMistake();
      window.setTimeout(() => {
        setWrongChoiceId(null);
        setWobble(false);
      }, 600);
    }
  };

  // Drag-and-drop event handlers
  const handlePointerDown = (choice: ShadowAnimal, e: React.PointerEvent) => {
    if (isRevealed) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    setDraggedAnimal(choice);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !draggedAnimal) return;

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

      if (targetBoxRef.current) {
        const rect = targetBoxRef.current.getBoundingClientRect();
        const pad = 20;
        const isOver =
          e.clientX >= rect.left - pad &&
          e.clientX <= rect.right + pad &&
          e.clientY >= rect.top - pad &&
          e.clientY <= rect.bottom + pad;
        setIsTargetHovered(isOver);
      }
    }
  };

  const handlePointerUp = (choice: ShadowAnimal, e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const wasDragging = hasMovedRef.current;
    dragStartRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
    setDragPos(null);

    if (wasDragging) {
      if (targetBoxRef.current) {
        const rect = targetBoxRef.current.getBoundingClientRect();
        const pad = 30;
        const isOver =
          e.clientX >= rect.left - pad &&
          e.clientX <= rect.right + pad &&
          e.clientY >= rect.top - pad &&
          e.clientY <= rect.bottom + pad;

        if (isOver) {
          handleSelectAnimal(choice);
        }
      }
      setDraggedAnimal(null);
      setIsTargetHovered(false);
    } else {
      setDraggedAnimal(null);
      setIsTargetHovered(false);
    }
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(false);
    setDragPos(null);
    setDraggedAnimal(null);
    setIsTargetHovered(false);
  };

  return (
    <div className="shadow-match-container">
      {/* Mystery Shadow Silhouette Target Stage: Warm illuminated parchment lightbox */}
      <div className="shadow-stage-frame">
        <div className="shadow-lantern-halo" />

        <div
          ref={targetBoxRef}
          className={`shadow-target-box ${isRevealed ? 'revealed' : ''} ${isTargetHovered ? 'drag-hover' : ''} ${wobble ? 'wobble' : ''}`}
          aria-label={
            isRevealed
              ? `Revealed ${roundData.targetAnimal.name}`
              : 'Shadow silhouette waiting for match'
          }
        >
          <span className="shadow-silhouette">{roundData.targetAnimal.emoji}</span>

          {isRevealed && (
            <div className="shadow-celebration-sparkles">
              <span>✨</span>
              <span style={{ animationDelay: '0.2s' }}>🌟</span>
              <span style={{ animationDelay: '0.4s' }}>✨</span>
            </div>
          )}
        </div>
      </div>

      {/* Full-color Animal Card Choices Shelf */}
      <div className="shadow-choices-shelf">
        <div className="shadow-choices-row shape-choices-row">
          {roundData.choices.map((a) => {
            const isBeingDragged = isDragging && draggedAnimal?.id === a.id;
            const isWobbling = wrongChoiceId === a.id;

            return (
              <button
                key={a.id}
                type="button"
                className={`shadow-animal-card shape-piece ${isBeingDragged ? 'is-dragged-origin' : ''} ${isWobbling ? 'wobble' : ''}`}
                onClick={() => {
                  if (!hasMovedRef.current) {
                    handleSelectAnimal(a);
                  }
                }}
                onPointerDown={(e) => handlePointerDown(a, e)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(a, e)}
                onPointerCancel={handlePointerCancel}
                aria-label={`Match ${a.name}`}
              >
                <span className="animal-card-emoji">{a.emoji}</span>
                <div className="animal-card-shine" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Drag Clone */}
      {isDragging && draggedAnimal && dragPos && (
        <div
          className="shadow-drag-clone"
          style={{
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`
          }}
        >
          <span className="drag-clone-animal">{draggedAnimal.emoji}</span>
        </div>
      )}
    </div>
  );
};
