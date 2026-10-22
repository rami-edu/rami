import React, { useState, useEffect } from 'react';

interface Crystal {
  id: string;
  name: string;
  emoji: string;
  color: string;
  soundPitch: number;
}

const CRYSTALS: Crystal[] = [
  { id: 'emerald', name: 'Emerald', emoji: '💚', color: '#52b788', soundPitch: 440 },
  { id: 'topaz', name: 'Topaz', emoji: '💛', color: '#ffd166', soundPitch: 554 },
  { id: 'amethyst', name: 'Amethyst', emoji: '💜', color: '#c77dff', soundPitch: 659 }
];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const CaveEchoesActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [echoSequence, setEchoSequence] = useState<Crystal[]>([]);
  const [userStep, setUserStep] = useState(0);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  const setupRound = () => {
    // 2-step sequence for preschool memory
    const step1 = CRYSTALS[Math.floor(Math.random() * CRYSTALS.length)];
    const step2 = CRYSTALS[Math.floor(Math.random() * CRYSTALS.length)];
    const seq = [step1, step2];
    setEchoSequence(seq);
    setUserStep(0);

    // Play echo sequence with glowing highlights
    window.setTimeout(() => {
      setActiveHighlight(step1.id);
      window.setTimeout(() => {
        setActiveHighlight(null);
        window.setTimeout(() => {
          setActiveHighlight(step2.id);
          window.setTimeout(() => setActiveHighlight(null), 450);
        }, 250);
      }, 450);
    }, 400);
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handleTapCrystal = (crystal: Crystal) => {
    setActiveHighlight(crystal.id);
    window.setTimeout(() => setActiveHighlight(null), 300);

    if (crystal.id === echoSequence[userStep]?.id) {
      const nextStep = userStep + 1;
      setUserStep(nextStep);

      if (nextStep === echoSequence.length) {
        onSolved();
        window.setTimeout(() => {
          setupRound();
        }, 1200);
      }
    } else {
      onMistake();
      setUserStep(0);
    }
  };

  return (
    <div className="shape-nest-container">
      {/* Singing Crystals */}
      <div className="shape-choices-row" style={{ gap: '32px' }}>
        {CRYSTALS.map((c) => {
          const isLit = activeHighlight === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className="shape-piece"
              style={{
                width: '110px',
                height: '130px',
                borderColor: isLit ? '#ffffff' : c.color,
                boxShadow: isLit ? `0 0 30px ${c.color}` : 'none',
                transform: isLit ? 'scale(1.15)' : 'scale(1)'
              }}
              onClick={() => handleTapCrystal(c)}
              aria-label={c.name}
            >
              <span style={{ fontSize: '58px' }}>{c.emoji}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
