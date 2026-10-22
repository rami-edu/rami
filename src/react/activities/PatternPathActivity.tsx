import React, { useState, useEffect } from 'react';

interface PatternSymbol {
  id: string;
  name: string;
  emoji: string;
}

const PATTERN_SYMBOLS: PatternSymbol[] = [
  { id: 'leaf', name: 'Leaf', emoji: '🍃' },
  { id: 'acorn', name: 'Acorn', emoji: '🌰' },
  { id: 'flower', name: 'Flower', emoji: '🌸' },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄' },
  { id: 'shell', name: 'Shell', emoji: '🐚' }
];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const PatternPathActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [patternItems, setPatternItems] = useState<PatternSymbol[]>([]);
  const [targetAnswer, setTargetAnswer] = useState<PatternSymbol>(PATTERN_SYMBOLS[0]);
  const [choices, setChoices] = useState<PatternSymbol[]>([]);
  const [isSolved, setIsSolved] = useState(false);

  const setupRound = () => {
    setIsSolved(false);
    // Pick 2 random symbols for AB pattern
    const shuffled = [...PATTERN_SYMBOLS].sort(() => 0.5 - Math.random());
    const [symA, symB] = [shuffled[0], shuffled[1]];

    // Create pattern: A, B, A, B, (Answer = A or B)
    const seq = [symA, symB, symA, symB];
    const answer = symA; // next in sequence

    setPatternItems(seq);
    setTargetAnswer(answer);

    // 3 choices including answer + 2 distractors
    const roundChoices = [answer, symB, shuffled[2]].sort(() => 0.5 - Math.random());
    setChoices(roundChoices);
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handleSelectStone = (stone: PatternSymbol) => {
    if (stone.id === targetAnswer.id) {
      setIsSolved(true);
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1200);
    } else {
      onMistake();
    }
  };

  return (
    <div className="pattern-path-container">
      {/* Stepping Stone Path */}
      <div className="pattern-stones-row">
        {patternItems.map((item, idx) => (
          <div key={idx} className="stepping-stone">
            <span>{item.emoji}</span>
          </div>
        ))}
        {/* Missing Stone */}
        <div className={`stepping-stone empty ${isSolved ? 'filled' : ''}`}>
          <span>{isSolved ? targetAnswer.emoji : '?'}</span>
        </div>
      </div>

      {/* Choice Stones below */}
      <div className="shape-choices-row">
        {choices.map((c, idx) => (
          <button
            key={idx}
            type="button"
            className="shape-piece"
            onClick={() => handleSelectStone(c)}
            aria-label={c.name}
          >
            <span style={{ fontSize: '48px' }}>{c.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
