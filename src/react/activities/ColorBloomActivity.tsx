import React, { useState, useEffect } from 'react';

interface ColorDef {
  id: string;
  name: string;
  hex: string;
}

const BLOOM_COLORS: ColorDef[] = [
  { id: 'ruby', name: 'Ruby Red', hex: '#e63946' },
  { id: 'amber', name: 'Golden Amber', hex: '#ffb703' },
  { id: 'emerald', name: 'Emerald Green', hex: '#52b788' },
  { id: 'azure', name: 'Azure Blue', hex: '#48cae4' },
  { id: 'violet', name: 'Purple Violet', hex: '#9d4edd' },
  { id: 'blush', name: 'Rose Pink', hex: '#ff70a6' },
  { id: 'coral', name: 'Coral Orange', hex: '#fb8500' }
];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const ColorBloomActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [targetColor, setTargetColor] = useState<ColorDef>(BLOOM_COLORS[0]);
  const [choices, setChoices] = useState<ColorDef[]>([]);
  const [isBloomed, setIsBloomed] = useState(false);

  const setupRound = () => {
    setIsBloomed(false);
    // 1. Pick a random target color
    const shuffled = [...BLOOM_COLORS].sort(() => 0.5 - Math.random());
    const target = shuffled[0];
    setTargetColor(target);

    // 2. Pick 3 choices (target + 2 other random colors), shuffled
    const distractors = shuffled.slice(1, 3);
    const roundChoices = [target, ...distractors].sort(() => 0.5 - Math.random());
    setChoices(roundChoices);
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handleSelectColor = (choice: ColorDef) => {
    if (choice.id === targetColor.id) {
      setIsBloomed(true);
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1200);
    } else {
      onMistake();
    }
  };

  return (
    <div className="color-bloom-container">
      {/* Central Flower with Target Nectar Droplet & Blooming Petals */}
      <div className="bloom-flower-center">
        <svg width="220" height="220" viewBox="0 0 200 200">
          {/* Target Color Aura Ring */}
          <circle
            cx="100"
            cy="100"
            r="82"
            fill="none"
            stroke={targetColor.hex}
            strokeWidth="4"
            strokeDasharray="6 6"
            opacity={0.65}
          />

          {/* 6 Petals */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="100"
              cy="50"
              rx="24"
              ry="38"
              fill={isBloomed ? targetColor.hex : 'rgba(255, 255, 255, 0.18)'}
              stroke={isBloomed ? '#ffffff' : targetColor.hex}
              strokeWidth="2.5"
              transform={`rotate(${deg} 100 100)`}
              style={{
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transformOrigin: '100px 100px'
              }}
            />
          ))}

          {/* Flower Center Target Vial / Core */}
          <circle
            cx="100"
            cy="100"
            r="32"
            fill={targetColor.hex}
            stroke="#ffffff"
            strokeWidth="4"
            filter="drop-shadow(0 0 10px rgba(255,255,255,0.6))"
          />
        </svg>
      </div>

      {/* Color Nectar Pots to choose from */}
      <div className="color-pots-row">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className="color-pot"
            style={{ backgroundColor: c.hex }}
            onClick={() => handleSelectColor(c)}
            aria-label={c.name}
          >
            <span style={{ fontSize: '26px' }}>✨</span>
          </button>
        ))}
      </div>
    </div>
  );
};
