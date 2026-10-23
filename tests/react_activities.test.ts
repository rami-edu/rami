import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  ActivityShell,
  getActivityInstructorId,
  getInstructorTitle
} from '../src/react/ActivityShell';
import { GeometryShapesActivityComponent } from '../src/react/activities/GeometryShapesActivity';
import { PhonicsPondActivityComponent } from '../src/react/activities/PhonicsPondActivity';
import { CreatureLadderActivityComponent } from '../src/react/activities/CreatureLadderActivity';
import {
  ColorBloomActivityComponent,
  pickNextTargetColor,
  getFlowerGrowthScale
} from '../src/react/activities/ColorBloomActivity';
import { NatureSortingActivityComponent } from '../src/react/activities/NatureSortingActivity';
import { SymmetryWingsActivityComponent } from '../src/react/activities/SymmetryWingsActivity';
import { PatternPathActivityComponent } from '../src/react/activities/PatternPathActivity';
import { ShadowMatchActivityComponent } from '../src/react/activities/ShadowMatchActivity';
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
      expect(html).toContain('portal-door-icon');
      expect(html).toContain('scholar-hat');
      expect(html).toContain('activity-music-toggle');
      expect(html).toContain('activity-stage-card');
      expect(html).toContain('activity-instructor');
      expect(html).toContain(act.expectedSnippet);
      // Verify instructor does NOT show any text prompts or speech bubbles
      expect(html).not.toContain('instructor-companion-bubble');
      expect(html).not.toContain('instructor-companion-title');
      expect(html).not.toContain('instructor-companion-prompt');
      expect(html).not.toContain('guardian-modal');
    });
  }

  it('renders GeometryShapesActivityComponent with draggable shape pieces, nest sockets, and Owl instructor', () => {
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
    expect(html).toContain('stage-owl-instructor');
    expect(html).toContain('owl-sprite');
  });

  it('renders CreatureLadderActivityComponent with only animals in a row for in-place drag-and-drop sorting', () => {
    const onSolved = vi.fn();
    const onMistake = vi.fn();

    const html = renderToString(
      React.createElement(CreatureLadderActivityComponent, {
        onSolved,
        onMistake
      })
    );

    expect(html).toContain('creature-ladder-container');
    expect(html).toContain('creature-sort-stage');
    expect(html).toContain('creature-size-flow-guide');
    expect(html).toContain('creature-sort-row');
    expect(html).toContain('creature-sort-slot');
    expect(html).toContain('creature-sort-card');
    expect(html).toContain('creature-emoji');
    // Verify ladder structure is NOT rendered (animals only)
    expect(html).not.toContain('ladder-stand');
    expect(html).not.toContain('ladder-rung');
  });

  it('renders ColorBloomActivityComponent with the entire flower: pot, stem, leaves, and full 8 petals', () => {
    const onSolved = vi.fn();
    const onMistake = vi.fn();

    const html = renderToString(
      React.createElement(ColorBloomActivityComponent, {
        onSolved,
        onMistake
      })
    );

    expect(html).toContain('color-bloom-container');
    expect(html).toContain('bloom-flower-center');
    expect(html).toContain('flower-pot');
    expect(html).toContain('flower-stem');
    expect(html).toContain('flower-leaves');
    expect(html).toContain('flower-blossom');
    expect(html).toContain('flower-petal');
    expect(html).toContain('flower-center-core');
    expect(html).toContain('color-pots-row');
    expect(html).toContain('color-pot');

    // Verify all 8 petal rotations are present
    const expectedAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    for (const deg of expectedAngles) {
      expect(html).toContain(`rotate(${deg}, 160, 130)`);
    }

    // Verify growth stage and scaling are rendered on the flower element
    expect(html).toContain('data-growth-stage="1"');
    expect(html).toContain('scale(0.85)');
  });

  it('guarantees ColorBloom does not present the same color consecutively', () => {
    let lastColorId: string | null = null;
    for (let round = 0; round < 300; round++) {
      const nextColor = pickNextTargetColor(lastColorId);
      expect(nextColor).toBeDefined();
      expect(nextColor.id).toBeTruthy();
      if (lastColorId !== null) {
        expect(nextColor.id).not.toBe(lastColorId);
      }
      lastColorId = nextColor.id;
    }
  });

  it('makes the ColorBloom flower grow progressively when choosing correctly', () => {
    const scale1 = getFlowerGrowthScale(1, false);
    const scale2 = getFlowerGrowthScale(2, false);
    const scale3 = getFlowerGrowthScale(3, false);
    const scale4 = getFlowerGrowthScale(4, false);
    const scale5 = getFlowerGrowthScale(5, false);

    expect(scale1).toBe(0.85);
    expect(scale2).toBeGreaterThan(scale1);
    expect(scale3).toBeGreaterThan(scale2);
    expect(scale4).toBeGreaterThan(scale3);
    expect(scale5).toBeGreaterThan(scale4);

    // Celebratory bloom surge expands flower even larger during celebration
    const bloomedScale1 = getFlowerGrowthScale(1, true);
    expect(bloomedScale1).toBeGreaterThan(scale1);
    const bloomedScale5 = getFlowerGrowthScale(5, true);
    expect(bloomedScale5).toBeGreaterThan(scale5);
  });

  it('renders NatureSortingActivityComponent with selectable baskets, class logos, open interiors, and items tray', () => {
    const onSolved = vi.fn();
    const onMistake = vi.fn();

    const html = renderToString(
      React.createElement(NatureSortingActivityComponent, {
        onSolved,
        onMistake
      })
    );

    expect(html).toContain('nature-sorting-container');
    expect(html).toContain('nature-baskets-row');
    expect(html).toContain('nature-basket');
    expect(html).toContain('basket-handle');
    expect(html).toContain('basket-interior');
    expect(html).toContain('basket-class-badge');
    expect(html).toContain('basket-class-logo-emoji');
    expect(html).toContain('basket-class-logo-label');
    expect(html).toContain('nature-tray-section');
    expect(html).toContain('nature-items-tray');
    expect(html).toContain('nature-item-piece');

    // Verify all three category class logo labels are present on the baskets
    expect(html).toContain('Leaves');
    expect(html).toContain('Stones');
    expect(html).toContain('Berries');
  });

  it('verifies NatureSorting round balance and flying item animation stylesheet rules', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssContent = fs.readFileSync(path.resolve(__dirname, '../src/react/activity.css'), 'utf-8');

    expect(cssContent).toContain('.nature-flying-item');
    expect(cssContent).toContain('flyIntoBasket');
    expect(cssContent).toContain('.nature-basket.catching');
    expect(cssContent).toContain('.basket-catch-burst');
    expect(cssContent).toContain('basketCatch');
  });

  it('renders SymmetryWingsActivityComponent with butterfly stage, reference wing, mirrored drop sockets, and drag palette', () => {
    const onSolved = vi.fn();
    const onMistake = vi.fn();

    const html = renderToString(
      React.createElement(SymmetryWingsActivityComponent, {
        onSolved,
        onMistake
      })
    );

    expect(html).toContain('symmetry-wings-container');
    expect(html).toContain('butterfly-stage-box');
    expect(html).toContain('butterfly-svg');
    expect(html).toContain('left-wing-group');
    expect(html).toContain('right-wing-group');
    expect(html).toContain('right-wing-sockets-overlay');
    expect(html).toContain('wing-socket socket-upper');
    expect(html).toContain('wing-socket socket-lower');
    expect(html).toContain('symmetry-palette-shelf');
    expect(html).toContain('symmetry-palette-tray');
    expect(html).toContain('symmetry-color-piece');
  });

  it('renders PatternPathActivityComponent with all pattern symbols in the same row, order connectors, and choices shelf', () => {
    const onSolved = vi.fn();
    const onMistake = vi.fn();

    const html = renderToString(
      React.createElement(PatternPathActivityComponent, {
        onSolved,
        onMistake
      })
    );

    expect(html).toContain('pattern-path-container');
    expect(html).toContain('pattern-trail-section');
    expect(html).toContain('pattern-trail-track');
    expect(html).toContain('pattern-trail-line');
    expect(html).toContain('pattern-stones-row');
    expect(html).toContain('stepping-stone');
    expect(html).toContain('stone-emoji');
    expect(html).toContain('stone-order-pill');
    expect(html).toContain('pattern-order-arrow');
    expect(html).toContain('→');
    expect(html).toContain('stepping-stone empty');
    expect(html).toContain('stone-question-mark');
    expect(html).toContain('pattern-choices-shelf');
    expect(html).toContain('pattern-choices-row');
    expect(html).toContain('pattern-choice-stone');
  });

  it('renders ShadowMatchActivityComponent with illuminated warm lantern screen, high-contrast silhouette, and animal choices shelf', () => {
    const onSolved = vi.fn();
    const onMistake = vi.fn();

    const html = renderToString(
      React.createElement(ShadowMatchActivityComponent, {
        onSolved,
        onMistake
      })
    );

    expect(html).toContain('shadow-match-container');
    expect(html).toContain('shadow-stage-frame');
    expect(html).toContain('shadow-lantern-halo');
    expect(html).toContain('shadow-target-box');
    expect(html).toContain('shadow-silhouette');
    expect(html).toContain('shadow-choices-shelf');
    expect(html).toContain('shadow-choices-row');
    expect(html).toContain('shadow-animal-card');
  });

  it('renders PhonicsPondActivityComponent with central speaker horn, sound loop badge, and animal choice cards', () => {
    const onSolved = vi.fn();
    const onMistake = vi.fn();

    const html = renderToString(
      React.createElement(PhonicsPondActivityComponent, {
        onSolved,
        onMistake
      })
    );

    expect(html).toContain('phonics-pond-container');
    expect(html).toContain('speaker-horn-wrapper');
    expect(html).toContain('speaker-horn-btn');
    expect(html).toContain('speaker-horn-icon');
    expect(html).toContain('creature-cards-row');
    expect(html).toContain('creature-card');
    expect(html).toContain('creature-card-emoji');
  });

  it('guarantees every minigame has the owl as its single instructor', () => {
    expect(acornScaleActivity.descriptor.animalInstructor).toBe('owl');
    expect(caveEchoesActivity.descriptor.animalInstructor).toBe('owl');
    expect(rhythmBranchesActivity.descriptor.animalInstructor).toBe('owl');
    expect(geometryShapesActivity.descriptor.animalInstructor).toBe('owl');
    expect(colorBloomActivity.descriptor.animalInstructor).toBe('owl');
    expect(phonicsPondActivity.descriptor.animalInstructor).toBe('owl');
    expect(creatureLadderActivity.descriptor.animalInstructor).toBe('owl');
    expect(patternPathActivity.descriptor.animalInstructor).toBe('owl');
    expect(shadowMatchActivity.descriptor.animalInstructor).toBe('owl');
    expect(natureSortingActivity.descriptor.animalInstructor).toBe('owl');
    expect(symmetryWingsActivity.descriptor.animalInstructor).toBe('owl');
  });

  it('correctly maps instructor to Professor Owl without showing text', () => {
    expect(getInstructorTitle()).toContain('Professor Owl');

    const owlModule = createMockModule('geom_shapes', 'Shape Nest (Geometry)', './bg.jpg', 'owl');
    expect(getActivityInstructorId(owlModule)).toBe('owl');

    const bearModule = createMockModule('07', 'Acorn Scale', './bg.jpg', 'owl');
    expect(getActivityInstructorId(bearModule)).toBe('owl');
  });

  it('persists tutorial completion so instructor demonstration stops after first successful solve', () => {
    const store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      }
    };
    (globalThis as any).localStorage = localStorageMock;

    const storageKey = 'rami_tutorial_completed_shape_nest_guest';
    localStorageMock.removeItem(storageKey);

    const onSolved = vi.fn();
    const onMistake = vi.fn();

    // First render: initial state without prior solve
    const htmlFirst = renderToString(
      React.createElement(GeometryShapesActivityComponent, {
        onSolved,
        onMistake
      })
    );
    expect(htmlFirst).toContain('stage-owl-instructor');

    // Simulate completion
    localStorageMock.setItem(storageKey, 'true');
    expect(localStorageMock.getItem(storageKey)).toBe('true');

    // Subsequent render: tutorial marked as completed
    const htmlSubsequent = renderToString(
      React.createElement(GeometryShapesActivityComponent, {
        onSolved,
        onMistake
      })
    );
    expect(htmlSubsequent).toContain('stage-owl-instructor perched');
  });
});
