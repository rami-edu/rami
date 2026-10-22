import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from '../src/managers/ProfileManager';
import { UserManager } from '../src/managers/UserManager';
import {
  PILLAR_DEFINITIONS,
  TOPIC_LOGO_DEFINITIONS
} from '../src/objects/ActivityLogoLibrary';
import { KNOWLEDGE_TAGS } from '../src/objects/ActivityKnowledgeTags';
import {
  evaluateStarProgress,
  DEFAULT_STAR_REQUIREMENTS,
  calculateGeneralStats
} from '../src/managers/MinigameLoader';
import { AcornScaleActivity } from '../src/minigames/AcornScaleMinigame';
import { RhythmBranchesActivity } from '../src/minigames/RhythmBranchesMinigame';
import { CaveEchoesActivity } from '../src/minigames/CaveEchoesMinigame';
import { GeometryShapesActivity } from '../src/minigames/GeometryShapesMinigame';
import { ColorBloomActivity } from '../src/minigames/ColorBloomMinigame';
import { FruitHarvestActivity } from '../src/minigames/FruitHarvestMinigame';
import { ForestSymphonyActivity } from '../src/minigames/ForestSymphonyMinigame';
import { PhonicsPondActivity } from '../src/minigames/PhonicsPondMinigame';
import { CreatureLadderActivity } from '../src/minigames/CreatureLadderMinigame';
import { PatternPathActivity } from '../src/minigames/PatternPathMinigame';
import { ShadowMatchActivity } from '../src/minigames/ShadowMatchMinigame';
import { NatureSortingActivity } from '../src/minigames/NatureSortingMinigame';
import { SymmetryWingsActivity } from '../src/minigames/SymmetryWingsMinigame';

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

  it('updates profile nickname locally and rejects invalid names', () => {
    const p1 = profiles.createProfile('Alice', '🦕', 'Quartz Dinosaur');
    expect(p1.nickname).toBe('Alice');

    const updated = profiles.updateProfileName(p1.id, 'Alicia');
    expect(updated).not.toBeNull();
    expect(updated?.nickname).toBe('Alicia');
    expect(profiles.getActiveProfile()?.nickname).toBe('Alicia');

    // Reject empty/whitespace names
    const rejected = profiles.updateProfileName(p1.id, '   ');
    expect(rejected).toBeNull();
    expect(profiles.getActiveProfile()?.nickname).toBe('Alicia');

    // Non-existent profile
    expect(profiles.updateProfileName('invalid_id', 'Bob')).toBeNull();
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

  it('standardizes knowledge tags with circular iconic badges and descriptions', () => {
    const expectedTags = [
      'mathematics',
      'music',
      'language',
      'painting',
      'science',
      'logic',
      'motor_skills'
    ];
    for (const tagId of expectedTags) {
      const tag = KNOWLEDGE_TAGS[tagId as keyof typeof KNOWLEDGE_TAGS];
      expect(tag).toBeDefined();
      expect(tag.name.length).toBeGreaterThan(0);
      expect(tag.iconSymbol.length).toBeGreaterThan(0);
      expect(tag.colorHex).toMatch(/^#/);
    }
  });

  it('evaluates 5-star progression starting at 0 stars and advancing exponentially', () => {
    // At start (0 solves) -> 0 stars
    const p0 = evaluateStarProgress(0, DEFAULT_STAR_REQUIREMENTS);
    expect(p0.starsEarned).toBe(0);
    expect(p0.starsVisual).toBe('☆☆☆☆☆');
    expect(p0.nextStar).toBe(1);
    expect(p0.nextStarRequiredAttempts).toBe(1);

    // After 1 solve -> Star 1
    const p1 = evaluateStarProgress(1, DEFAULT_STAR_REQUIREMENTS);
    expect(p1.starsEarned).toBe(1);
    expect(p1.starsVisual).toBe('★☆☆☆☆');
    expect(p1.nextStar).toBe(2);
    expect(p1.nextStarRequiredAttempts).toBe(10);

    // After 10 solves -> Star 2
    const p2 = evaluateStarProgress(10, DEFAULT_STAR_REQUIREMENTS);
    expect(p2.starsEarned).toBe(2);
    expect(p2.starsVisual).toBe('★★☆☆☆');
    expect(p2.nextStar).toBe(3);
    expect(p2.nextStarRequiredAttempts).toBe(100);

    // After 100 solves -> Star 3
    const p3 = evaluateStarProgress(100, DEFAULT_STAR_REQUIREMENTS);
    expect(p3.starsEarned).toBe(3);
    expect(p3.starsVisual).toBe('★★★☆☆');

    // After 1,000 solves -> Star 4
    const p4 = evaluateStarProgress(1000, DEFAULT_STAR_REQUIREMENTS);
    expect(p4.starsEarned).toBe(4);
    expect(p4.starsVisual).toBe('★★★★☆');

    // After 10,000 solves -> Star 5
    const p5 = evaluateStarProgress(10000, DEFAULT_STAR_REQUIREMENTS);
    expect(p5.starsEarned).toBe(5);
    expect(p5.starsVisual).toBe('★★★★★');
    expect(p5.nextStar).toBeNull();
  });

  it('implements 10 distinct preschool activities with zero-reading mechanics, knowledge tags, and parent guides', () => {
    const activities = [
      new GeometryShapesActivity(),
      new ColorBloomActivity(),
      new FruitHarvestActivity(),
      new ForestSymphonyActivity(),
      new PhonicsPondActivity(),
      new CreatureLadderActivity(),
      new PatternPathActivity(),
      new ShadowMatchActivity(),
      new NatureSortingActivity(),
      new SymmetryWingsActivity()
    ];

    expect(activities).toHaveLength(10);

    for (const act of activities) {
      expect(act.descriptor.id).toBeTruthy();
      expect(act.descriptor.title).toBeTruthy();
      expect(act.descriptor.shortTitle).toBeTruthy();
      expect(act.descriptor.knowledgeTags?.length).toBeGreaterThanOrEqual(1);
      expect(act.descriptor.parentGuide?.pedagogicalGoals.length).toBeGreaterThan(15);
      expect(act.descriptor.parentGuide?.parentRecommendation.length).toBeGreaterThan(15);
      expect(act.descriptor.animalInstructor).toBeTruthy();

      // Check initial star status
      const starProgress = act.getStarProgress('test_profile');
      expect(starProgress.starsEarned).toBe(0);
      expect(starProgress.maxStars).toBe(5);

      // Verify solving an instance earns Star 1 and logs telemetry
      const newStatus = act.recordSolvedInstance(
        'Completed sample preschool instance',
        'test_profile'
      );
      expect(newStatus.starsEarned).toBe(1);
      expect(newStatus.starsVisual).toBe('★☆☆☆☆');

      const details = act.getActivityDetails('test_profile');
      expect(details.levelsCompleted).toBe(1);
      expect(details.starsEarned).toBe(1);
      expect(details.parentGuide).toBeDefined();
    }
  });

  it('calculates comprehensive general learning stats across all activities for the Parent Dashboard', () => {
    const p1 = profiles.createProfile('Alice');
    const activities = [
      new GeometryShapesActivity(),
      new ColorBloomActivity(),
      new FruitHarvestActivity(),
      new ForestSymphonyActivity(),
      new PhonicsPondActivity(),
      new CreatureLadderActivity(),
      new PatternPathActivity(),
      new ShadowMatchActivity(),
      new NatureSortingActivity(),
      new SymmetryWingsActivity()
    ];

    for (const act of activities) {
      act.resetActivityDetails(p1.id);
    }

    // Initially 0 progress
    const initialStats = calculateGeneralStats(activities, p1.id);
    expect(initialStats.totalStarsEarned).toBe(0);
    expect(initialStats.totalPossibleStars).toBe(50);
    expect(initialStats.activitiesExploredCount).toBe(0);
    expect(initialStats.totalSolves).toBe(0);
    expect(initialStats.totalActions).toBe(0);
    expect(initialStats.totalActivitiesCount).toBe(10);
    expect(initialStats.starsPercentage).toBe(0);
    expect(initialStats.accuracyRate).toBe(100);

    // Solve instances in 2 activities (Geometry and ColorBloom)
    activities[0].recordSolvedInstance('Solved circle shape nest', p1.id);
    activities[1].recordSolvedInstance('Bloomed red petals', p1.id);

    const updatedStats = calculateGeneralStats(activities, p1.id);
    expect(updatedStats.totalStarsEarned).toBe(2);
    expect(updatedStats.activitiesExploredCount).toBe(2);
    expect(updatedStats.totalSolves).toBe(2);
    expect(updatedStats.totalActions).toBeGreaterThanOrEqual(2);
    expect(updatedStats.starsPercentage).toBe(4);
    expect(updatedStats.domainStats.mathematics.solves).toBeGreaterThanOrEqual(1);
    expect(updatedStats.domainStats.painting.solves).toBeGreaterThanOrEqual(1);
    expect(updatedStats.domainStats.music.solves).toBe(0);
  });
});
