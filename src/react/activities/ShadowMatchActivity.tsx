import React, { useState, useEffect } from 'react';

interface ShadowAnimal {
  id: string;
  name: string;
  emoji: string;
}

const SHADOW_ANIMALS: ShadowAnimal[] = [
  { id: 'deer', name: 'Deer', emoji: '🦌' },
  { id: 'owl', name: 'Owl', emoji: '🦉' },
  { id: 'otter', name: 'Otter', emoji: '🦦' },
  { id: 'butterfly', name: 'Butterfly', emoji: '🦋' },
  { id: 'bear', name: 'Bear', emoji: '🐻' },
  { id: 'squirrel', name: 'Squirrel', emoji: '🐿️' },
  { id: 'hedgehog', name: 'Hedgehog', emoji: '🦔' }
];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const ShadowMatchActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [targetAnimal, setTargetAnimal] = useState<ShadowAnimal>(SHADOW_ANIMALS[0]);
  const [choices, setChoices] = useState<ShadowAnimal[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);

  const setupRound = () => {
    setIsRevealed(false);
    const shuffled = [...SHADOW_ANIMALS].sort(() => 0.5 - Math.random());
    const target = shuffled[0];
    setTargetAnimal(target);

    const roundChoices = [target, shuffled[1], shuffled[2]].sort(() => 0.5 - Math.random());
    setChoices(roundChoices);
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handleSelectAnimal = (choice: ShadowAnimal) => {
    if (choice.id === targetAnimal.id) {
      setIsRevealed(true);
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1200);
    } else {
      onMistake();
    }
  };

  return (
    <div className="shadow-match-container">
      {/* Mystery Shadow Silhouette Target Box */}
      <div className={`shadow-target-box ${isRevealed ? 'revealed' : ''}`}>
        <span className="shadow-silhouette">{targetAnimal.emoji}</span>
      </div>

      {/* Full-color Animal Card Choices */}
      <div className="shape-choices-row">
        {choices.map((a) => (
          <button
            key={a.id}
            type="button"
            className="shape-piece"
            onClick={() => handleSelectAnimal(a)}
            aria-label={a.name}
          >
            <span style={{ fontSize: '56px' }}>{a.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
