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

interface ActivityShellProps {
  module: MinigameModule;
  onExit: () => void;
}

export const ActivityShell: React.FC<ActivityShellProps> = ({ module, onExit }) => {
  const [isLeaping, setIsLeaping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [instructorReaction, setInstructorReaction] = useState<string | null>(null);
  const [, setRefreshKey] = useState(0);

  const activeProfile = profileManager.getActiveProfile();
  const avatarDesc = ProfileManager.getAvatarDescriptor(
    activeProfile?.avatarId ?? activeProfile?.avatarEmoji
  );

  const instructorId = module.descriptor.animalInstructor ?? 'owl';
  const instructorDesc = ProfileManager.getAvatarDescriptor(instructorId);

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
    }, 450);
  }, [isLeaping, onExit]);

  const handleSolved = useCallback(
    (description = 'Activity solved!') => {
      const activeId = profileManager.getActiveProfile()?.id;
      module.recordSolvedInstance?.(description, activeId);
      profileManager.recordMinigameCompletion(module.descriptor.title, activeId);

      // Audio & Visual celebratory feedback
      audioManager.playPortalReturn();
      setInstructorReaction('🌟');
      setToastMessage('✨ Star Earned! ✨');

      setRefreshKey((k) => k + 1);

      window.setTimeout(() => {
        setToastMessage(null);
        setInstructorReaction(null);
      }, 1500);
    },
    [module]
  );

  const handleMistake = useCallback(
    (description = 'Gentle try again') => {
      const activeId = profileManager.getActiveProfile()?.id;
      module.recordMistake?.(description, activeId);
      setInstructorReaction('🌱');
      window.setTimeout(() => setInstructorReaction(null), 1000);
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
        <div
          className="portal-exit-container"
          onClick={handlePortalExit}
          title="Return to Wonder Tree"
          aria-label="Return to Wonder Tree"
        >
          <div className="portal-aperture">
            <div className="portal-rune-ring" />
            <span className="portal-exit-icon">➔</span>
          </div>
          <img
            src={avatarDesc.spritePath}
            alt={avatarDesc.name}
            className={`portal-avatar-icon ${isLeaping ? 'leaping' : ''}`}
          />
        </div>

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

        {/* Right: Animal Instructor wearing Teacher Scholar Hat (Static, no bouncing!) */}
        <div
          className="activity-instructor"
          title={`${instructorDesc.name} — Activity Instructor`}
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
        </div>
      </header>

      {/* Main Glassmorphic Stage Card */}
      <main className="activity-stage-card">
        {toastMessage && (
          <div className="activity-toast">
            <span>🌟</span>
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="activity-stage-content">
          {renderActivityComponent()}
        </div>
      </main>
    </div>
  );
};
