import Phaser from 'phaser';
import { audioManager } from '../managers/AudioManager';
import { profileManager } from '../managers/ProfileManager';

export interface TreeHollowAnchor {
  id: string;
  tierIndex: number;
  minigame: string;
  /** Local X offset relative to tree base center (in unscaled 1x logical pixels) */
  localX: number;
  /** Local Y offset relative to tree base bottom (negative = upwards, in 1x logical pixels) */
  localY: number;
  /** Side of the tree ('left' | 'center' | 'right') */
  branchSide: 'left' | 'center' | 'right';
  signHang?: 'rope-left' | 'rope-right' | 'center';
}

export interface TreeSocketDefinition {
  id: string;
  minigame: string;
  x: number; // 0.0 to 1.0 relative to tree width
  y: number; // 0.0 to 1.0 relative to tree height
  signHang: 'rope-left' | 'rope-right' | 'center';
  branchSide: 'left' | 'center' | 'right';
}

export interface TreeStageDefinition {
  stage: number;
  title: string;
  minStars: number;
  maxStars: number;
  textureKey: string;
  imageFile: string;
  sockets: TreeSocketDefinition[];
}

export const TIER_ACTIVITIES: Array<{
  id: string;
  minigame: string;
  glowHex: string;
  branchSide: 'left' | 'center' | 'right';
}> = [
  {
    id: 'portal_geom_shapes',
    minigame: 'Shape Nest (Geometry)',
    glowHex: '#ffd166',
    branchSide: 'left'
  },
  {
    id: 'portal_color_bloom',
    minigame: 'Color Bloom (Colors)',
    glowHex: '#ff99c8',
    branchSide: 'center'
  },
  {
    id: 'portal_phonics_pond',
    minigame: 'Phonics Pond (Language)',
    glowHex: '#48cae4',
    branchSide: 'right'
  },
  {
    id: 'portal_creature_ladder',
    minigame: 'Creature Ladder (Sizes)',
    glowHex: '#a7c957',
    branchSide: 'left'
  },
  {
    id: 'portal_pattern_path',
    minigame: 'Pattern Path (Patterns)',
    glowHex: '#f4a261',
    branchSide: 'center'
  },
  {
    id: 'portal_shadow_match',
    minigame: 'Shadow Match (Observation)',
    glowHex: '#90e0ef',
    branchSide: 'right'
  },
  {
    id: 'portal_nature_sorting',
    minigame: 'Nature Sorting (Science)',
    glowHex: '#52b788',
    branchSide: 'left'
  },
  {
    id: 'portal_symmetry_wings',
    minigame: 'Symmetry Wings (Art)',
    glowHex: '#c77dff',
    branchSide: 'right'
  }
];

export const TREE_STAGES: Record<number, TreeStageDefinition> = {
  1: {
    stage: 1,
    title: 'The Young Sapling',
    minStars: 0,
    maxStars: 5,
    textureKey: 'tree_stage_1',
    imageFile: './tree-stage-1.png',
    sockets: [
      {
        id: 'portal_geom_shapes',
        minigame: 'Shape Nest (Geometry)',
        x: 0.38,
        y: 0.7,
        signHang: 'rope-left',
        branchSide: 'left'
      },
      {
        id: 'portal_color_bloom',
        minigame: 'Color Bloom (Colors)',
        x: 0.62,
        y: 0.66,
        signHang: 'rope-right',
        branchSide: 'right'
      },
      {
        id: 'portal_phonics_pond',
        minigame: 'Phonics Pond (Language)',
        x: 0.5,
        y: 0.45,
        signHang: 'center',
        branchSide: 'center'
      }
    ]
  },
  2: {
    stage: 2,
    title: 'The Thriving Haven',
    minStars: 6,
    maxStars: 15,
    textureKey: 'tree_stage_2',
    imageFile: './tree-stage-2.png',
    sockets: [
      {
        id: 'portal_geom_shapes',
        minigame: 'Shape Nest (Geometry)',
        x: 0.28,
        y: 0.74,
        signHang: 'rope-left',
        branchSide: 'left'
      },
      {
        id: 'portal_color_bloom',
        minigame: 'Color Bloom (Colors)',
        x: 0.72,
        y: 0.7,
        signHang: 'rope-right',
        branchSide: 'right'
      },
      {
        id: 'portal_phonics_pond',
        minigame: 'Phonics Pond (Language)',
        x: 0.38,
        y: 0.5,
        signHang: 'rope-left',
        branchSide: 'left'
      },
      {
        id: 'portal_creature_ladder',
        minigame: 'Creature Ladder (Sizes)',
        x: 0.64,
        y: 0.46,
        signHang: 'rope-right',
        branchSide: 'right'
      },
      {
        id: 'portal_pattern_path',
        minigame: 'Pattern Path (Patterns)',
        x: 0.5,
        y: 0.32,
        signHang: 'center',
        branchSide: 'center'
      }
    ]
  },
  3: {
    stage: 3,
    title: 'The Ancient Wonder Tree',
    minStars: 16,
    maxStars: 30,
    textureKey: 'tree_stage_3',
    imageFile: './tree-stage-3.png',
    sockets: [
      {
        id: 'portal_geom_shapes',
        minigame: 'Shape Nest (Geometry)',
        x: 0.24,
        y: 0.78,
        signHang: 'rope-left',
        branchSide: 'left'
      },
      {
        id: 'portal_color_bloom',
        minigame: 'Color Bloom (Colors)',
        x: 0.76,
        y: 0.74,
        signHang: 'rope-right',
        branchSide: 'right'
      },
      {
        id: 'portal_phonics_pond',
        minigame: 'Phonics Pond (Language)',
        x: 0.35,
        y: 0.56,
        signHang: 'rope-left',
        branchSide: 'left'
      },
      {
        id: 'portal_creature_ladder',
        minigame: 'Creature Ladder (Sizes)',
        x: 0.66,
        y: 0.52,
        signHang: 'rope-right',
        branchSide: 'right'
      },
      {
        id: 'portal_pattern_path',
        minigame: 'Pattern Path (Patterns)',
        x: 0.48,
        y: 0.42,
        signHang: 'center',
        branchSide: 'center'
      },
      {
        id: 'portal_shadow_match',
        minigame: 'Shadow Match (Observation)',
        x: 0.22,
        y: 0.36,
        signHang: 'rope-left',
        branchSide: 'left'
      },
      {
        id: 'portal_nature_sorting',
        minigame: 'Nature Sorting (Science)',
        x: 0.78,
        y: 0.34,
        signHang: 'rope-right',
        branchSide: 'right'
      },
      {
        id: 'portal_symmetry_wings',
        minigame: 'Symmetry Wings (Art)',
        x: 0.5,
        y: 0.22,
        signHang: 'center',
        branchSide: 'center'
      }
    ]
  },
  4: {
    stage: 4,
    title: 'Celestial Bloom',
    minStars: 31,
    maxStars: 9999,
    textureKey: 'tree_stage_4',
    imageFile: './tree-stage-4.png',
    sockets: [
      {
        id: 'portal_geom_shapes',
        minigame: 'Shape Nest (Geometry)',
        x: 0.24,
        y: 0.78,
        signHang: 'rope-left',
        branchSide: 'left'
      },
      {
        id: 'portal_color_bloom',
        minigame: 'Color Bloom (Colors)',
        x: 0.76,
        y: 0.74,
        signHang: 'rope-right',
        branchSide: 'right'
      },
      {
        id: 'portal_phonics_pond',
        minigame: 'Phonics Pond (Language)',
        x: 0.35,
        y: 0.56,
        signHang: 'rope-left',
        branchSide: 'left'
      },
      {
        id: 'portal_creature_ladder',
        minigame: 'Creature Ladder (Sizes)',
        x: 0.66,
        y: 0.52,
        signHang: 'rope-right',
        branchSide: 'right'
      },
      {
        id: 'portal_pattern_path',
        minigame: 'Pattern Path (Patterns)',
        x: 0.48,
        y: 0.42,
        signHang: 'center',
        branchSide: 'center'
      },
      {
        id: 'portal_shadow_match',
        minigame: 'Shadow Match (Observation)',
        x: 0.22,
        y: 0.36,
        signHang: 'rope-left',
        branchSide: 'left'
      },
      {
        id: 'portal_nature_sorting',
        minigame: 'Nature Sorting (Science)',
        x: 0.78,
        y: 0.34,
        signHang: 'rope-right',
        branchSide: 'right'
      },
      {
        id: 'portal_symmetry_wings',
        minigame: 'Symmetry Wings (Art)',
        x: 0.5,
        y: 0.22,
        signHang: 'center',
        branchSide: 'center'
      }
    ]
  }
};

/**
 * DynamicWonderTree — Implements the Modular Layered Stage & Socket Architecture:
 * - Hand-drawn Beatrix Potter / Studio Ghibli watercolor tree illustrations (Stages 1-4).
 * - Normalized percentage socket coordinates (x%, y%) anchoring portals organically.
 * - Interactive Growth Ceremony with particle swirls, chime glissandos, and scale bumps.
 * - Living Details: Persistent activity mastery accents sprouting directly on branches.
 */
export class DynamicWonderTree {
  private scene: Phaser.Scene;
  private rootContainer: Phaser.GameObjects.Container;
  private treeSprite: Phaser.GameObjects.Image;
  private transitionSprite?: Phaser.GameObjects.Image;
  private masteryAccentsContainer: Phaser.GameObjects.Container;
  private currentStage: number = 1;
  private currentAnchors: TreeHollowAnchor[] = [];
  private onNewAnchorCreated?: (anchor: TreeHollowAnchor) => void;
  private onTreeGrew?: (newTotalTiers: number) => void;

  public static readonly LOGICAL_WIDTH = 1400;
  public static readonly LOGICAL_HEIGHT = 1200;

  constructor(
    scene: Phaser.Scene,
    initialUnlockedCount = 1,
    onNewAnchorCreated?: (anchor: TreeHollowAnchor) => void,
    onTreeGrew?: (newTotalTiers: number) => void
  ) {
    this.scene = scene;
    this.onNewAnchorCreated = onNewAnchorCreated;
    this.onTreeGrew = onTreeGrew;

    this.rootContainer = scene.add.container(0, 0).setDepth(5);

    // Initial stage calculation
    const stageFromStars = profileManager.getTreeGrowthStage();
    const stageFromCount = initialUnlockedCount <= 3 ? 1 : initialUnlockedCount <= 5 ? 2 : 3;
    this.currentStage = Math.max(stageFromStars, stageFromCount);

    const stageDef = TREE_STAGES[this.currentStage] ?? TREE_STAGES[1];

    // Tree Sprite anchored at bottom-center (0.5, 1.0)
    this.treeSprite = scene.add
      .image(0, 0, stageDef.textureKey)
      .setOrigin(0.5, 1.0);
    this.rootContainer.add(this.treeSprite);

    // Container for branch living details (mastery accents)
    this.masteryAccentsContainer = scene.add.container(0, 0).setDepth(6);
    this.rootContainer.add(this.masteryAccentsContainer);

    this.syncSocketsForStage(this.currentStage, false);
    this.updateMasteryAccents();
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.rootContainer;
  }

  public getAnchors(): TreeHollowAnchor[] {
    return this.currentAnchors;
  }

  public getCurrentStage(): number {
    return this.currentStage;
  }

  public getTotalLogicalHeight(): number {
    return DynamicWonderTree.LOGICAL_HEIGHT;
  }

  public getTotalLogicalWidth(): number {
    return DynamicWonderTree.LOGICAL_WIDTH;
  }

  public getTierCount(): number {
    return this.currentAnchors.length;
  }

  /**
   * Syncs the tree stage dynamically based on player's total earned stars
   * or unlocked activity count.
   */
  public syncUnlockedTiers(unlockedCountOrStars: number, animate = true): boolean {
    const totalStars = profileManager.getTotalStarsEarned();
    let targetStage: 1 | 2 | 3 | 4 = 1;

    if (totalStars >= 31) {
      targetStage = 4;
    } else if (totalStars >= 16) {
      targetStage = 3;
    } else if (totalStars >= 6) {
      targetStage = 2;
    } else if (unlockedCountOrStars > 5) {
      targetStage = 3;
    } else if (unlockedCountOrStars > 3) {
      targetStage = 2;
    }

    const grew = this.setStage(targetStage, animate);
    this.updateMasteryAccents();
    return grew;
  }

  /**
   * Performs the Growth Ceremony:
   * - Gentle camera focus
   * - Chime glissando audio
   * - Golden leaf particle vortex
   * - Cross-fading tree sprite transition with bouncy scale bump
   */
  public setStage(newStage: number, animate = true): boolean {
    if (newStage === this.currentStage || !TREE_STAGES[newStage]) {
      return false;
    }

    this.currentStage = newStage;
    const nextDef = TREE_STAGES[newStage];

    if (!animate) {
      this.treeSprite.setTexture(nextDef.textureKey);
      this.syncSocketsForStage(newStage, false);
      this.updateMasteryAccents();
      return true;
    }

    // --- Interactive Growth Ceremony ---
    audioManager.playPortalReturn();

    // 1. Swirl of golden leaf particles
    this.spawnGrowthLeafVortex();

    // 2. Cross-fade between stage textures
    if (this.transitionSprite) {
      this.transitionSprite.destroy();
    }
    this.transitionSprite = this.scene.add
      .image(0, 0, nextDef.textureKey)
      .setOrigin(0.5, 1.0)
      .setAlpha(0);
    this.rootContainer.addAt(this.transitionSprite, 1);

    this.scene.tweens.add({
      targets: this.transitionSprite,
      alpha: 1,
      duration: 850,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.treeSprite.setTexture(nextDef.textureKey);
        this.transitionSprite?.destroy();
        this.transitionSprite = undefined;
      }
    });

    // 3. Subtle bouncy scale bump on the tree container
    this.scene.tweens.add({
      targets: this.rootContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 350,
      yoyo: true,
      ease: 'Back.easeOut'
    });

    this.syncSocketsForStage(newStage, true);
    this.updateMasteryAccents();

    if (this.onTreeGrew) {
      this.onTreeGrew(this.currentAnchors.length);
    }

    return true;
  }

  /**
   * Spawns a sparkling swirl of golden leaves during the Growth Ceremony.
   */
  private spawnGrowthLeafVortex(): void {
    const numLeaves = 24;
    for (let i = 0; i < numLeaves; i++) {
      const startAngle = (i / numLeaves) * Math.PI * 2;
      const startRadius = 380 + Math.random() * 120;
      const lx = Math.cos(startAngle) * startRadius;
      const ly = -450 + Math.sin(startAngle) * 220;

      const leaf = this.scene.add
        .text(lx, ly, Math.random() > 0.4 ? '🍃' : '✨', {
          fontSize: `${22 + Math.random() * 12}px`
        })
        .setOrigin(0.5)
        .setAlpha(0.9);
      this.rootContainer.add(leaf);

      this.scene.tweens.add({
        targets: leaf,
        x: lx * 0.2,
        y: ly - 80,
        rotation: (Math.random() - 0.5) * 6,
        alpha: 0,
        scale: 0.4,
        duration: 900 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => leaf.destroy()
      });
    }
  }

  /**
   * Converts percentage-based sockets to unscaled local coordinates
   * relative to tree base (0, 0).
   */
  private syncSocketsForStage(stageNum: number, notify = true): void {
    const stageDef = TREE_STAGES[stageNum] ?? TREE_STAGES[1];
    const newAnchors: TreeHollowAnchor[] = [];

    stageDef.sockets.forEach((sock, idx) => {
      // Local coordinates relative to bottom center (0.5, 1.0)
      const localX = (sock.x - 0.5) * DynamicWonderTree.LOGICAL_WIDTH;
      const localY = -(1.0 - sock.y) * DynamicWonderTree.LOGICAL_HEIGHT;

      const anchor: TreeHollowAnchor = {
        id: sock.id,
        tierIndex: idx,
        minigame: sock.minigame,
        localX,
        localY,
        branchSide: sock.branchSide,
        signHang: sock.signHang
      };
      newAnchors.push(anchor);

      if (notify && this.onNewAnchorCreated) {
        this.onNewAnchorCreated(anchor);
      }
    });

    this.currentAnchors = newAnchors;
  }

  /**
   * Living Details: Sprouts persistent hand-drawn rewards directly on branches
   * for mastered activities (stars >= 1).
   */
  public updateMasteryAccents(): void {
    this.masteryAccentsContainer.removeAll(true);
    const active = profileManager.getActiveProfile();
    if (!active) return;

    for (const anchor of this.currentAnchors) {
      const stats = active.progress[anchor.minigame];
      const starsEarned = stats?.highestLevel ?? 0;
      if (starsEarned < 1) continue;

      const minigame = anchor.minigame.toLowerCase();
      let accentEmoji = '✨';
      let offsetX = 28;
      let offsetY = -46;

      if (minigame.includes('phonics') || minigame.includes('pond')) {
        accentEmoji = '🐦'; // Sweet woodland songbird perched above
        offsetY = -52;
      } else if (
        minigame.includes('shape') ||
        minigame.includes('geom') ||
        minigame.includes('acorn')
      ) {
        accentEmoji = '🌰'; // Golden acorn cluster on the branch
        offsetX = -34;
        offsetY = -38;
      } else if (minigame.includes('nature') || minigame.includes('sort')) {
        accentEmoji = '🌸'; // Flower garland
        offsetX = 32;
        offsetY = -42;
      } else if (minigame.includes('symmetry') || minigame.includes('wing')) {
        accentEmoji = '🦋'; // Fluttering butterfly companion
        offsetX = -32;
        offsetY = -48;
      } else if (minigame.includes('color') || minigame.includes('bloom')) {
        accentEmoji = '🌺'; // Blooming floral rosette
        offsetX = 30;
        offsetY = -40;
      } else if (minigame.includes('creature') || minigame.includes('ladder')) {
        accentEmoji = '🐞'; // Little ladybug
        offsetX = -28;
        offsetY = -42;
      } else if (minigame.includes('pattern') || minigame.includes('path')) {
        accentEmoji = '💎'; // Glowing rune stone
        offsetX = 30;
        offsetY = -44;
      } else if (minigame.includes('shadow')) {
        accentEmoji = '🏮'; // Golden fairy lantern
        offsetY = -50;
      }

      const accent = this.scene.add
        .text(anchor.localX + offsetX, anchor.localY + offsetY, accentEmoji, {
          fontSize: '24px'
        })
        .setOrigin(0.5);

      // Gentle breathing idle tween on the living detail
      this.scene.tweens.add({
        targets: accent,
        y: anchor.localY + offsetY - 4,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 1800 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.masteryAccentsContainer.add(accent);
    }
  }
}
