import React, { useState, useEffect, useRef } from 'react';
import { PhonicsAudioSynthesizer } from '../../managers/PhonicsAudioSynthesizer';
import { audioManager } from '../../managers/AudioManager';

export interface PhonicsCreature {
  id: string;
  name: string;
  emoji: string;
  soundName: string;
}

export const PHONICS_CREATURES: PhonicsCreature[] = [
  { id: 'duck', name: 'Duck', emoji: '🦆', soundName: 'Quack' },
  { id: 'frog', name: 'Frog', emoji: '🐸', soundName: 'Ribbit' },
  { id: 'bird', name: 'Bird', emoji: '🐦', soundName: 'Tweet' },
  { id: 'owl', name: 'Owl', emoji: '🦉', soundName: 'Hoot' },
  { id: 'bee', name: 'Bee', emoji: '🐝', soundName: 'Bzz' }
];

export interface PhonicsRoundData {
  targetCreature: PhonicsCreature;
  choices: PhonicsCreature[];
}

/**
 * Guarantees that the same animal creature is NEVER selected consecutively.
 */
export function pickNextTargetCreature(lastCreatureId: string | null): PhonicsCreature {
  const available = lastCreatureId
    ? PHONICS_CREATURES.filter((c) => c.id !== lastCreatureId)
    : PHONICS_CREATURES;
  return available[Math.floor(Math.random() * available.length)] ?? PHONICS_CREATURES[0];
}

export const generatePhonicsRound = (lastCreatureId?: string | null): PhonicsRoundData => {
  const target = pickNextTargetCreature(lastCreatureId ?? null);
  const otherCreatures = PHONICS_CREATURES.filter((c) => c.id !== target.id).sort(
    () => 0.5 - Math.random()
  );
  const choices = [target, otherCreatures[0], otherCreatures[1]].sort(() => 0.5 - Math.random());
  return { targetCreature: target, choices };
};

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const PhonicsPondActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [synth] = useState(() => new PhonicsAudioSynthesizer());
  const lastCreatureIdRef = useRef<string | null>(null);
  const [roundData, setRoundData] = useState<PhonicsRoundData>(() => {
    const initialRound = generatePhonicsRound(null);
    lastCreatureIdRef.current = initialRound.targetCreature.id;
    return initialRound;
  });
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [loopIteration, setLoopIteration] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [wobbleCardId, setWobbleCardId] = useState<string | null>(null);

  const loopCancelRef = useRef<(() => void) | null>(null);

  const startLoop = (creatureId: string) => {
    // Stop any existing loop first
    if (loopCancelRef.current) {
      loopCancelRef.current();
      loopCancelRef.current = null;
    }

    setIsPlayingSound(true);
    setLoopIteration(1);

    // Loop 10 times at the start of each round
    const cancel = synth.loopCreatureSound(
      creatureId,
      10,
      (iteration) => {
        setLoopIteration(iteration);
        setIsPlayingSound(true);
      },
      () => {
        setIsPlayingSound(false);
        setLoopIteration(0);
        loopCancelRef.current = null;
      }
    );

    loopCancelRef.current = cancel;
  };

  const setupRound = () => {
    setIsSolved(false);
    setWobbleCardId(null);
    const newRound = generatePhonicsRound(lastCreatureIdRef.current);
    lastCreatureIdRef.current = newRound.targetCreature.id;
    setRoundData(newRound);
    startLoop(newRound.targetCreature.id);
  };

  useEffect(() => {
    // Initial start: loop 10 times for the target creature
    startLoop(roundData.targetCreature.id);

    return () => {
      // Clean cleanup: stop all loops on unmount
      if (loopCancelRef.current) {
        loopCancelRef.current();
        loopCancelRef.current = null;
      }
      synth.stopLoop();
    };
  }, []);

  const handleSpeakerTap = () => {
    // Tap to replay/restart the 10-time loop
    startLoop(roundData.targetCreature.id);
  };

  const handleSelectCreature = (creature: PhonicsCreature) => {
    if (isSolved) return;

    // Immediately stop the 10-time start loop when player interacts
    if (loopCancelRef.current) {
      loopCancelRef.current();
      loopCancelRef.current = null;
    }
    synth.stopLoop();
    setIsPlayingSound(false);
    setLoopIteration(0);

    // Play selected creature's natural recorded sound
    synth.playCreatureSound(creature.id);

    if (creature.id === roundData.targetCreature.id) {
      setIsSolved(true);
      audioManager.playPortalReturn();
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1400);
    } else {
      setWobbleCardId(creature.id);
      onMistake();
      window.setTimeout(() => {
        setWobbleCardId(null);
        // Resume looping the target sound so the child can listen again
        startLoop(roundData.targetCreature.id);
      }, 700);
    }
  };

  return (
    <div className="phonics-pond-container">
      {/* Central Pond Lotus / Singing Speaker Horn with Water Ripple Waves */}
      <div className="speaker-horn-wrapper">
        {isPlayingSound && (
          <div className="speaker-ripple-waves" aria-hidden="true">
            <span className="ripple-ring ring-1" />
            <span className="ripple-ring ring-2" />
            <span className="ripple-ring ring-3" />
          </div>
        )}

        <button
          type="button"
          className={`speaker-horn-btn ${isPlayingSound ? 'is-playing' : ''}`}
          onClick={handleSpeakerTap}
          title="Tap to listen to animal sound (loops 10 times)"
          aria-label="Tap to listen to animal sound"
        >
          <span className="speaker-horn-icon">📢</span>

          {/* Loop iteration indicator */}
          {isPlayingSound && loopIteration > 0 && (
            <span className="sound-loop-badge" aria-label={`Loop ${loopIteration} of 10`}>
              {loopIteration}/10
            </span>
          )}
        </button>
      </div>

      {/* Large Creature Cards Row */}
      <div className="creature-cards-row">
        {roundData.choices.map((c) => {
          const isWobbling = wobbleCardId === c.id;
          const isTargetCorrect = isSolved && c.id === roundData.targetCreature.id;

          return (
            <button
              key={c.id}
              type="button"
              className={`creature-card ${isWobbling ? 'wobble' : ''} ${isTargetCorrect ? 'solved-correct' : ''}`}
              onClick={() => handleSelectCreature(c)}
              aria-label={c.name}
            >
              <span className="creature-card-emoji">{c.emoji}</span>
              <div className="creature-card-sheen" />
            </button>
          );
        })}
      </div>

      {/* Celebration Sparkles */}
      {isSolved && (
        <div className="phonics-celebration-sparkles">
          <span>✨</span>
          <span style={{ animationDelay: '0.2s' }}>🌟</span>
          <span style={{ animationDelay: '0.4s' }}>✨</span>
        </div>
      )}
    </div>
  );
};
