import Phaser from 'phaser';

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
}

interface TierVisual {
  tierIndex: number;
  container: Phaser.GameObjects.Container;
  anchors: TreeHollowAnchor[];
}

interface TrunkSpineNode {
  centerX: number;
  halfWidth: number;
  leanAngle: number;
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

function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * DynamicWonderTree — Explicit, procedurally generated 2D hand-drawn ancient
 * Camphor Tree (Cinnamomum camphora):
 * - Grows upward automatically whenever a new activity is unlocked (no manual button).
 * - Seamless trunk-to-crown fork transition with a lush, continuous umbrella
 *   dome of overlapping Camphor foliage clouds so the top of the tree never
 *   looks cut off against the sky.
 */
export class DynamicWonderTree {
  private scene: Phaser.Scene;
  private rootContainer: Phaser.GameObjects.Container;
  private crownContainer: Phaser.GameObjects.Container;
  private tiers: TierVisual[] = [];
  private spineNodes: TrunkSpineNode[] = [];
  private allAnchors: TreeHollowAnchor[] = [];
  private placedActivities = new Set<string>();
  private readonly tierHeight = 300;
  private readonly baseTrunkHalfWidth = 295;
  private onNewAnchorCreated?: (anchor: TreeHollowAnchor) => void;
  private onTreeGrew?: (newTotalTiers: number) => void;

  constructor(
    scene: Phaser.Scene,
    initialUnlockedTiers = 1,
    onNewAnchorCreated?: (anchor: TreeHollowAnchor) => void,
    onTreeGrew?: (newTotalTiers: number) => void
  ) {
    this.scene = scene;
    this.onNewAnchorCreated = onNewAnchorCreated;
    this.onTreeGrew = onTreeGrew;

    this.rootContainer = scene.add.container(0, 0).setDepth(5);
    this.crownContainer = scene.add.container(0, 0).setDepth(8);
    this.rootContainer.add(this.crownContainer);

    this.spineNodes.push({
      centerX: -18,
      halfWidth: this.baseTrunkHalfWidth,
      leanAngle: -0.07
    });

    const clampedInitial = Phaser.Math.Clamp(
      initialUnlockedTiers,
      1,
      TIER_ACTIVITIES.length
    );
    for (let t = 0; t < clampedInitial; t++) {
      this.appendTier(t, false);
    }

    this.rebuildCamphorDomeCrown(false);
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.rootContainer;
  }

  public getAnchors(): TreeHollowAnchor[] {
    return this.allAnchors;
  }

  public getTierCount(): number {
    return this.tiers.length;
  }

  public getTotalLogicalHeight(): number {
    return this.tiers.length * this.tierHeight + 420;
  }

  public getTotalLogicalWidth(): number {
    return 1840;
  }

  /**
   * Automatically grows the tree upwards to match the number of unlocked
   * activities (up to `TIER_ACTIVITIES.length`).
   */
  public syncUnlockedTiers(targetTierCount: number, animate = true): boolean {
    const clampedTarget = Phaser.Math.Clamp(
      targetTierCount,
      1,
      TIER_ACTIVITIES.length
    );
    let grew = false;
    while (this.tiers.length < clampedTarget) {
      const nextTierIndex = this.tiers.length;
      this.appendTier(nextTierIndex, animate);
      grew = true;
    }
    if (grew) {
      this.rebuildCamphorDomeCrown(animate);
      if (this.onTreeGrew) {
        this.onTreeGrew(this.tiers.length);
      }
    }
    return grew;
  }

  private getOrComputeSpineNode(tierIndex: number): TrunkSpineNode {
    while (this.spineNodes.length <= tierIndex) {
      const idx = this.spineNodes.length;
      const prev = this.spineNodes[idx - 1];
      const rng = createSeededRng(idx * 9173 + 2027);

      const swingDir = idx % 2 === 1 ? 1 : -1;
      const deltaX = swingDir * (34 + rng() * 28) + (rng() - 0.5) * 14;
      const nextCenterX = Phaser.Math.Clamp(prev.centerX + deltaX, -85, 85);
      const nextHalfW = Math.max(150, prev.halfWidth * (0.82 + rng() * 0.04));
      const nextLean = (nextCenterX - prev.centerX) / this.tierHeight;

      this.spineNodes.push({
        centerX: nextCenterX,
        halfWidth: nextHalfW,
        leanAngle: nextLean
      });
    }
    return this.spineNodes[tierIndex];
  }

  private getWallXAtNode(
    tierIndex: number,
    node: TrunkSpineNode,
    midX: number
  ): { leftX: number; rightX: number } {
    const leftX =
      midX + node.centerX - node.halfWidth * (0.95 + (tierIndex % 2) * 0.1);
    const rightX =
      midX + node.centerX + node.halfWidth * (1.05 - (tierIndex % 2) * 0.1);
    return { leftX, rightX };
  }

  private appendTier(tierIndex: number, animate: boolean): TreeHollowAnchor[] {
    const texKey = `camphor_tree_tier_${tierIndex}_${Date.now()}`;
    const canvasW = 1840;
    const canvasH = 520;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvasTex = this.scene.textures.createCanvas(
      texKey,
      canvasW * dpr,
      canvasH * dpr
    );
    const ctx = canvasTex?.getContext();
    const createdAnchors: TreeHollowAnchor[] = [];

    const tierBottomY = -tierIndex * this.tierHeight;

    if (ctx && canvasTex) {
      ctx.save();
      ctx.scale(dpr, dpr);
      this.drawCamphorFractalTier(
        ctx,
        canvasW,
        canvasH,
        tierIndex,
        createdAnchors
      );
      ctx.restore();
      canvasTex.refresh();
    }

    const tierContainer = this.scene.add.container(0, tierBottomY);
    const img = this.scene.add
      .image(0, -canvasH / 2 + 80, texKey)
      .setScale(1 / dpr)
      .setOrigin(0.5, 0.5);

    tierContainer.add(img);
    tierContainer.setDepth(6 + tierIndex * 0.1);
    this.rootContainer.add(tierContainer);
    this.rootContainer.bringToTop(this.crownContainer);

    if (animate) {
      tierContainer.setScale(0.2, 0.05).setAlpha(0);
      this.scene.tweens.add({
        targets: tierContainer,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 850,
        ease: 'Back.easeOut'
      });
    }

    for (const anchor of createdAnchors) {
      anchor.localY += tierBottomY;
      this.allAnchors.push(anchor);
      if (this.onNewAnchorCreated) {
        this.onNewAnchorCreated(anchor);
      }
    }

    this.tiers.push({
      tierIndex,
      container: tierContainer,
      anchors: createdAnchors
    });

    return createdAnchors;
  }

  /**
   * Renders a full, organic Camphor umbrella-dome crown that seamlessly
   * continues the uppermost trunk walls (`leftTopX`..`rightTopX`), splits into
   * tapering S-curved co-dominant limbs, and blankets the entire upper tree in
   * dense, overlapping Camphor foliage clouds so the trunk never looks cut off.
   */
  private rebuildCamphorDomeCrown(animate = false): void {
    this.crownContainer.removeAll(true);

    const topTierIdx = this.tiers.length;
    const topNode = this.getOrComputeSpineNode(topTierIdx);
    const crownBaseY = -topTierIdx * this.tierHeight;

    const texKey = `camphor_tree_crown_${topTierIdx}_${Date.now()}`;
    const canvasW = 1840;
    const canvasH = 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvasTex = this.scene.textures.createCanvas(
      texKey,
      canvasW * dpr,
      canvasH * dpr
    );
    const ctx = canvasTex?.getContext();
    if (ctx && canvasTex) {
      ctx.save();
      ctx.scale(dpr, dpr);
      const midX = canvasW / 2;
      const cx = midX + topNode.centerX;
      // Seam line at `cy` aligns with `topY` of the highest trunk tier
      const cy = canvasH - 110;
      const { leftX, rightX } = this.getWallXAtNode(topTierIdx, topNode, midX);
      const rng = createSeededRng(topTierIdx * 4099 + 109);

      const foliageQueue: Array<{
        x: number;
        y: number;
        rx: number;
        ry: number;
        seed: number;
      }> = [];

      // 1. Deep background Camphor umbrella dome clouds (completely filling sky gaps)
      this.drawCamphorFoliageCloud(ctx, cx - 440, cy - 135, 250, 125, 11, false);
      this.drawCamphorFoliageCloud(ctx, cx + 440, cy - 130, 250, 125, 23, false);
      this.drawCamphorFoliageCloud(ctx, cx - 260, cy - 220, 280, 140, 37, false);
      this.drawCamphorFoliageCloud(ctx, cx + 260, cy - 215, 280, 140, 53, false);
      this.drawCamphorFoliageCloud(ctx, cx, cy - 265, 320, 155, 71, false);
      this.drawCamphorFoliageCloud(ctx, cx - 140, cy - 95, 240, 120, 83, false);
      this.drawCamphorFoliageCloud(ctx, cx + 140, cy - 95, 240, 120, 97, false);

      // 2. Seamless Upper Trunk Crown Fork: starts at exact [leftX, rightX] of
      //    the top tier and tapers smoothly into the 3 main crown bough bases
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(leftX, cy + 18);
      ctx.bezierCurveTo(
        leftX + 12,
        cy - 45,
        cx - topNode.halfWidth * 0.65,
        cy - 95,
        cx - topNode.halfWidth * 0.42,
        cy - 125
      );
      ctx.quadraticCurveTo(cx, cy - 155, cx + topNode.halfWidth * 0.42, cy - 125);
      ctx.bezierCurveTo(
        cx + topNode.halfWidth * 0.65,
        cy - 95,
        rightX - 12,
        cy - 45,
        rightX,
        cy + 18
      );
      ctx.closePath();
      ctx.fillStyle = '#756556';
      ctx.fill();

      // Stroke only the outer left and right tapering walls (no flat horizontal line)
      ctx.strokeStyle = '#241b14';
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(leftX, cy + 16);
      ctx.bezierCurveTo(
        leftX + 12,
        cy - 45,
        cx - topNode.halfWidth * 0.65,
        cy - 95,
        cx - topNode.halfWidth * 0.42,
        cy - 125
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightX, cy + 16);
      ctx.bezierCurveTo(
        rightX - 12,
        cy - 45,
        cx + topNode.halfWidth * 0.65,
        cy - 95,
        cx + topNode.halfWidth * 0.42,
        cy - 125
      );
      ctx.stroke();
      ctx.restore();

      // 3. Co-dominant S-curved fractal Camphor crown limbs fanning into the dome
      this.drawRecursiveCamphorBranch(
        ctx,
        cx - topNode.halfWidth * 0.56,
        cy - 25,
        -Math.PI * 0.84 + (rng() - 0.5) * 0.08,
        195,
        topNode.halfWidth * 0.36,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveCamphorBranch(
        ctx,
        cx - topNode.halfWidth * 0.25,
        cy - 65,
        -Math.PI * 0.66 + (rng() - 0.5) * 0.08,
        185,
        topNode.halfWidth * 0.38,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveCamphorBranch(
        ctx,
        cx + 8,
        cy - 85,
        -Math.PI * 0.48 + (rng() - 0.5) * 0.08,
        175,
        topNode.halfWidth * 0.38,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveCamphorBranch(
        ctx,
        cx + topNode.halfWidth * 0.28,
        cy - 60,
        -Math.PI * 0.32 + (rng() - 0.5) * 0.08,
        185,
        topNode.halfWidth * 0.38,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveCamphorBranch(
        ctx,
        cx + topNode.halfWidth * 0.58,
        cy - 20,
        -Math.PI * 0.15 + (rng() - 0.5) * 0.08,
        195,
        topNode.halfWidth * 0.35,
        4,
        rng,
        foliageQueue
      );

      // 4. Foreground sunlit Camphor foliage clouds blanketing the upper fork and crown
      this.drawCamphorFoliageCloud(ctx, cx - 175, cy - 55, 195, 95, 101, true);
      this.drawCamphorFoliageCloud(ctx, cx + 175, cy - 55, 195, 95, 107, true);
      this.drawCamphorFoliageCloud(ctx, cx, cy - 85, 215, 105, 113, true);

      for (const f of foliageQueue) {
        this.drawCamphorFoliageCloud(ctx, f.x, f.y, f.rx, f.ry, f.seed, true);
      }

      // Apex sunlit crown dome clouds
      this.drawCamphorFoliageCloud(ctx, cx - 155, cy - 235, 225, 112, 131, true);
      this.drawCamphorFoliageCloud(ctx, cx + 155, cy - 230, 225, 112, 139, true);
      this.drawCamphorFoliageCloud(ctx, cx, cy - 280, 255, 124, 149, true);

      ctx.restore();
      canvasTex.refresh();
    }

    const crownImg = this.scene.add
      .image(0, crownBaseY - canvasH / 2 + 110, texKey)
      .setScale(1 / dpr);
    this.crownContainer.add(crownImg);

    if (animate) {
      this.crownContainer.setAlpha(0.3);
      this.scene.tweens.add({
        targets: this.crownContainer,
        alpha: 1,
        duration: 600,
        ease: 'Sine.easeOut'
      });
    }
  }

  private drawRecursiveCamphorBranch(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    angle: number,
    length: number,
    radius: number,
    depth: number,
    rng: () => number,
    foliageQueue: Array<{
      x: number;
      y: number;
      rx: number;
      ry: number;
      seed: number;
    }>
  ): void {
    if (depth <= 0 || radius < 2.5) return;

    const sWave = (rng() - 0.42) * 0.34;
    const x1 = x0 + Math.cos(angle) * length;
    const y1 = y0 + Math.sin(angle) * length;

    const ctrl1X = x0 + Math.cos(angle + sWave) * (length * 0.36);
    const ctrl1Y = y0 + Math.sin(angle + sWave) * (length * 0.36) + 10;
    const ctrl2X = x0 + Math.cos(angle - sWave * 0.8) * (length * 0.72);
    const ctrl2Y = y0 + Math.sin(angle - sWave * 0.8) * (length * 0.72) - 8;

    const splitRatio = 0.55 + rng() * 0.17;
    const endRadius = radius * 0.77;

    const nx0 = -Math.sin(angle);
    const ny0 = Math.cos(angle);
    const nx1 = -Math.sin(angle - sWave * 0.3);
    const ny1 = Math.cos(angle - sWave * 0.3);

    const buildSegmentPath = () => {
      ctx.beginPath();
      ctx.moveTo(x0 + nx0 * radius, y0 + ny0 * radius);
      ctx.bezierCurveTo(
        ctrl1X + nx0 * (radius * 0.9),
        ctrl1Y + ny0 * (radius * 0.9),
        ctrl2X + nx1 * (endRadius * 1.05),
        ctrl2Y + ny1 * (endRadius * 1.05),
        x1 + nx1 * endRadius,
        y1 + ny1 * endRadius
      );
      ctx.lineTo(x1 - nx1 * endRadius, y1 - ny1 * endRadius);
      ctx.bezierCurveTo(
        ctrl2X - nx1 * (endRadius * 1.05),
        ctrl2Y - ny1 * (endRadius * 1.05),
        ctrl1X - nx0 * (radius * 0.9),
        ctrl1Y - ny0 * (radius * 0.9),
        x0 - nx0 * radius,
        y0 - ny0 * radius
      );
      ctx.closePath();
    };

    buildSegmentPath();
    ctx.fillStyle = depth >= 3 ? '#756556' : '#665749';
    ctx.fill();

    ctx.save();
    buildSegmentPath();
    ctx.clip();

    ctx.fillStyle = '#524539';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, x1, y1);
    ctx.lineTo(
      x1 - nx1 * endRadius * 1.4,
      y1 + Math.abs(ny1) * endRadius * 1.4 + 22
    );
    ctx.lineTo(
      x0 - nx0 * radius * 1.4,
      y0 + Math.abs(ny0) * radius * 1.4 + 22
    );
    ctx.closePath();
    ctx.fill();

    if (radius > 9) {
      ctx.strokeStyle = '#2b221b';
      ctx.lineWidth = Math.max(1.4, radius * 0.06);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(
        x0 + Math.cos(angle) * (length * 0.14),
        y0 + Math.sin(angle) * (length * 0.14)
      );
      ctx.bezierCurveTo(
        ctrl1X,
        ctrl1Y,
        ctrl2X,
        ctrl2Y,
        x1 - Math.cos(angle) * (length * 0.14),
        y1 - Math.sin(angle) * (length * 0.14)
      );
      ctx.stroke();
    }
    ctx.restore();

    buildSegmentPath();
    ctx.lineWidth = Math.max(2.2, Math.min(4.8, radius * 0.14));
    ctx.strokeStyle = '#241b14';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (depth === 4 && Math.abs(Math.cos(angle)) > 0.42) {
      this.drawMossPatch(ctx, ctrl1X, ctrl1Y - radius * 0.68, radius * 0.98, 14);
    }

    if (depth <= 2) {
      foliageQueue.push({
        x: x1,
        y: y1 - 14,
        rx: 92 + depth * 44 + rng() * 28,
        ry: 52 + depth * 24 + rng() * 16,
        seed: Math.floor(rng() * 1000)
      });
    }

    const leonardoExp = 0.46;
    const rDominant = endRadius * Math.pow(splitRatio, leonardoExp);
    const rSecondary = endRadius * Math.pow(1 - splitRatio, leonardoExp);

    const sideSign = rng() > 0.48 ? 1 : -1;
    const upwardPull = (-Math.PI * 0.5 - angle) * 0.14;
    const angleDom = angle + sideSign * (0.2 + rng() * 0.22) + upwardPull;
    const angleSec = angle - sideSign * (0.44 + rng() * 0.32) + upwardPull * 0.6;

    const lenDom = length * (0.75 + rng() * 0.12);
    const lenSec = length * (0.6 + rng() * 0.15);

    this.drawRecursiveCamphorBranch(
      ctx,
      x1,
      y1,
      angleDom,
      lenDom,
      rDominant,
      depth - 1,
      rng,
      foliageQueue
    );

    this.drawRecursiveCamphorBranch(
      ctx,
      x1,
      y1,
      angleSec,
      lenSec,
      rSecondary,
      depth - 1,
      rng,
      foliageQueue
    );

    if (depth >= 3 && rng() > 0.38) {
      const shootT = 0.42 + rng() * 0.28;
      const sx = x0 + (x1 - x0) * shootT;
      const sy = y0 + (y1 - y0) * shootT;
      const shootAngle = angle + (rng() > 0.5 ? 0.62 : -0.66);
      this.drawRecursiveCamphorBranch(
        ctx,
        sx,
        sy,
        shootAngle,
        length * 0.5,
        radius * 0.4,
        depth - 2,
        rng,
        foliageQueue
      );
    }
  }

  private drawCamphorFractalTier(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tierIndex: number,
    outAnchors: TreeHollowAnchor[]
  ): void {
    const midX = w / 2;
    const bottomY = h - 75;
    const topY = bottomY - this.tierHeight;

    const bottomNode = this.getOrComputeSpineNode(tierIndex);
    const topNode = this.getOrComputeSpineNode(tierIndex + 1);
    const rng = createSeededRng(tierIndex * 65537 + 99);

    const botCx = midX + bottomNode.centerX;
    const topCx = midX + topNode.centerX;

    const foliageQueue: Array<{
      x: number;
      y: number;
      rx: number;
      ry: number;
      seed: number;
    }> = [];

    // 1. Asymmetric S-Curved Camphor Boughs spreading wide to left and right
    const leftOriginY =
      topY + (tierIndex % 2 === 0 ? 145 : 85) + (rng() - 0.5) * 22;
    const leftOriginX =
      Phaser.Math.Linear(topCx, botCx, (leftOriginY - topY) / this.tierHeight) -
      topNode.halfWidth * 0.74;
    const leftAngle =
      -Math.PI + (tierIndex % 2 === 0 ? 0.22 : 0.38) + (rng() - 0.5) * 0.08;
    const leftLen = (tierIndex % 2 === 0 ? 215 : 175) + rng() * 30;

    this.drawRecursiveCamphorBranch(
      ctx,
      leftOriginX,
      leftOriginY,
      leftAngle,
      leftLen,
      54,
      4,
      rng,
      foliageQueue
    );

    const rightOriginY =
      topY + (tierIndex % 2 === 0 ? 72 : 158) + (rng() - 0.5) * 22;
    const rightOriginX =
      Phaser.Math.Linear(
        topCx,
        botCx,
        (rightOriginY - topY) / this.tierHeight
      ) +
      topNode.halfWidth * 0.76;
    const rightAngle =
      -(tierIndex % 2 === 0 ? 0.34 : 0.18) + (rng() - 0.5) * 0.08;
    const rightLen = (tierIndex % 2 === 0 ? 180 : 220) + rng() * 30;

    this.drawRecursiveCamphorBranch(
      ctx,
      rightOriginX,
      rightOriginY,
      rightAngle,
      rightLen,
      56,
      4,
      rng,
      foliageQueue
    );

    const extraSide = tierIndex % 2 === 0 ? -1 : 1;
    const extraY = topY + 205;
    const extraX =
      Phaser.Math.Linear(topCx, botCx, (extraY - topY) / this.tierHeight) +
      extraSide * topNode.halfWidth * 0.8;
    this.drawRecursiveCamphorBranch(
      ctx,
      extraX,
      extraY,
      extraSide < 0 ? -Math.PI + 0.15 : -0.15,
      150,
      38,
      3,
      rng,
      foliageQueue
    );

    // 2. Background Camphor foliage domes behind the trunk
    for (let i = 0; i < foliageQueue.length; i += 2) {
      const f = foliageQueue[i];
      this.drawCamphorFoliageCloud(ctx, f.x, f.y, f.rx, f.ry, f.seed, false);
    }

    // 3. Squat, Muscular, Deeply Fluted Ash-Brown Camphor Trunk & Coiling Roots
    this.drawCamphorFlutedTrunk(
      ctx,
      midX,
      botCx,
      topCx,
      bottomY,
      topY,
      bottomNode,
      topNode,
      tierIndex,
      rng
    );

    // 4. Foreground sunlit Camphor foliage clouds
    for (let i = 1; i < foliageQueue.length; i += 2) {
      const f = foliageQueue[i];
      this.drawCamphorFoliageCloud(
        ctx,
        f.x,
        f.y,
        f.rx * 0.92,
        f.ry * 0.92,
        f.seed + 7,
        true
      );
    }

    // 5. Winding wooden steps along the fluted Camphor bark
    this.drawWoodenStairway(
      ctx,
      botCx,
      topCx,
      bottomY,
      topY,
      bottomNode.halfWidth,
      tierIndex
    );

    // 6. One unique activity portal hollow per tier
    const tierActivity = TIER_ACTIVITIES[tierIndex];
    if (tierActivity && !this.placedActivities.has(tierActivity.minigame)) {
      this.placedActivities.add(tierActivity.minigame);
      const hollowX =
        tierActivity.branchSide === 'left'
          ? botCx - 145
          : tierActivity.branchSide === 'right'
            ? topCx + 155
            : (botCx + topCx) * 0.5 + 32;
      const hollowY =
        tierIndex === 0 ? bottomY - 82 : topY + this.tierHeight * 0.44;

      this.drawNaturalTreeHollow(
        ctx,
        hollowX,
        hollowY,
        52,
        62,
        tierActivity.glowHex
      );
      outAnchors.push({
        id: tierActivity.id,
        tierIndex,
        minigame: tierActivity.minigame,
        localX: hollowX - midX,
        localY: hollowY - bottomY,
        branchSide: tierActivity.branchSide
      });
    }
  }

  private drawCamphorFlutedTrunk(
    ctx: CanvasRenderingContext2D,
    midX: number,
    botCx: number,
    topCx: number,
    bottomY: number,
    topY: number,
    bottomNode: TrunkSpineNode,
    topNode: TrunkSpineNode,
    tierIndex: number,
    rng: () => number
  ): void {
    const includeRoots = tierIndex === 0;
    const bottomHalfW = bottomNode.halfWidth;
    const topHalfW = topNode.halfWidth;
    ctx.save();

    const { leftX: leftBotX, rightX: rightBotX } = this.getWallXAtNode(
      tierIndex,
      bottomNode,
      midX
    );
    const { leftX: leftTopX, rightX: rightTopX } = this.getWallXAtNode(
      tierIndex + 1,
      topNode,
      midX
    );

    const leftMidX1 =
      Phaser.Math.Linear(leftTopX, leftBotX, 0.35) - 32 + (rng() - 0.5) * 24;
    const leftMidX2 =
      Phaser.Math.Linear(leftTopX, leftBotX, 0.72) + 20 + (rng() - 0.5) * 24;
    const rightMidX1 =
      Phaser.Math.Linear(rightTopX, rightBotX, 0.32) + 20 + (rng() - 0.5) * 24;
    const rightMidX2 =
      Phaser.Math.Linear(rightTopX, rightBotX, 0.68) - 28 + (rng() - 0.5) * 24;

    if (includeRoots) {
      const rootConfigs = [
        { startX: leftBotX + 30, angle: Math.PI - 0.28, len: 215, r: 52 },
        { startX: leftBotX + 125, angle: Math.PI - 0.58, len: 155, r: 42 },
        { startX: botCx - 30, angle: Math.PI * 0.58, len: 105, r: 38 },
        { startX: rightBotX - 120, angle: 0.48, len: 165, r: 44 },
        { startX: rightBotX - 25, angle: 0.22, len: 225, r: 54 }
      ];
      for (const rc of rootConfigs) {
        this.drawFractalRootButtress(
          ctx,
          rc.startX,
          bottomY - 20,
          rc.angle,
          rc.len,
          rc.r,
          2,
          rng
        );
      }
    }

    const buildTrunkPath = () => {
      ctx.beginPath();
      ctx.moveTo(leftTopX, topY - 4);
      ctx.bezierCurveTo(
        leftMidX1,
        topY + this.tierHeight * 0.34,
        leftMidX2,
        topY + this.tierHeight * 0.68,
        includeRoots ? leftBotX - 110 : leftBotX,
        bottomY + 12
      );

      if (includeRoots) {
        ctx.quadraticCurveTo(
          botCx - bottomHalfW * 0.95,
          bottomY + 48,
          botCx - bottomHalfW * 0.42,
          bottomY + 26
        );
        ctx.quadraticCurveTo(
          botCx + bottomHalfW * 0.08,
          bottomY + 54,
          botCx + bottomHalfW * 0.55,
          bottomY + 28
        );
        ctx.quadraticCurveTo(
          botCx + bottomHalfW * 1.05,
          bottomY + 50,
          rightBotX + 125,
          bottomY + 10
        );
      } else {
        ctx.lineTo(rightBotX, bottomY + 12);
      }

      ctx.bezierCurveTo(
        rightMidX2,
        topY + this.tierHeight * 0.68,
        rightMidX1,
        topY + this.tierHeight * 0.34,
        rightTopX,
        topY - 4
      );
      ctx.closePath();
    };

    buildTrunkPath();
    ctx.fillStyle = '#756556';
    ctx.fill();

    ctx.save();
    buildTrunkPath();
    ctx.clip();

    ctx.fillStyle = '#877665';
    ctx.beginPath();
    ctx.moveTo(leftTopX - 40, topY - 10);
    ctx.lineTo(topCx - topHalfW * 0.1, topY - 10);
    ctx.bezierCurveTo(
      botCx - bottomHalfW * 0.36,
      (topY + bottomY) * 0.45,
      botCx + bottomHalfW * 0.06,
      bottomY - 50,
      botCx - bottomHalfW * 0.3,
      bottomY + 60
    );
    ctx.lineTo(leftBotX - 180, bottomY + 60);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#56493e';
    ctx.beginPath();
    ctx.moveTo(topCx + topHalfW * 0.3, topY - 10);
    ctx.lineTo(rightTopX + 140, topY - 10);
    ctx.lineTo(rightBotX + 180, bottomY + 60);
    ctx.lineTo(botCx + bottomHalfW * 0.34, bottomY + 60);
    ctx.bezierCurveTo(
      botCx + bottomHalfW * 0.16,
      bottomY - 80,
      topCx + topHalfW * 0.52,
      (topY + bottomY) * 0.42,
      topCx + topHalfW * 0.3,
      topY - 10
    );
    ctx.closePath();
    ctx.fill();

    const plateColors = ['#68594b', '#7e6e5e', '#5d4f42', '#827160'];
    for (let p = 0; p < 18; p++) {
      const t = (p + 0.5) / 18;
      const spineX = Phaser.Math.Linear(topCx, botCx, t);
      const px = spineX + (rng() - 0.5) * topHalfW * 1.5;
      const py = topY + 20 + t * (this.tierHeight - 35) + (rng() - 0.5) * 24;
      const pw = 24 + rng() * 32;
      const ph = 46 + rng() * 54;

      ctx.fillStyle = plateColors[p % plateColors.length];
      ctx.beginPath();
      ctx.roundRect(px - pw / 2, py - ph / 2, pw, ph, 9);
      ctx.fill();
    }

    ctx.strokeStyle = '#241b14';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let f = 0; f < 13; f++) {
      const fracRatio = (f - 6) / 6.6 + (rng() - 0.5) * 0.08;
      const startX = topCx + fracRatio * topHalfW * 0.9;
      const endX = botCx + fracRatio * bottomHalfW * 0.94;
      this.drawFractalBarkFissure(
        ctx,
        startX,
        topY + 8 + rng() * 30,
        endX,
        bottomY - 10 - rng() * 28,
        2,
        rng
      );
    }

    this.drawBarkKnot(
      ctx,
      topCx - topHalfW * (0.34 + rng() * 0.2),
      topY + 105 + rng() * 55,
      21,
      29
    );
    this.drawBarkKnot(
      ctx,
      botCx + bottomHalfW * (0.26 + rng() * 0.22),
      topY + 190 + rng() * 55,
      19,
      26
    );

    this.drawPenCrossHatching(
      ctx,
      rightTopX - 38,
      topY + 28,
      bottomY - 24,
      30
    );

    this.drawIvyVine(
      ctx,
      leftTopX + 55,
      topY + 10,
      botCx - 35,
      bottomY - 15,
      tierIndex + 1
    );
    this.drawIvyVine(
      ctx,
      rightTopX - 65,
      topY + 18,
      rightBotX - 85,
      bottomY - 20,
      tierIndex + 5
    );

    ctx.restore();

    // 4. Stroke ONLY the left and right outer walls (and root base on Tier 0)
    //    so there is NEVER a horizontal cut line across the top of the trunk!
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = '#241b14';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(leftTopX, topY - 2);
    ctx.bezierCurveTo(
      leftMidX1,
      topY + this.tierHeight * 0.34,
      leftMidX2,
      topY + this.tierHeight * 0.68,
      includeRoots ? leftBotX - 110 : leftBotX,
      bottomY + 10
    );
    if (includeRoots) {
      ctx.quadraticCurveTo(
        botCx - bottomHalfW * 0.95,
        bottomY + 48,
        botCx - bottomHalfW * 0.42,
        bottomY + 26
      );
      ctx.quadraticCurveTo(
        botCx + bottomHalfW * 0.08,
        bottomY + 54,
        botCx + bottomHalfW * 0.55,
        bottomY + 28
      );
      ctx.quadraticCurveTo(
        botCx + bottomHalfW * 1.05,
        bottomY + 50,
        rightBotX + 125,
        bottomY + 10
      );
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(includeRoots ? rightBotX + 125 : rightBotX, bottomY + 10);
    ctx.bezierCurveTo(
      rightMidX2,
      topY + this.tierHeight * 0.68,
      rightMidX1,
      topY + this.tierHeight * 0.34,
      rightTopX,
      topY - 2
    );
    ctx.stroke();

    this.drawMossPatch(ctx, leftMidX1 + 20, topY + 75, 50, 21);
    this.drawMossPatch(ctx, rightMidX2 - 18, topY + 155, 54, 22);
    if (includeRoots) {
      this.drawMossPatch(ctx, leftBotX - 60, bottomY + 14, 78, 24);
      this.drawMossPatch(ctx, rightBotX + 55, bottomY + 16, 74, 22);
      this.drawMossPatch(ctx, botCx - 20, bottomY + 26, 68, 20);
    }

    ctx.restore();
  }

  private drawFractalBarkFissure(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    depth: number,
    rng: () => number
  ): void {
    const midX = (x0 + x1) * 0.5 + (rng() - 0.5) * 24;
    const midY = (y0 + y1) * 0.5;

    ctx.lineWidth = 1.6 + depth * 0.75;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(midX, midY, x1, y1);
    ctx.stroke();

    if (depth > 1 && rng() > 0.32) {
      const forkX = midX + (rng() > 0.5 ? 1 : -1) * (18 + rng() * 20);
      const forkY = midY + (y1 - y0) * (0.28 + rng() * 0.22);
      this.drawFractalBarkFissure(ctx, midX, midY, forkX, forkY, depth - 1, rng);
    }
  }

  private drawFractalRootButtress(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    angle: number,
    len: number,
    radius: number,
    depth: number,
    rng: () => number
  ): void {
    if (depth <= 0 || radius < 4) return;

    const x1 = x0 + Math.cos(angle) * len;
    const y1 = y0 + Math.sin(angle) * len * 0.4;
    const ctrlX = (x0 + x1) * 0.5 + (rng() - 0.5) * 20;
    const ctrlY = Math.min(y0, y1) - 9;
    const endR = radius * 0.45;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0 - radius * 0.55);
    ctx.quadraticCurveTo(ctrlX, ctrlY, x1, y1 - endR * 0.5);
    ctx.lineTo(x1, y1 + endR * 0.5);
    ctx.quadraticCurveTo(ctrlX, ctrlY + radius * 0.7, x0, y0 + radius * 0.55);
    ctx.closePath();

    ctx.fillStyle = '#68594b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#241b14';
    ctx.stroke();
    ctx.restore();

    if (depth > 1) {
      this.drawFractalRootButtress(
        ctx,
        x1 - Math.cos(angle) * 18,
        y1,
        angle + 0.24,
        len * 0.56,
        radius * 0.56,
        depth - 1,
        rng
      );
      this.drawFractalRootButtress(
        ctx,
        x1 - Math.cos(angle) * 18,
        y1,
        angle - 0.28,
        len * 0.5,
        radius * 0.5,
        depth - 1,
        rng
      );
    }
  }

  private drawBarkKnot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rx: number,
    ry: number
  ): void {
    ctx.save();
    ctx.fillStyle = '#56493e';
    ctx.strokeStyle = '#241b14';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.58, ry * 0.58, 0.15, 0.4, Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();
  }

  private drawPenCrossHatching(
    ctx: CanvasRenderingContext2D,
    x: number,
    startY: number,
    endY: number,
    width: number
  ): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(36, 27, 20, 0.42)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let y = startY; y < endY; y += 9) {
      const jitter = Math.sin(y * 0.17) * 5;
      ctx.beginPath();
      ctx.moveTo(x - width * 0.5 + jitter, y);
      ctx.lineTo(x + width * 0.5 + jitter, y + 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawIvyVine(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    seed: number
  ): void {
    ctx.save();
    const ctrlX = (x0 + x1) * 0.5 + Math.sin(seed) * 48;
    const ctrlY = (y0 + y1) * 0.5;

    ctx.strokeStyle = '#386641';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(ctrlX, ctrlY, x1, y1);
    ctx.stroke();

    const leafCount = 9;
    for (let i = 1; i < leafCount; i++) {
      const t = i / leafCount;
      const u = 1 - t;
      const lx = u * u * x0 + 2 * u * t * ctrlX + t * t * x1;
      const ly = u * u * y0 + 2 * u * t * ctrlY + t * t * y1;
      const side = i % 2 === 0 ? 1 : -1;

      ctx.save();
      ctx.translate(lx + side * 10, ly);
      ctx.rotate(side * 0.55);
      ctx.fillStyle = i % 3 === 0 ? '#a7db65' : '#6bbf59';
      ctx.strokeStyle = '#1e3f20';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.quadraticCurveTo(9, -1, 0, 9);
      ctx.quadraticCurveTo(-9, -1, 0, -9);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawNaturalTreeHollow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rx: number,
    ry: number,
    glowHex: string
  ): void {
    ctx.save();

    ctx.beginPath();
    ctx.ellipse(x, y, rx + 14, ry + 14, 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#4e4136';
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#241b14';
    ctx.stroke();

    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (rx + 2), y + Math.sin(a) * (ry + 2));
      ctx.lineTo(x + Math.cos(a) * (rx + 12), y + Math.sin(a) * (ry + 12));
      ctx.stroke();
    }

    const innerGrad = ctx.createRadialGradient(
      x,
      y + 8,
      6,
      x,
      y,
      Math.max(rx, ry)
    );
    innerGrad.addColorStop(0, '#fff3b0');
    innerGrad.addColorStop(0.48, glowHex);
    innerGrad.addColorStop(0.84, '#2d1a0c');
    innerGrad.addColorStop(1, '#140b05');

    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.08, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1a0f07';
    ctx.stroke();

    this.drawMossPatch(ctx, x - 4, y - ry - 6, rx * 0.88, 15);

    ctx.fillStyle = '#8a6547';
    ctx.strokeStyle = '#241b14';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(x - rx * 0.92, y + ry - 9, rx * 1.84, 16, 6);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawWoodenStairway(
    ctx: CanvasRenderingContext2D,
    botCx: number,
    topCx: number,
    bottomY: number,
    topY: number,
    trunkHalfW: number,
    tierIndex: number
  ): void {
    ctx.save();
    const steps = 8;
    const dir = tierIndex % 2 === 0 ? 1 : -1;

    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const sy = bottomY - t * (bottomY - topY);
      const spineX = Phaser.Math.Linear(botCx, topCx, t);
      const sx =
        spineX +
        Math.sin(t * Math.PI * 1.3 + tierIndex) * (trunkHalfW * 0.45) * dir;

      ctx.fillStyle = '#9c6b43';
      ctx.strokeStyle = '#241b14';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.roundRect(sx - 32, sy - 5, 64, 11, 5);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawMossPatch(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rx: number,
    ry: number
  ): void {
    ctx.save();

    ctx.beginPath();
    const bumps = 8;
    for (let i = 0; i < bumps; i++) {
      const a0 = (i / bumps) * Math.PI * 2;
      const aMid = ((i + 0.5) / bumps) * Math.PI * 2;
      const a1 = ((i + 1) / bumps) * Math.PI * 2;
      const x0 = x + Math.cos(a0) * rx;
      const y0 = y + Math.sin(a0) * ry;
      const xm = x + Math.cos(aMid) * rx * 1.18;
      const ym = y + Math.sin(aMid) * ry * 1.22;
      const x1 = x + Math.cos(a1) * rx;
      const y1 = y + Math.sin(a1) * ry;
      if (i === 0) ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(xm, ym, x1, y1);
    }
    ctx.closePath();

    ctx.fillStyle = '#6bbf59';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#1e3f20';
    ctx.stroke();

    ctx.fillStyle = '#a7db65';
    ctx.beginPath();
    ctx.ellipse(
      x - rx * 0.15,
      y - ry * 0.2,
      rx * 0.55,
      ry * 0.45,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }

  private drawCamphorFoliageCloud(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    seed: number,
    includeSunlitFlushes: boolean
  ): void {
    ctx.save();

    const layers = includeSunlitFlushes
      ? [
          { scale: 1.0, fill: '#285932', stroke: '#14301a', yOff: 10 },
          { scale: 0.86, fill: '#438a46', stroke: '#1e4223', yOff: 0 },
          { scale: 0.7, fill: '#72bf52', stroke: '#2d6331', yOff: -10 },
          { scale: 0.48, fill: '#aae063', stroke: '#3f7d3c', yOff: -18 }
        ]
      : [
          { scale: 1.0, fill: '#1e4627', stroke: '#112916', yOff: 8 },
          { scale: 0.84, fill: '#2e6938', stroke: '#18381e', yOff: -2 },
          { scale: 0.64, fill: '#4f9649', stroke: '#24522a', yOff: -12 }
        ];

    for (const layer of layers) {
      ctx.beginPath();
      const lobes = 14;
      for (let i = 0; i < lobes; i++) {
        const a0 = (i / lobes) * Math.PI * 2;
        const aMid = ((i + 0.5) / lobes) * Math.PI * 2;
        const a1 = ((i + 1) / lobes) * Math.PI * 2;
        const wobble = 1 + 0.16 * Math.sin(seed + i * 2.5);

        const x0 = cx + Math.cos(a0) * rx * layer.scale;
        const y0 = cy + layer.yOff + Math.sin(a0) * ry * layer.scale;
        const xm = cx + Math.cos(aMid) * rx * layer.scale * 1.2 * wobble;
        const ym =
          cy + layer.yOff + Math.sin(aMid) * ry * layer.scale * 1.2 * wobble;
        const x1 = cx + Math.cos(a1) * rx * layer.scale;
        const y1 = cy + layer.yOff + Math.sin(a1) * ry * layer.scale;

        if (i === 0) ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(xm, ym, x1, y1);
      }
      ctx.closePath();
      ctx.fillStyle = layer.fill;
      ctx.fill();
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = layer.stroke;
      ctx.stroke();
    }

    if (includeSunlitFlushes) {
      for (let f = -1; f <= 1; f += 2) {
        const fx = cx + f * rx * 0.42;
        const fy = cy - ry * 0.52 + Math.sin(seed + f) * 8;
        ctx.fillStyle = '#e08752';
        ctx.strokeStyle = '#5c2c16';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 18, 9, f * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#222b38';
      ctx.strokeStyle = '#0d131a';
      ctx.lineWidth = 1.5;
      for (let b = 0; b < 3; b++) {
        const bx = cx + (b - 1) * 9 + Math.cos(seed) * 14;
        const by = cy + 6 + (b % 2) * 5;
        ctx.beginPath();
        ctx.arc(bx, by, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#1e4223';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      const lx = cx + k * (rx * 0.28);
      const ly = cy - 5 + Math.sin(seed + k) * 12;
      ctx.beginPath();
      ctx.arc(lx, ly, 18, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }

    ctx.restore();
  }
}
