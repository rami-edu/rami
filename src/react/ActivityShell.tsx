import React, { useState, useEffect, useCallback } from 'react';
import type { MinigameModule } from '../managers/MinigameLoader';
import { profileManager, ProfileManager } from '../managers/ProfileManager';
import { audioManager } from '../managers/AudioManager';
import { GeometryShapesActivityComponent } from './activities/GeometryShapesActivity';
import { ColorBloomActivityComponent } from './activities/ColorBloomActivity';
import { PhonicsPondActivityComponent } from './activities/PhonicsPondActivity';
import { CreatureLadderActivityComponent } from './activities/CreatureLadderActivity';
import { PatternPathActivityComponent } from './activities/PatternPathActivity';
import { ShadowMatchActivityComponent } from './activities/ShadowMatchActivity';
import { NatureSortingActivityComponent } from './activities/NatureSortingActivity';
import { SymmetryWingsActivityComponent } from './activities/SymmetryWingsActivity';
import { AcornScaleActivityComponent } from './activities/AcornScaleActivity';
import { CaveEchoesActivityComponent } from './activities/CaveEchoesActivity';
import { ActivityErrorBoundary } from './ActivityErrorBoundary';

interface ActivityShellProps {
  module: MinigameModule;
  onExit: () => void;
}

export const getActivityInstructorId = (_module?: MinigameModule): string => {
  return 'owl';
};

export const getInstructorTitle = (_animalId?: string): string => {
  return 'Professor Owl 🦉';
};

export const getActivityGuidePrompt = (module: MinigameModule): string => {
  const title = (module.descriptor?.title ?? '').toLowerCase();
  const id = (module.descriptor?.id ?? '').toLowerCase();
  if (title.includes('shape') || id.includes('geom')) {
    return 'Drag each shape into its matching nest!';
  }
  if (title.includes('color') || id.includes('bloom')) {
    return 'Bloom the flowers by choosing the matching colors!';
  }
  if (title.includes('phonics') || id.includes('pond')) {
    return 'Listen to the pond sounds and find the creature!';
  }
  if (title.includes('ladder') || id.includes('size')) {
    return 'Drag our animal friends onto the ladder by size!';
  }
  if (title.includes('pattern') || id.includes('path')) {
    return 'Follow the stepping stone pattern across the stream!';
  }
  if (title.includes('shadow')) {
    return 'Look closely at the shadow to discover the secret friend!';
  }
  if (title.includes('nature') || title.includes('sort')) {
    return 'Sort the forest treasures into the harvest baskets!';
  }
  if (title.includes('symmetry') || title.includes('wing')) {
    return 'Paint both wings so the butterfly shines with symmetry!';
  }
  if (title.includes('acorn') || title.includes('scale')) {
    return 'Balance the acorns to match the weight of the forest stone!';
  }
  if (title.includes('cave') || title.includes('echo')) {
    return 'Echo the glowing crystals in the crystal cave!';
  }
  if (title.includes('rhythm')) {
    return 'Tap the glowing leaves to play a forest melody!';
  }
  return 'Explore, play, and learn together!';
};

export const ActivityShell: React.FC<ActivityShellProps> = ({ module, onExit }) => {
  const [isLeaping, setIsLeaping] = useState(false);
  const [instructorReaction, setInstructorReaction] = useState<string | null>(null);
  const [isInstructorBouncing, setIsInstructorBouncing] = useState(false);
  const [isMuted, setIsMuted] = useState(() => audioManager.isMuted());
  const [, setRefreshKey] = useState(0);

  const handleToggleMute = useCallback(() => {
    const nextMuted = audioManager.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  useEffect(() => {
    audioManager.unlockAudio();
    const handleSync = () => {
      setIsMuted(audioManager.isMuted());
    };
    window.addEventListener('rami:music-toggled', handleSync);
    window.addEventListener('rami:profile-changed', handleSync);
    return () => {
      window.removeEventListener('rami:music-toggled', handleSync);
      window.removeEventListener('rami:profile-changed', handleSync);
    };
  }, []);

  const activeProfile = profileManager.getActiveProfile();
  const avatarDesc = ProfileManager.getAvatarDescriptor(
    activeProfile?.avatarId ?? activeProfile?.avatarEmoji
  );

  const instructorId = getActivityInstructorId(module);
  const instructorDesc = ProfileManager.getAvatarDescriptor(instructorId);
  const instructorTitle = getInstructorTitle(instructorId);

  const handleInstructorTap = useCallback(() => {
    setIsInstructorBouncing(true);
    setInstructorReaction('✨');
    audioManager.playPortalReturn();
    window.setTimeout(() => {
      setIsInstructorBouncing(false);
      setInstructorReaction(null);
    }, 1200);
  }, []);

  const starProgress = module.getStarProgress?.(activeProfile?.id) ?? {
    starsEarned: 0,
    maxStars: 5,
    starsVisual: '☆☆☆☆☆',
    successfulAttempts: 0,
    nextStar: 1,
    nextStarRequiredAttempts: 1,
    progressFraction: 0,
    activeDifficultyTier: 1,
    activeRequirementLabel: 'Ready to play'
  };

  const handlePortalExit = useCallback(() => {
    if (isLeaping) return;
    setIsLeaping(true);
    audioManager.playPortalExit();

    window.setTimeout(() => {
      onExit();
      window.setTimeout(() => {
        setIsLeaping(false);
      }, 1000);
    }, 350);
  }, [isLeaping, onExit]);

  const handleSolved = useCallback(
    (description = 'Activity solved!') => {
      const activeId = profileManager.getActiveProfile()?.id;
      module.recordSolvedInstance?.(description, activeId);
      profileManager.recordMinigameCompletion(module.descriptor.title, activeId);

      // Audio & Visual celebratory feedback (no text!)
      audioManager.playPortalReturn();
      setInstructorReaction('🌟');
      setIsInstructorBouncing(true);

      setRefreshKey((k) => k + 1);

      window.setTimeout(() => {
        setInstructorReaction(null);
        setIsInstructorBouncing(false);
      }, 1600);
    },
    [module]
  );

  const handleMistake = useCallback(
    (description = 'Gentle try again') => {
      const activeId = profileManager.getActiveProfile()?.id;
      module.recordMistake?.(description, activeId);
      setInstructorReaction('🌱');
      window.setTimeout(() => {
        setInstructorReaction(null);
      }, 1400);
    },
    [module]
  );

  // Esc key shortcut to exit portal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handlePortalExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePortalExit]);

  // Determine which activity component to render
  const renderActivityComponent = () => {
    const id = module.descriptor.id;
    const title = module.descriptor.title.toLowerCase();

    if (id.includes('geom') || title.includes('shape') || title.includes('geom')) {
      return (
        <GeometryShapesActivityComponent
          onSolved={() => handleSolved('Solved geometric shape match')}
          onMistake={() => handleMistake('Tried non-matching shape')}
        />
      );
    }
    if (id.includes('color') || title.includes('color') || title.includes('bloom')) {
      return (
        <ColorBloomActivityComponent
          onSolved={() => handleSolved('Bloomed vibrant flower petals')}
          onMistake={() => handleMistake('Selected different color')}
        />
      );
    }
    if (id.includes('phonics') || title.includes('phonics') || title.includes('pond')) {
      return (
        <PhonicsPondActivityComponent
          onSolved={() => handleSolved('Matched creature phonics sound')}
          onMistake={() => handleMistake('Selected different creature sound')}
        />
      );
    }
    if (id.includes('creature') || title.includes('ladder') || title.includes('size')) {
      return (
        <CreatureLadderActivityComponent
          onSolved={() => handleSolved('Arranged creatures by size on ladder')}
          onMistake={() => handleMistake('Tried placing creature on wrong rung')}
        />
      );
    }
    if (id.includes('pattern') || title.includes('pattern') || title.includes('path')) {
      return (
        <PatternPathActivityComponent
          onSolved={() => handleSolved('Completed stepping stone pattern')}
          onMistake={() => handleMistake('Selected non-matching pattern stone')}
        />
      );
    }
    if (id.includes('shadow') || title.includes('shadow')) {
      return (
        <ShadowMatchActivityComponent
          onSolved={() => handleSolved('Revealed secret animal from shadow')}
          onMistake={() => handleMistake('Selected different animal card')}
        />
      );
    }
    if (id.includes('nature') || title.includes('sort') || title.includes('science')) {
      return (
        <NatureSortingActivityComponent
          onSolved={() => handleSolved('Sorted forest items into harvest baskets')}
          onMistake={() => handleMistake('Tried wrong nature basket')}
        />
      );
    }
    if (id.includes('symmetry') || title.includes('wing') || title.includes('art')) {
      return (
        <SymmetryWingsActivityComponent
          onSolved={() => handleSolved('Created magical butterfly wing symmetry')}
          onMistake={() => handleMistake('Placed color asymmetrically')}
        />
      );
    }
    if (id.includes('acorn') || title.includes('scale')) {
      return (
        <AcornScaleActivityComponent
          onSolved={() => handleSolved('Balanced the acorn scale')}
          onMistake={() => handleMistake('Scale tilted')}
        />
      );
    }
    if (id.includes('cave') || title.includes('echo') || title.includes('rhythm')) {
      return (
        <CaveEchoesActivityComponent
          onSolved={() => handleSolved('Echoed crystalline cave melody')}
          onMistake={() => handleMistake('Tapped non-matching crystal')}
        />
      );
    }

    // Default fallback to Geometry Shapes
    return (
      <GeometryShapesActivityComponent
        onSolved={() => handleSolved('Solved activity instance')}
        onMistake={() => handleMistake('Try again')}
      />
    );
  };

  // 5 Stars array
  const starsArray = Array.from({ length: 5 }, (_, i) => i < starProgress.starsEarned);
  const fillPercent = Math.round(starProgress.progressFraction * 100);

  return (
    <div className="activity-frame">
      {/* Themed Background Backdrop */}
      <div
        className="activity-backdrop"
        style={{
          backgroundImage: module.descriptor.backgroundUrl
            ? `url(${module.descriptor.backgroundUrl})`
            : undefined,
          backgroundColor: '#0f1c12'
        }}
      />

      {/* Header */}
      <header className="activity-header">
        {/* Left: Return Portal + Child's Avatar Icon standing beside it */}
        <button
          type="button"
          className="portal-exit-container"
          onClick={handlePortalExit}
          title="Return to Wonder Tree"
          aria-label="Return to Wonder Tree"
        >
          <div className="portal-aperture">
            <div className="portal-rune-ring" />
            <svg
              className="portal-door-icon"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Door Frame & Threshold */}
              <path
                d="M13 3H19C19.5523 3 20 3.44772 20 4V20C20 20.5523 19.5523 21 19 21H13"
                stroke="#ffd166"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M2 21H22"
                stroke="#ffd166"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              {/* Open Door Panel in Perspective */}
              <path
                d="M13 3.5L4 6.5V18.5L13 20.5V3.5Z"
                fill="rgba(255, 209, 102, 0.28)"
                stroke="#ffd166"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Door Knob */}
              <circle cx="6.5" cy="12.5" r="1.3" fill="#ffe66d" />
              {/* Exit Arrow */}
              <path
                d="M18 12H9M12 9L9 12L12 15"
                stroke="#ffe66d"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <img
            src={avatarDesc.spritePath}
            alt={avatarDesc.name}
            className={`portal-avatar-icon ${isLeaping ? 'leaping' : ''}`}
          />
        </button>

        {/* Center: Stars and Progress Bar (Clean, no text!) */}
        <div className="activity-stars-center">
          <div className="stars-row">
            {starsArray.map((isFilled, idx) => (
              <span
                key={idx}
                className={`star-icon ${isFilled ? 'filled' : 'empty'}`}
              >
                ★
              </span>
            ))}
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.max(4, fillPercent)}%` }}
            />
          </div>
        </div>

        {/* Right: Music Controls on the right & Animal Instructor (No parent dashboard) */}
        <div className="activity-header-right">
          <button
            type="button"
            className="activity-music-toggle"
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Piano Music' : 'Mute Piano Music'}
            aria-label={isMuted ? 'Unmute Piano Music' : 'Mute Piano Music'}
          >
            <span className="activity-music-icon">{isMuted ? '🔇' : '🎵'}</span>
          </button>

          <button
            type="button"
            className={`activity-instructor ${isInstructorBouncing ? 'bouncing' : ''}`}
            onClick={handleInstructorTap}
            title={instructorTitle}
            aria-label={instructorTitle}
          >
            <div className="instructor-badge">
              {/* Teacher / Scholar Mortarboard Hat */}
              <svg
                className="scholar-hat"
                width="50"
                height="30"
                viewBox="0 0 100 60"
              >
                {/* Mortarboard Diamond Top */}
                <polygon
                  points="50,6 94,24 50,42 6,24"
                  fill="#1b2a47"
                  stroke="#ffd166"
                  strokeWidth="3.5"
                />
                {/* Skull Cap Base */}
                <path
                  d="M30,34 Q50,48 70,34 L70,44 Q50,56 30,44 Z"
                  fill="#121b2d"
                  stroke="#ffd166"
                  strokeWidth="2.5"
                />
                {/* Golden Button and Tassel */}
                <circle cx="50" cy="24" r="4.5" fill="#ffd166" />
                <path
                  d="M50,24 C56,28 66,32 68,44"
                  fill="none"
                  stroke="#ffd166"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="68" cy="44" r="3.5" fill="#f59e0b" />
              </svg>

              <img
                src={instructorDesc.spritePath}
                alt={instructorDesc.name}
                className="instructor-avatar"
              />

              {instructorReaction && (
                <div className="instructor-reaction">{instructorReaction}</div>
              )}
            </div>
          </button>
        </div>
      </header>

      {/* Main Glassmorphic Stage Card */}
      <main className="activity-stage-card">
        <div className="activity-stage-content">
          <ActivityErrorBoundary fallbackTitle={module.descriptor.title}>
            {renderActivityComponent()}
          </ActivityErrorBoundary>
        </div>
      </main>
    </div>
  );
};
