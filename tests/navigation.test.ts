import { describe, it, expect, beforeEach } from 'vitest';
import {
  getActivitySlug,
  resolveActivityTitle,
  resolveProfile,
  parseHash,
  buildHash,
  slugify
} from '../src/managers/NavigationManager';
import { ProfileManager } from '../src/managers/ProfileManager';

describe('NavigationManager URL Hash Anchors', () => {
  let profileManager: ProfileManager;

  beforeEach(() => {
    profileManager = new ProfileManager();
    profileManager.resetAll();
  });

  describe('slugify & getActivitySlug', () => {
    it('converts titles into clean URL-friendly slugs', () => {
      expect(slugify('Player 1')).toBe('Player-1');
      expect(slugify('Leo')).toBe('Leo');
      expect(slugify('Quartz Dinosaur')).toBe('Quartz-Dinosaur');
      expect(slugify('Shape Nest (Geometry)')).toBe('Shape-Nest-Geometry');
    });

    it('maps all canonical activities to dedicated slugs', () => {
      expect(getActivitySlug('Shape Nest (Geometry)')).toBe('shape-nest');
      expect(getActivitySlug('Color Bloom (Colors)')).toBe('color-bloom');
      expect(getActivitySlug('Phonics Pond (Language)')).toBe('phonics-pond');
      expect(getActivitySlug('Creature Ladder (Sizes)')).toBe('creature-ladder');
      expect(getActivitySlug('Pattern Path (Patterns)')).toBe('pattern-path');
      expect(getActivitySlug('Shadow Match (Observation)')).toBe('shadow-match');
      expect(getActivitySlug('Nature Sorting (Science)')).toBe('nature-sorting');
      expect(getActivitySlug('Symmetry Wings (Art)')).toBe('symmetry-wings');
      expect(getActivitySlug('Acorn Scale')).toBe('acorn-scale');
      expect(getActivitySlug('Rhythm in the Branches')).toBe('rhythm-branches');
    });
  });

  describe('resolveActivityTitle', () => {
    it('resolves canonical titles from exact slugs', () => {
      expect(resolveActivityTitle('shape-nest')).toBe('Shape Nest (Geometry)');
      expect(resolveActivityTitle('color-bloom')).toBe('Color Bloom (Colors)');
      expect(resolveActivityTitle('phonics-pond')).toBe('Phonics Pond (Language)');
      expect(resolveActivityTitle('creature-ladder')).toBe('Creature Ladder (Sizes)');
      expect(resolveActivityTitle('pattern-path')).toBe('Pattern Path (Patterns)');
      expect(resolveActivityTitle('shadow-match')).toBe('Shadow Match (Observation)');
      expect(resolveActivityTitle('nature-sorting')).toBe('Nature Sorting (Science)');
      expect(resolveActivityTitle('symmetry-wings')).toBe('Symmetry Wings (Art)');
    });

    it('resolves canonical titles from common aliases and shortcuts', () => {
      expect(resolveActivityTitle('shapes')).toBe('Shape Nest (Geometry)');
      expect(resolveActivityTitle('geometry')).toBe('Shape Nest (Geometry)');
      expect(resolveActivityTitle('colors')).toBe('Color Bloom (Colors)');
      expect(resolveActivityTitle('bloom')).toBe('Color Bloom (Colors)');
      expect(resolveActivityTitle('phonics')).toBe('Phonics Pond (Language)');
      expect(resolveActivityTitle('language')).toBe('Phonics Pond (Language)');
      expect(resolveActivityTitle('ladder')).toBe('Creature Ladder (Sizes)');
      expect(resolveActivityTitle('sizes')).toBe('Creature Ladder (Sizes)');
      expect(resolveActivityTitle('patterns')).toBe('Pattern Path (Patterns)');
      expect(resolveActivityTitle('shadow')).toBe('Shadow Match (Observation)');
      expect(resolveActivityTitle('sorting')).toBe('Nature Sorting (Science)');
      expect(resolveActivityTitle('science')).toBe('Nature Sorting (Science)');
      expect(resolveActivityTitle('symmetry')).toBe('Symmetry Wings (Art)');
      expect(resolveActivityTitle('wings')).toBe('Symmetry Wings (Art)');
      expect(resolveActivityTitle('art')).toBe('Symmetry Wings (Art)');
      expect(resolveActivityTitle('acorn')).toBe('Acorn Scale');
      expect(resolveActivityTitle('rhythm')).toBe('Rhythm in the Branches');
    });

    it('handles case-insensitivity, spaces, and underscores', () => {
      expect(resolveActivityTitle('SHAPE_NEST')).toBe('Shape Nest (Geometry)');
      expect(resolveActivityTitle('Color Bloom')).toBe('Color Bloom (Colors)');
      expect(resolveActivityTitle('phonics_pond')).toBe('Phonics Pond (Language)');
      expect(resolveActivityTitle('creature ladder')).toBe('Creature Ladder (Sizes)');
    });

    it('returns null for unknown activity queries', () => {
      expect(resolveActivityTitle('unknown_game_xyz')).toBeNull();
      expect(resolveActivityTitle('')).toBeNull();
      expect(resolveActivityTitle(null)).toBeNull();
    });
  });

  describe('resolveProfile', () => {
    it('matches existing profiles by id, nickname, slugified nickname, or explorerName', () => {
      const p1 = profileManager.createProfile('Leo', 'fox', 'Silver Fox');
      const p2 = profileManager.createProfile('Player 1', 'dino', 'Quartz Dinosaur');
      const all = profileManager.getAllProfiles();

      // By direct ID
      expect(resolveProfile(p1.id, all)?.id).toBe(p1.id);
      expect(resolveProfile(p2.id, all)?.id).toBe(p2.id);

      // By exact nickname
      expect(resolveProfile('Leo', all)?.id).toBe(p1.id);
      expect(resolveProfile('leo', all)?.id).toBe(p1.id);

      // By slugified nickname
      expect(resolveProfile('Player-1', all)?.id).toBe(p2.id);
      expect(resolveProfile('player 1', all)?.id).toBe(p2.id);

      // By explorerName
      expect(resolveProfile('Quartz Dinosaur', all)?.id).toBe(p2.id);
      expect(resolveProfile('Silver-Fox', all)?.id).toBe(p1.id);

      // Non-existent profile
      expect(resolveProfile('Nobody', all)).toBeNull();
    });
  });

  describe('parseHash', () => {
    it('parses empty or hash-only strings', () => {
      expect(parseHash('')).toEqual({ profileQuery: null, activityQuery: null });
      expect(parseHash('#')).toEqual({ profileQuery: null, activityQuery: null });
      expect(parseHash('#/')).toEqual({ profileQuery: null, activityQuery: null });
    });

    it('parses standard query format with profile and activity', () => {
      expect(parseHash('#profile=Leo&activity=shape-nest')).toEqual({
        profileQuery: 'Leo',
        activityQuery: 'shape-nest'
      });
      expect(parseHash('#activity=color-bloom&profile=Emma')).toEqual({
        profileQuery: 'Emma',
        activityQuery: 'color-bloom'
      });
    });

    it('parses query format with single parameters or short aliases', () => {
      expect(parseHash('#profile=Leo')).toEqual({
        profileQuery: 'Leo',
        activityQuery: null
      });
      expect(parseHash('#activity=phonics-pond')).toEqual({
        profileQuery: null,
        activityQuery: 'phonics-pond'
      });
      expect(parseHash('#p=Maya&a=shapes')).toEqual({
        profileQuery: 'Maya',
        activityQuery: 'shapes'
      });
    });

    it('parses path-based hash formats', () => {
      expect(parseHash('#/profile/Leo/activity/shape-nest')).toEqual({
        profileQuery: 'Leo',
        activityQuery: 'shape-nest'
      });
      expect(parseHash('#/profile/Leo')).toEqual({
        profileQuery: 'Leo',
        activityQuery: null
      });
      expect(parseHash('#/activity/creature-ladder')).toEqual({
        profileQuery: null,
        activityQuery: 'creature-ladder'
      });
    });

    it('parses direct activity shorthand anchors', () => {
      expect(parseHash('#shape-nest')).toEqual({
        profileQuery: null,
        activityQuery: 'shape-nest'
      });
      expect(parseHash('#shapes')).toEqual({
        profileQuery: null,
        activityQuery: 'shapes'
      });
      expect(parseHash('#colors')).toEqual({
        profileQuery: null,
        activityQuery: 'colors'
      });
    });

    it('parses direct profile shorthand anchors', () => {
      expect(parseHash('#Leo')).toEqual({
        profileQuery: 'Leo',
        activityQuery: null
      });
      expect(parseHash('#Player-1')).toEqual({
        profileQuery: 'Player-1',
        activityQuery: null
      });
    });

    it('parses standalone and query dashboard anchors', () => {
      expect(parseHash('#dashboard')).toEqual({
        profileQuery: null,
        activityQuery: null,
        isDashboard: true
      });
      expect(parseHash('#guardian')).toEqual({
        profileQuery: null,
        activityQuery: null,
        isDashboard: true
      });
      expect(parseHash('#parent')).toEqual({
        profileQuery: null,
        activityQuery: null,
        isDashboard: true
      });
      expect(parseHash('#profile=Leo&view=dashboard')).toEqual({
        profileQuery: 'Leo',
        activityQuery: null,
        isDashboard: true
      });
      expect(parseHash('#/profile/Leo/dashboard')).toEqual({
        profileQuery: 'Leo',
        activityQuery: null,
        isDashboard: true
      });
    });
  });

  describe('buildHash', () => {
    it('builds canonical hash for profile and activity', () => {
      expect(buildHash('Leo', 'shape-nest')).toBe('#profile=Leo&activity=shape-nest');
      expect(buildHash('Leo', null)).toBe('#profile=Leo');
      expect(buildHash(null, 'shape-nest')).toBe('#activity=shape-nest');
      expect(buildHash(null, null)).toBe('');
    });

    it('builds canonical hash with dashboard view parameter', () => {
      expect(buildHash('Leo', null, true)).toBe('#profile=Leo&view=dashboard');
      expect(buildHash('Leo', 'shape-nest', true)).toBe('#profile=Leo&activity=shape-nest&view=dashboard');
      expect(buildHash(null, null, true)).toBe('#view=dashboard');
    });

    it('encodes special characters in slugs and names', () => {
      expect(buildHash('Player 1', 'shape nest')).toBe('#profile=Player%201&activity=shape%20nest');
    });
  });

  describe('NavigationManager Class Lifecycle', () => {
    it('manages deep link initialization, activity launching, and hash synchronization', async () => {
      const { navigationManager } = await import('../src/managers/NavigationManager');
      const { activityOverlayManager } = await import('../src/managers/ActivityOverlayManager');
      const { profileManager: pm } = await import('../src/managers/ProfileManager');

      pm.resetAll();
      const p = pm.createProfile('Leo');
      pm.setActiveProfile(p.id);

      // Set initial hash mock
      const mockLocation = { hash: '#profile=Leo&activity=color-bloom', href: 'http://localhost/#profile=Leo&activity=color-bloom' };
      const listeners: Record<string, EventListener[]> = {};
      const mockWindow = {
        location: mockLocation,
        addEventListener: (event: string, cb: EventListener) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(cb);
        },
        removeEventListener: (event: string, cb: EventListener) => {
          listeners[event] = (listeners[event] || []).filter(l => l !== cb);
        },
        dispatchEvent: (event: Event) => {
          listeners[event.type]?.forEach(cb => cb(event));
          return true;
        },
        history: {
          replaceState: (_: any, __: any, url: string) => {
            const hashIndex = url.indexOf('#');
            mockLocation.hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
          }
        }
      };

      (globalThis as any).window = mockWindow;

      navigationManager.init();

      expect(navigationManager.hasPendingActivity()).toBe(true);
      expect(navigationManager.getPendingActivityTitle()).toBe('Color Bloom (Colors)');

      // Simulate WonderTreeScene becoming ready
      let launchedActivityTitle: string | null = null;
      mockWindow.addEventListener('rami:launch-activity', (e: any) => {
        launchedActivityTitle = e.detail?.activityTitle;
      });

      navigationManager.markSceneReady();
      expect(launchedActivityTitle).toBe('Color Bloom (Colors)');
      expect(navigationManager.hasPendingActivity()).toBe(false);

      // Launch activity in overlay manager
      const mockModule = {
        descriptor: {
          id: 'color_bloom',
          title: 'Color Bloom (Colors)',
          pillar: 'art',
          description: 'Color Bloom test',
          backgroundKey: 'bg_color',
          backgroundUrl: './bg.jpg'
        },
        launch: () => {},
        getStarRequirements: () => [],
        getStarProgress: () => ({} as any),
        getActivityDetails: () => ({} as any)
      };

      activityOverlayManager.launch({
        module: mockModule as any,
        onExit: () => {}
      });

      // Hash should be synchronized to active profile and active activity
      expect(mockLocation.hash).toBe('#profile=Leo&activity=color-bloom');

      // Close the activity overlay
      activityOverlayManager.close();

      // Hash should revert back to profile anchor
      expect(mockLocation.hash).toBe('#profile=Leo');

      // Open the Guardian Dashboard view
      navigationManager.setDashboardOpen(true);
      expect(mockLocation.hash).toBe('#profile=Leo&view=dashboard');
      expect(navigationManager.isDashboard()).toBe(true);

      // Close the Guardian Dashboard view and return to tree
      navigationManager.setDashboardOpen(false);
      expect(mockLocation.hash).toBe('#profile=Leo');
      expect(navigationManager.isDashboard()).toBe(false);

      delete (globalThis as any).window;
    });
  });
});
