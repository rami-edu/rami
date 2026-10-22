import React, { useState, useEffect } from 'react';

interface SizedCreature {
  id: string;
  name: string;
  emoji: string;
  sizeRank: number; // 1: small, 2: medium, 3: big
  displaySizePx: number;
}

const ALL_SIZED_CREATURES: SizedCreature[] = [
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

export const CreatureLadderActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [ladderSlots, setLadderSlots] = useState<(SizedCreature | null)[]>([null, null, null]);
  const [availableChoices, setAvailableChoices] = useState<SizedCreature[]>([]);

  const setupRound = () => {
    // Pick 1 small (rank 1), 1 medium (rank 2), 1 big (rank 3)
    const smalls = ALL_SIZED_CREATURES.filter((c) => c.sizeRank === 1).sort(() => 0.5 - Math.random());
    const mediums = ALL_SIZED_CREATURES.filter((c) => c.sizeRank === 2).sort(() => 0.5 - Math.random());
    const bigs = ALL_SIZED_CREATURES.filter((c) => c.sizeRank === 3).sort(() => 0.5 - Math.random());

    const selected = [smalls[0], mediums[0], bigs[0]];
    setLadderSlots([null, null, null]);
    // Choices shuffled
    setAvailableChoices([...selected].sort(() => 0.5 - Math.random()));
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handlePlaceCreature = (creature: SizedCreature) => {
    // Find next empty slot from bottom (0 = small, 1 = medium, 2 = big)
    const targetSlotIndex = ladderSlots.findIndex((s) => s === null);
    if (targetSlotIndex === -1) return;

    // Check if the creature's rank matches this slot: slot 0 requires rank 1, slot 1 requires rank 2, slot 2 requires rank 3
    const expectedRank = targetSlotIndex + 1;
    if (creature.sizeRank === expectedRank) {
      const nextSlots = [...ladderSlots];
      nextSlots[targetSlotIndex] = creature;
      setLadderSlots(nextSlots);
      setAvailableChoices((prev) => prev.filter((c) => c.id !== creature.id));

      if (targetSlotIndex === 2) {
        onSolved();
        window.setTimeout(() => {
          setupRound();
        }, 1200);
      }
    } else {
      onMistake();
    }
  };

  return (
    <div className="creature-ladder-container">
      {/* Wooden Ladder Rungs (Bottom: Small, Middle: Medium, Top: Big) */}
      <div className="ladder-stand">
        {[2, 1, 0].map((slotIdx) => {
          const creature = ladderSlots[slotIdx];
          const expectedRank = slotIdx + 1;
          const rungWidth = 100 + slotIdx * 35; // Rungs get visually wider as they go up!

          return (
            <div
              key={slotIdx}
              className="ladder-rung"
              style={{
                width: `${rungWidth}px`,
                borderColor: creature ? '#ffd166' : 'rgba(149, 213, 178, 0.4)'
              }}
            >
              {creature ? (
                <span style={{ fontSize: `${creature.displaySizePx}px` }}>
                  {creature.emoji}
                </span>
              ) : (
                <span style={{ opacity: 0.35, fontSize: `${30 + slotIdx * 12}px` }}>
                  {expectedRank === 1 ? '🌱' : expectedRank === 2 ? '🌿' : '🌳'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Available Creatures to place on ladder */}
      <div className="shape-choices-row" style={{ flexDirection: 'column', gap: '14px' }}>
        {availableChoices.map((c) => (
          <button
            key={c.id}
            type="button"
            className="shape-piece"
            style={{ width: '90px', height: '90px' }}
            onClick={() => handlePlaceCreature(c)}
            aria-label={c.name}
          >
            <span style={{ fontSize: `${c.displaySizePx}px` }}>{c.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
