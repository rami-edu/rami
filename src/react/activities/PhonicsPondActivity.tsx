import React, { useState, useEffect } from 'react';
import { PhonicsAudioSynthesizer } from '../../managers/PhonicsAudioSynthesizer';

interface Creature {
  id: string;
  name: string;
  emoji: string;
  soundName: string;
}

const CREATURES: Creature[] = [
  { id: 'duck', name: 'Duck', emoji: '🦆', soundName: 'Quack' },
  { id: 'frog', name: 'Frog', emoji: '🐸', soundName: 'Ribbit' },
  { id: 'bird', name: 'Bird', emoji: '🐦', soundName: 'Tweet' },
  { id: 'owl', name: 'Owl', emoji: '🦉', soundName: 'Hoot' },
  { id: 'bee', name: 'Bee', emoji: '🐝', soundName: 'Bzz' }
];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const PhonicsPondActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [synth] = useState(() => new PhonicsAudioSynthesizer());
  const [targetCreature, setTargetCreature] = useState<Creature>(CREATURES[0]);
  const [choices, setChoices] = useState<Creature[]>([]);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  const playSound = (id: string) => {
    setIsPlayingSound(true);
    synth.playCreatureSound(id);
    window.setTimeout(() => setIsPlayingSound(false), 700);
  };

  const setupRound = () => {
    // 1. Pick a random target creature
    const shuffled = [...CREATURES].sort(() => 0.5 - Math.random());
    const target = shuffled[0];
    setTargetCreature(target);

    // 2. Pick 3 choices (target + 2 others)
    const roundChoices = [target, shuffled[1], shuffled[2]].sort(() => 0.5 - Math.random());
    setChoices(roundChoices);

    // Play target sound automatically
    window.setTimeout(() => {
      synth.playCreatureSound(target.id);
    }, 200);
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handleSelectCreature = (creature: Creature) => {
    // Preview sound on tap
    synth.playCreatureSound(creature.id);

    if (creature.id === targetCreature.id) {
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1200);
    } else {
      onMistake();
    }
  };

  return (
    <div className="phonics-pond-container">
      {/* Central Singing Speaker / Lotus Button */}
      <button
        type="button"
        className="speaker-horn-btn"
        onClick={() => playSound(targetCreature.id)}
        style={{
          transform: isPlayingSound ? 'scale(1.15)' : 'scale(1)',
          boxShadow: isPlayingSound
            ? '0 0 32px rgba(255, 209, 102, 0.85)'
            : '0 0 20px rgba(255, 209, 102, 0.4)'
        }}
        title="Tap to listen to animal sound"
        aria-label="Tap to listen to animal sound"
      >
        <span>📢</span>
      </button>

      {/* Large Creature Cards */}
      <div className="creature-cards-row">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className="creature-card"
            onClick={() => handleSelectCreature(c)}
            aria-label={c.name}
          >
            <span className="creature-card-emoji">{c.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
