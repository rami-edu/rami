import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from '../src/managers/ProfileManager';
import { TREE_STAGES } from '../src/objects/DynamicWonderTree';
import { getGameRenderScale } from '../src/utils/renderScale';

describe('Tree Stage & Socket Architecture Progression', () => {
  let profileManager: ProfileManager;

  beforeEach(() => {
    profileManager = new ProfileManager();
    profileManager.resetAll();
  });

  it('correctly maps 10 progressive growth stages based on earned stars', () => {
    const profile = profileManager.createProfile('Leo', 'fox');
    profileManager.setActiveProfile(profile.id);

    // Initial 0 stars -> Stage 1 (The Sprout / Tender Sapling)
    expect(profileManager.getTotalStarsEarned()).toBe(0);
    expect(profileManager.getTreeGrowthStage()).toBe(1);

    // Earn 2 stars across activities -> Still Stage 1
    profileManager.recordMinigameCompletion('Shape Nest (Geometry)', undefined, 2);
    expect(profileManager.getTotalStarsEarned()).toBe(2);
    expect(profileManager.getTreeGrowthStage()).toBe(1);

    // Earn 3rd star -> Advances to Stage 2 (The Budding Shoot)
    profileManager.recordMinigameCompletion('Color Bloom (Colors)', undefined, 1);
    expect(profileManager.getTotalStarsEarned()).toBe(3);
    expect(profileManager.getTreeGrowthStage()).toBe(2);

    // Earn up to 6 stars -> Advances to Stage 3 (The Leafy Sprout)
    profileManager.recordMinigameCompletion('Phonics Pond (Language)', undefined, 3);
    expect(profileManager.getTotalStarsEarned()).toBe(6);
    expect(profileManager.getTreeGrowthStage()).toBe(3);

    // Earn up to 10 stars -> Advances to Stage 4 (The Branching Haven)
    profileManager.recordMinigameCompletion('Creature Ladder (Sizes)', undefined, 4);
    expect(profileManager.getTotalStarsEarned()).toBe(10);
    expect(profileManager.getTreeGrowthStage()).toBe(4);

    // Earn up to 14 stars -> Advances to Stage 5 (The Flourishing Oak)
    profileManager.recordMinigameCompletion('Pattern Path (Patterns)', undefined, 4);
    expect(profileManager.getTotalStarsEarned()).toBe(14);
    expect(profileManager.getTreeGrowthStage()).toBe(5);

    // Earn up to 18 stars -> Advances to Stage 6 (The Expansive Canopy)
    profileManager.recordMinigameCompletion('Shadow Match (Observation)', undefined, 4);
    expect(profileManager.getTotalStarsEarned()).toBe(18);
    expect(profileManager.getTreeGrowthStage()).toBe(6);

    // Earn up to 22 stars -> Advances to Stage 7 (The Verdant Sanctuary)
    profileManager.recordMinigameCompletion('Nature Sorting (Science)', undefined, 4);
    expect(profileManager.getTotalStarsEarned()).toBe(22);
    expect(profileManager.getTreeGrowthStage()).toBe(7);

    // Earn up to 26 stars -> Advances to Stage 8 (The Ancient Wonder Tree)
    profileManager.recordMinigameCompletion('Symmetry Wings (Art)', undefined, 4);
    expect(profileManager.getTotalStarsEarned()).toBe(26);
    expect(profileManager.getTreeGrowthStage()).toBe(8);

    // Earn up to 30 stars -> Advances to Stage 9 (The Colossal Guardian)
    profileManager.recordMinigameCompletion('Shape Nest (Geometry)', undefined, 5);
    profileManager.recordMinigameCompletion('Color Bloom (Colors)', undefined, 3);
    expect(profileManager.getTotalStarsEarned()).toBe(31);
    expect(profileManager.getTreeGrowthStage()).toBe(9);

    // Earn 35+ stars -> Advances to Stage 10 (The Celestial Bloom)
    profileManager.recordMinigameCompletion('Phonics Pond (Language)', undefined, 5);
    profileManager.recordMinigameCompletion('Creature Ladder (Sizes)', undefined, 5);
    profileManager.recordMinigameCompletion('Pattern Path (Patterns)', undefined, 5);
    expect(profileManager.getTotalStarsEarned()).toBe(35);
    expect(profileManager.getTreeGrowthStage()).toBe(10);
  });

  it('defines valid percentage sockets for all 10 growth stages', () => {
    for (const stageNum of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const stageDef = TREE_STAGES[stageNum];
      expect(stageDef).toBeDefined();
      expect(stageDef.sockets.length).toBeGreaterThanOrEqual(1);

      for (const sock of stageDef.sockets) {
        expect(sock.x).toBeGreaterThan(0);
        expect(sock.x).toBeLessThan(1);
        expect(sock.y).toBeGreaterThan(0);
        expect(sock.y).toBeLessThan(1);
        expect(sock.id).toContain('portal_');
        expect(sock.minigame).toBeTruthy();
        expect(['rope-left', 'rope-right', 'center']).toContain(sock.signHang);
      }
    }

    // Stage 1 has 1 starter portal (Shape Nest)
    expect(TREE_STAGES[1].sockets).toHaveLength(1);
    // Stage 2 has 2 portals (+ Color Bloom)
    expect(TREE_STAGES[2].sockets).toHaveLength(2);
    // Stage 3 has 3 portals (+ Phonics Pond)
    expect(TREE_STAGES[3].sockets).toHaveLength(3);
    // Stage 4 has 4 portals (+ Creature Ladder)
    expect(TREE_STAGES[4].sockets).toHaveLength(4);
    // Stage 5 has 5 portals (+ Pattern Path)
    expect(TREE_STAGES[5].sockets).toHaveLength(5);
    // Stage 6 has 6 portals (+ Shadow Match)
    expect(TREE_STAGES[6].sockets).toHaveLength(6);
    // Stage 7 has 7 portals (+ Nature Sorting)
    expect(TREE_STAGES[7].sockets).toHaveLength(7);
    // Stage 8, 9, 10 have 8 complete tree portals (+ Symmetry Wings)
    expect(TREE_STAGES[8].sockets).toHaveLength(8);
    expect(TREE_STAGES[9].sockets).toHaveLength(8);
    expect(TREE_STAGES[10].sockets).toHaveLength(8);
  });

  it('calculates 4X supersampling render scale on standard displays', () => {
    // On standard 1x displays (e.g. Linux 1080p), render scale is at least 2.0 (4X total pixel supersampling)
    const scale = getGameRenderScale({ devicePixelRatio: 1, innerWidth: 1920, innerHeight: 1080 });
    expect(scale).toBeGreaterThanOrEqual(2.0);
    expect(scale).toBeLessThanOrEqual(3.0);

    // Verifies 4K canvas buffer on 1080p
    const bufferW = Math.round(1920 * scale);
    const bufferH = Math.round(1080 * scale);
    expect(bufferW * bufferH).toBeGreaterThanOrEqual(1920 * 1080 * 4);
    expect(bufferW).toBeLessThanOrEqual(4096);
    expect(bufferH).toBeLessThanOrEqual(4096);
  });
});
