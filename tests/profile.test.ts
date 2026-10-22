import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from '../src/managers/ProfileManager';
import { UserManager } from '../src/managers/UserManager';
import {
  PILLAR_DEFINITIONS,
  TOPIC_LOGO_DEFINITIONS
} from '../src/objects/ActivityLogoLibrary';
import { AcornScaleActivity } from '../src/minigames/AcornScaleMinigame';
import { RhythmBranchesActivity } from '../src/minigames/RhythmBranchesMinigame';
import { CaveEchoesActivity } from '../src/minigames/CaveEchoesMinigame';

describe('ProfileManager & UserManager (Client-Only / Local-First)', () => {
  let profiles: ProfileManager;

  beforeEach(() => {
    profiles = new ProfileManager();
    profiles.resetAll();
  });

  it('creates and switches local child profiles without any server', () => {
    const p1 = profiles.createProfile('Alice', '🦕', 'Quartz Dinosaur');
    const p2 = profiles.createProfile('Leo', '🦊', 'Emerald Fox');

    expect(profiles.getAllProfiles()).toHaveLength(2);
    expect(profiles.getActiveProfile()?.id).toBe(p1.id);

    profiles.setActiveProfile(p2.id);
    expect(profiles.getActiveProfile()?.nickname).toBe('Leo');
    expect(profiles.getActiveProfile()?.explorerName).toBe('Emerald Fox');
    expect(profiles.getActiveProfile()?.avatarId).toBe('fox');

    profiles.setProfileAvatar('owl');
    expect(profiles.getActiveProfile()?.avatarId).toBe('owl');
  });

  it('tracks minigame completion locally per profile', () => {
    const p1 = profiles.createProfile('Alice');
    const stats1 = profiles.recordMinigameCompletion('Acorn Scale', p1.id);
    expect(stats1?.completedCount).toBe(1);

    const stats2 = profiles.recordMinigameCompletion('Acorn Scale', p1.id);
    expect(stats2?.completedCount).toBe(2);
  });

  it('requires solving a 2-digit arithmetic puzzle (< 100 result) each time to unlock Guardian Dashboard', () => {
    for (let i = 0; i < 50; i++) {
      const challenge = profiles.generateGuardianChallenge();
      expect(challenge.a).toBeGreaterThanOrEqual(10);
      expect(challenge.a).toBeLessThanOrEqual(99);
      expect(challenge.b).toBeGreaterThanOrEqual(10);
      expect(challenge.b).toBeLessThanOrEqual(99);
      expect(challenge.expectedAnswer).toBeGreaterThan(0);
      expect(challenge.expectedAnswer).toBeLessThan(100);

      expect(profiles.verifyGuardianChallenge(challenge.expectedAnswer + 1)).toBe(
        false
      );
      expect(
        profiles.verifyGuardianChallenge(String(challenge.expectedAnswer))
      ).toBe(true);
    }
  });

  it('generates COPPA-compliant nature/mineral + animal usernames', () => {
    const userMgr = new UserManager();
    const name = userMgr.generateUsername();
    const parts = name.split(' ');
    expect(parts).toHaveLength(2);
    expect(UserManager.PREFIXES).toContain(parts[0]);
    expect(UserManager.SUFFIXES).toContain(parts[1]);
  });

  it('defines a library of 20 distinct topic logos across the 3 main areas (solving, logic, creativity)', () => {
    const pillars = Object.keys(PILLAR_DEFINITIONS);
    expect(pillars).toEqual(['solving', 'logic', 'creativity']);

    const topics = Object.values(TOPIC_LOGO_DEFINITIONS);
    expect(topics).toHaveLength(20);

    for (const pillar of pillars) {
      const countForPillar = topics.filter((t) => t.pillar === pillar).length;
      expect(countForPillar).toBeGreaterThanOrEqual(6);
    }
  });

  it('tracks per-activity child action details inside each activity class for the Parent Dashboard', () => {
    const p1 = profiles.createProfile('Alice', '🦕', 'Quartz Dinosaur');

    const acornActivity = new AcornScaleActivity();
    acornActivity.resetActivityDetails(p1.id);
    acornActivity.recordAcornAdded(1, 1, 3, p1.id);
    acornActivity.recordAcornAdded(1, 2, 3, p1.id);
    acornActivity.recordAcornAdded(1, 3, 3, p1.id);
    acornActivity.recordLevelBalanced(1, 3, p1.id);

    const acornDetails = acornActivity.getActivityDetails(p1.id);
    expect(acornDetails.activityTitle).toBe('Acorn Scale');
    expect(acornDetails.highestLevel).toBe(1);
    expect(acornDetails.levelsCompleted).toBe(1);
    expect(acornDetails.totalActions).toBe(3);
    expect(acornDetails.actionHistory[0].description).toContain(
      'Balanced rock of weight 3 with 3 acorns'
    );

    const rhythmActivity = new RhythmBranchesActivity();
    rhythmActivity.resetActivityDetails(p1.id);
    rhythmActivity.recordNotePlayed(1, '🍃 Do', '🍃 Do', true, 1, 3, p1.id);
    rhythmActivity.recordNotePlayed(1, '🍂 La', '🌿 Re', false, 2, 3, p1.id);
    rhythmActivity.recordMelodyCompleted(1, ['🍃 Do', '🌿 Re', '🍀 Mi'], p1.id);

    const rhythmDetails = rhythmActivity.getActivityDetails(p1.id);
    expect(rhythmDetails.activityTitle).toBe('Rhythm in the Branches');
    expect(rhythmDetails.levelsCompleted).toBe(1);
    expect(rhythmDetails.mistakesCount).toBe(1);
    expect(rhythmDetails.actionHistory[0].description).toContain(
      'Composed Level 1 melody: 🍃 Do → 🌿 Re → 🍀 Mi'
    );

    const caveActivity = new CaveEchoesActivity();
    caveActivity.resetActivityDetails(p1.id);
    caveActivity.recordCrystalTapped(1, 'Emerald', 'Emerald', true, 1, 3, p1.id);
    caveActivity.recordSequenceCompleted(
      1,
      ['Emerald', 'Sapphire', 'Ruby'],
      p1.id
    );

    const caveDetails = caveActivity.getActivityDetails(p1.id);
    expect(caveDetails.activityTitle).toContain('Cave Echoes');
    expect(caveDetails.levelsCompleted).toBe(1);
    expect(caveDetails.actionHistory[0].description).toContain(
      'Recalled Level 1 crystal sequence: Emerald → Sapphire → Ruby'
    );
  });
});
