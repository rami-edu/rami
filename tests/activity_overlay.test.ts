import { describe, it, expect, vi } from 'vitest';
import { ActivityOverlayManager } from '../src/managers/ActivityOverlayManager';
import type { MinigameModule } from '../src/managers/MinigameLoader';

describe('ActivityOverlayManager', () => {
  it('launches and closes active activities cleanly', () => {
    const manager = ActivityOverlayManager.getInstance();
    const onExitMock = vi.fn();

    const dummyModule: MinigameModule = {
      descriptor: {
        id: 'test_act',
        title: 'Test Activity',
        shortTitle: 'Test',
        pillar: 'solving',
        description: 'Test description',
        backgroundKey: 'bg_test',
        backgroundUrl: './test.jpg'
      },
      launch: vi.fn(),
      getStarRequirements: vi.fn().mockReturnValue([]),
      getStarProgress: vi.fn().mockReturnValue({
        starsEarned: 1,
        maxStars: 5,
        starsVisual: '★☆☆☆☆',
        successfulAttempts: 1,
        nextStar: 2,
        nextStarRequiredAttempts: 2,
        progressFraction: 0.5,
        activeDifficultyTier: 1,
        activeRequirementLabel: 'Level 1'
      }),
      getActivityDetails: vi.fn().mockReturnValue({} as any)
    };

    let receivedActivity: any = null;
    const unsub = manager.subscribe((act) => {
      receivedActivity = act;
    });

    manager.launch({
      module: dummyModule,
      onExit: onExitMock
    });

    expect(manager.getCurrent()?.module.descriptor.id).toBe('test_act');
    expect(receivedActivity?.module.descriptor.id).toBe('test_act');

    manager.close();
    expect(manager.getCurrent()).toBeNull();
    expect(receivedActivity).toBeNull();
    expect(onExitMock).toHaveBeenCalledOnce();

    unsub();
  });

  it('invokes onExit callback and unregisters active activity on close', () => {
    const manager = ActivityOverlayManager.getInstance();
    let exited = false;
    manager.launch({
      module: {
        descriptor: {
          id: 'test_exit',
          title: 'Exit Test',
          shortTitle: 'Exit',
          pillar: 'solving',
          description: '',
          backgroundKey: 'bg_test',
          backgroundUrl: ''
        },
        launch: vi.fn(),
        getStarRequirements: vi.fn().mockReturnValue([]),
        getStarProgress: vi.fn().mockReturnValue({} as any),
        getActivityDetails: vi.fn().mockReturnValue({} as any)
      },
      onExit: () => {
        exited = true;
      }
    });

    expect(manager.getCurrent()).not.toBeNull();
    manager.close();
    expect(exited).toBe(true);
    expect(manager.getCurrent()).toBeNull();
  });
});
