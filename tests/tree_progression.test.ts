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

  it('correctly maps 4 progressive growth stages based on earned stars', () => {
    const profile = profileManager.createProfile('Leo', 'fox');
    profileManager.setActiveProfile(profile.id);

    // Initial 0 stars -> Stage 1 (The Sprout / Young Sapling)
    expect(profileManager.getTotalStarsEarned()).toBe(0);
    expect(profileManager.getTreeGrowthStage()).toBe(1);

    // Earn 5 stars across activities -> Still Stage 1
    profileManager.recordMinigameCompletion('Shape Nest (Geometry)', undefined, 3);
    profileManager.recordMinigameCompletion('Color Bloom (Colors)', undefined, 2);
    expect(profileManager.getTotalStarsEarned()).toBe(5);
    expect(profileManager.getTreeGrowthStage()).toBe(1);

    // Earn 6th star -> Advances to Stage 2 (The Thriving Haven)
    profileManager.recordMinigameCompletion('Phonics Pond (Language)', undefined, 1);
    expect(profileManager.getTotalStarsEarned()).toBe(6);
    expect(profileManager.getTreeGrowthStage()).toBe(2);

    // Earn up to 16 stars -> Advances to Stage 3 (The Ancient Wonder Tree)
    profileManager.recordMinigameCompletion('Creature Ladder (Sizes)', undefined, 5);
    profileManager.recordMinigameCompletion('Pattern Path (Patterns)', undefined, 5);
    expect(profileManager.getTotalStarsEarned()).toBe(16);
    expect(profileManager.getTreeGrowthStage()).toBe(3);

    // Earn 31+ stars -> Advances to Stage 4 (Celestial Bloom)
    profileManager.recordMinigameCompletion('Shadow Match (Observation)', undefined, 5);
    profileManager.recordMinigameCompletion('Nature Sorting (Science)', undefined, 5);
    profileManager.recordMinigameCompletion('Symmetry Wings (Art)', undefined, 5);
    expect(profileManager.getTotalStarsEarned()).toBe(31);
    expect(profileManager.getTreeGrowthStage()).toBe(4);
  });

  it('defines valid percentage sockets for all 4 growth stages', () => {
    for (const stageNum of [1, 2, 3, 4]) {
      const stageDef = TREE_STAGES[stageNum];
      expect(stageDef).toBeDefined();
      expect(stageDef.sockets.length).toBeGreaterThanOrEqual(3);

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

    // Stage 1 has 3 starter portals
    expect(TREE_STAGES[1].sockets).toHaveLength(3);
    // Stage 2 has 5 explorer portals
    expect(TREE_STAGES[2].sockets).toHaveLength(5);
    // Stage 3 & 4 have 8 complete tree portals
    expect(TREE_STAGES[3].sockets).toHaveLength(8);
    expect(TREE_STAGES[4].sockets).toHaveLength(8);
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
