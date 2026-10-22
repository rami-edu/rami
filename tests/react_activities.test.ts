import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  ActivityShell,
  getActivityInstructorId,
  getInstructorTitle,
  getActivityGuidePrompt
} from '../src/react/ActivityShell';
import { GeometryShapesActivityComponent } from '../src/react/activities/GeometryShapesActivity';
import type { MinigameModule } from '../src/managers/MinigameLoader';
import { acornScaleActivity } from '../src/minigames/AcornScaleMinigame';
import { caveEchoesActivity } from '../src/minigames/CaveEchoesMinigame';
import { rhythmBranchesActivity } from '../src/minigames/RhythmBranchesMinigame';
import { geometryShapesActivity } from '../src/minigames/GeometryShapesMinigame';
import { colorBloomActivity } from '../src/minigames/ColorBloomMinigame';
import { phonicsPondActivity } from '../src/minigames/PhonicsPondMinigame';
import { creatureLadderActivity } from '../src/minigames/CreatureLadderMinigame';
import { patternPathActivity } from '../src/minigames/PatternPathMinigame';
import { shadowMatchActivity } from '../src/minigames/ShadowMatchMinigame';
import { natureSortingActivity } from '../src/minigames/NatureSortingMinigame';
import { symmetryWingsActivity } from '../src/minigames/SymmetryWingsMinigame';

const createMockModule = (id: string, title: string, backgroundUrl = './bg-test.jpg', animalInstructor?: string): MinigameModule => ({
  descriptor: {
    id,
    title,
    shortTitle: title.split(' ')[0],
    pillar: 'solving',
    description: 'Test Description',
    backgroundKey: `bg_${id}`,
    backgroundUrl,
    animalInstructor: animalInstructor ?? 'owl'
  },
  launch: vi.fn(),
  getStarRequirements: vi.fn().mockReturnValue([]),
  getStarProgress: vi.fn().mockReturnValue({
    starsEarned: 2,
    maxStars: 5,
    starsVisual: '★★☆☆☆',
    successfulAttempts: 2,
    nextStar: 3,
    nextStarRequiredAttempts: 10,
    progressFraction: 0.2,
    activeDifficultyTier: 2,
    activeRequirementLabel: 'Level 2',
    progressBarLabel: 'Progress to Star 3'
  }),
  getActivityDetails: vi.fn().mockReturnValue({} as any)
});

describe('React Activity Rendering', () => {
  const activitiesToTest = [
    { id: 'geom_shapes', title: 'Shape Nest (Geometry)', expectedSnippet: 'shape-nest-container' },
    { id: 'color_bloom', title: 'Color Bloom (Colors)', expectedSnippet: 'color-bloom-container' },
    { id: 'phonics_pond', title: 'Phonics Pond (Language)', expectedSnippet: 'phonics-pond-container' },
    { id: 'creature_ladder', title: 'Creature Ladder (Sizes)', expectedSnippet: 'creature-ladder-container' },
    { id: 'pattern_path', title: 'Pattern Path (Patterns)', expectedSnippet: 'pattern-path-container' },
    { id: 'shadow_match', title: 'Shadow Match (Observation)', expectedSnippet: 'shadow-match-container' },
    { id: 'nature_sorting', title: 'Nature Sorting (Science)', expectedSnippet: 'nature-sorting-container' },
    { id: 'symmetry_wings', title: 'Symmetry Wings (Art)', expectedSnippet: 'symmetry-wings-container' },
    { id: '07', title: 'Acorn Scale', expectedSnippet: 'shape-nest-container' },
    { id: '01', title: 'Cave Echoes', expectedSnippet: 'shape-nest-container' }
  ];

  for (const act of activitiesToTest) {
    it(`renders ActivityShell for ${act.title} with interactive stage`, () => {
      const module = createMockModule(act.id, act.title);
      const onExit = vi.fn();

      const html = renderToString(
        React.createElement(ActivityShell, {
          module,
          onExit
        })
      );

      // Verify essential components are rendered
      expect(html).toContain('activity-frame');
      expect(html).toContain('activity-backdrop');
      expect(html).toContain('activity-header');
      expect(html).toContain('portal-exit-container');
      expect(html).toContain('scholar-hat');
      expect(html).toContain('activity-music-toggle');
      expect(html).toContain('activity-stage-card');
      expect(html).toContain('activity-instructor-bar');
      expect(html).toContain('instructor-companion-badge');
      expect(html).toContain('companion-scholar-hat');
      expect(html).toContain('instructor-companion-bubble');
      expect(html).toContain('instructor-companion-title');
      expect(html).toContain('instructor-companion-prompt');
      expect(html).toContain(act.expectedSnippet);
      // Verify no parent dashboard in activity header
      expect(html).not.toContain('guardian-modal');
    });
  }

  it('renders GeometryShapesActivityComponent with draggable shape pieces and nest sockets', () => {
    const onSolved = vi.fn();
    const onMistake = vi.fn();

    const html = renderToString(
      React.createElement(GeometryShapesActivityComponent, {
        onSolved,
        onMistake
      })
    );

    expect(html).toContain('shape-nest-container');
    expect(html).toContain('shape-sockets-row');
    expect(html).toContain('shape-choices-row');
    expect(html).toContain('shape-piece');
    expect(html).toContain('shape-socket');
  });

  it('guarantees every minigame has an animal instructor explicitly assigned', () => {
    expect(acornScaleActivity.descriptor.animalInstructor).toBe('bear');
    expect(caveEchoesActivity.descriptor.animalInstructor).toBe('otter');
    expect(rhythmBranchesActivity.descriptor.animalInstructor).toBe('raccoon');
    expect(geometryShapesActivity.descriptor.animalInstructor).toBe('owl');
    expect(colorBloomActivity.descriptor.animalInstructor).toBe('fox');
    expect(phonicsPondActivity.descriptor.animalInstructor).toBe('raccoon');
    expect(creatureLadderActivity.descriptor.animalInstructor).toBe('dino');
    expect(patternPathActivity.descriptor.animalInstructor).toBe('fox');
    expect(shadowMatchActivity.descriptor.animalInstructor).toBe('owl');
    expect(natureSortingActivity.descriptor.animalInstructor).toBe('bear');
    expect(symmetryWingsActivity.descriptor.animalInstructor).toBe('otter');
  });

  it('correctly maps instructor titles and guidance prompts', () => {
    expect(getInstructorTitle('owl')).toContain('Professor Owl');
    expect(getInstructorTitle('fox')).toContain('Guide Fox');
    expect(getInstructorTitle('raccoon')).toContain('Ranger Raccoon');
    expect(getInstructorTitle('dino')).toContain('Coach Dino');
    expect(getInstructorTitle('bear')).toContain('Big Bear');
    expect(getInstructorTitle('otter')).toContain('Maestro Otter');

    const owlModule = createMockModule('geom_shapes', 'Shape Nest (Geometry)', './bg.jpg', 'owl');
    expect(getActivityInstructorId(owlModule)).toBe('owl');
    expect(getActivityGuidePrompt(owlModule)).toContain('nest');

    const bearModule = createMockModule('07', 'Acorn Scale', './bg.jpg', 'bear');
    expect(getActivityInstructorId(bearModule)).toBe('bear');
    expect(getActivityGuidePrompt(bearModule)).toContain('acorn');
  });
});
