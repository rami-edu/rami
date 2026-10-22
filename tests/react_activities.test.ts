import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ActivityShell } from '../src/react/ActivityShell';
import type { MinigameModule } from '../src/managers/MinigameLoader';

const createMockModule = (id: string, title: string, backgroundUrl = './bg-test.jpg'): MinigameModule => ({
  descriptor: {
    id,
    title,
    shortTitle: title.split(' ')[0],
    pillar: 'solving',
    description: 'Test Description',
    backgroundKey: `bg_${id}`,
    backgroundUrl,
    animalInstructor: 'owl'
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
      expect(html).toContain(act.expectedSnippet);
      // Verify no parent dashboard in activity header
      expect(html).not.toContain('guardian-modal');
    });
  }
});
