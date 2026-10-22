import React, { useState, useEffect } from 'react';

const WING_COLORS = ['#ff006e', '#3a86ff', '#ffd166', '#52b788'];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const SymmetryWingsActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [leftWingColors, setLeftWingColors] = useState<string[]>(['#ff006e', '#3a86ff']);
  const [rightWingColors, setRightWingColors] = useState<(string | null)[]>([null, null]);
  const [selectedColor, setSelectedColor] = useState<string>(WING_COLORS[0]);

  const setupRound = () => {
    // Pick 2 random colors for left wing
    const shuffled = [...WING_COLORS].sort(() => 0.5 - Math.random());
    setLeftWingColors([shuffled[0], shuffled[1]]);
    setRightWingColors([null, null]);
    setSelectedColor(shuffled[0]);
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handlePaintRightCell = (cellIndex: number) => {
    const nextRight = [...rightWingColors];
    nextRight[cellIndex] = selectedColor;
    setRightWingColors(nextRight);

    // Check if right mirrors left
    if (nextRight[0] === leftWingColors[0] && nextRight[1] === leftWingColors[1]) {
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1200);
    } else if (nextRight[0] !== null && nextRight[1] !== null) {
      onMistake();
    }
  };

  return (
    <div className="symmetry-wings-container">
      {/* Butterfly Wings Stage */}
      <div className="butterfly-wings-stage">
        {/* Left Wing (Pre-colored model) */}
        <div className="wing-half" style={{ transform: 'scaleX(-1)' }}>
          {leftWingColors.map((col, idx) => (
            <div
              key={idx}
              className="wing-cell"
              style={{ backgroundColor: col }}
            />
          ))}
        </div>

        {/* Butterfly Body */}
        <div style={{ fontSize: '56px', margin: '0 8px' }}>🦋</div>

        {/* Right Wing (Child paints here) */}
        <div className="wing-half">
          {rightWingColors.map((col, idx) => (
            <div
              key={idx}
              className="wing-cell"
              style={{
                backgroundColor: col || 'rgba(255, 255, 255, 0.12)',
                borderColor: col ? col : '#ffd166',
                borderStyle: col ? 'solid' : 'dashed'
              }}
              onClick={() => handlePaintRightCell(idx)}
            />
          ))}
        </div>
      </div>

      {/* Color Palette below */}
      <div className="color-pots-row">
        {WING_COLORS.map((col) => (
          <button
            key={col}
            type="button"
            className="color-pot"
            style={{
              backgroundColor: col,
              transform: selectedColor === col ? 'scale(1.22)' : 'scale(1)',
              borderColor: selectedColor === col ? '#ffffff' : 'transparent'
            }}
            onClick={() => setSelectedColor(col)}
            aria-label="Color paint"
          />
        ))}
      </div>
    </div>
  );
};
