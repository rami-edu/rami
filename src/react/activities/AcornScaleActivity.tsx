import React, { useState, useEffect } from 'react';

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const AcornScaleActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [targetCount, setTargetCount] = useState(2);
  const [currentCount, setCurrentCount] = useState(0);

  const setupRound = () => {
    // 1 to 3 acorns
    const count = Math.floor(Math.random() * 3) + 1;
    setTargetCount(count);
    setCurrentCount(0);
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handleAddAcorn = () => {
    const next = currentCount + 1;
    setCurrentCount(next);

    if (next === targetCount) {
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1200);
    } else if (next > targetCount) {
      onMistake();
      window.setTimeout(() => {
        setCurrentCount(0);
      }, 700);
    }
  };

  // Tilt angle based on weight difference
  const tilt = (targetCount - currentCount) * 7;

  return (
    <div className="shape-nest-container">
      {/* Balance Scale SVG */}
      <div style={{ position: 'relative', width: '280px', height: '140px' }}>
        <svg width="280" height="140" viewBox="0 0 280 140">
          {/* Base Stand */}
          <polygon points="140,40 160,130 120,130" fill="#5c4033" stroke="#8b5a2b" strokeWidth="3" />
          <rect x="90" y="125" width="100" height="12" rx="6" fill="#8b5a2b" />

          {/* Pivoting Scale Beam */}
          <g
            style={{
              transformOrigin: '140px 40px',
              transform: `rotate(${tilt}deg)`,
              transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <rect x="40" y="37" width="200" height="8" rx="4" fill="#ffd166" />
            <circle cx="140" cy="40" r="7" fill="#f59e0b" />

            {/* Left Tray Hanger */}
            <line x1="50" y1="40" x2="50" y2="75" stroke="#ffd166" strokeWidth="2.5" />
            <ellipse cx="50" cy="75" rx="35" ry="10" fill="#3d2c06" stroke="#ffd166" strokeWidth="2.5" />

            {/* Right Tray Hanger */}
            <line x1="230" y1="40" x2="230" y2="75" stroke="#ffd166" strokeWidth="2.5" />
            <ellipse cx="230" cy="75" rx="35" ry="10" fill="#3d2c06" stroke="#ffd166" strokeWidth="2.5" />
          </g>
        </svg>

        {/* Acorns inside Left Tray */}
        <div
          style={{
            position: 'absolute',
            left: '20px',
            top: `${60 + tilt * 0.7}px`,
            display: 'flex',
            gap: '2px',
            transition: 'top 0.4s ease'
          }}
        >
          {Array.from({ length: targetCount }).map((_, i) => (
            <span key={i} style={{ fontSize: '28px' }}>🌰</span>
          ))}
        </div>

        {/* Acorns inside Right Tray */}
        <div
          style={{
            position: 'absolute',
            right: '20px',
            top: `${60 - tilt * 0.7}px`,
            display: 'flex',
            gap: '2px',
            transition: 'top 0.4s ease'
          }}
        >
          {Array.from({ length: currentCount }).map((_, i) => (
            <span key={i} style={{ fontSize: '28px' }}>🌰</span>
          ))}
        </div>
      </div>

      {/* Button to add an acorn to balance the scale */}
      <div className="shape-choices-row">
        <button
          type="button"
          className="shape-piece"
          onClick={handleAddAcorn}
          aria-label="Add Acorn"
        >
          <span style={{ fontSize: '56px' }}>🌰</span>
        </button>
      </div>
    </div>
  );
};
