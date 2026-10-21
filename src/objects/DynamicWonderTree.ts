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

const UNIQUE_ACTIVITIES: Array<{
  id: string;
  minigame: string;
  glowHex: string;
  branchSide: 'left' | 'center' | 'right';
}> = [
  {
    id: 'portal_math',
    minigame: 'Acorn Scale',
    glowHex: '#ffd166',
    branchSide: 'left'
  },
  {
    id: 'portal_hub',
    minigame: 'The Clockwork Tower',
    glowHex: '#90e0ef',
    branchSide: 'center'
  },
  {
    id: 'portal_music',
    minigame: 'Rhythm in the Branches',
    glowHex: '#80ed99',
    branchSide: 'right'
  }
];

/**
 * Deterministic seeded PRNG (Mulberry32) so fractal branching is organic,
 * asymmetric, and reproducible across frames/resizes.
 */
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
 * DynamicWonderTree — Explicit, procedurally generated 2D hand-drawn fractal
 * Wonder Tree. Uses an asymmetric recursive L-system / Leonardo da Vinci
 * cross-sectional pipe model (r^alpha = r1^alpha + r2^alpha) with unequal
 * split ratios, gnarled curving trunk spine, recursive root buttresses, and
 * 5-level fractal branch bifurcations rendered in 2D pen-and-ink + watercolor.
 */
export class DynamicWonderTree {
  private scene: Phaser.Scene;
  private rootContainer: Phaser.GameObjects.Container;
  private crownContainer: Phaser.GameObjects.Container;
  private sproutBudContainer!: Phaser.GameObjects.Container;
  private tiers: TierVisual[] = [];
  private spineNodes: TrunkSpineNode[] = [];
  private allAnchors: TreeHollowAnchor[] = [];
  private placedActivities = new Set<string>();
  private readonly tierHeight = 330;
  private readonly baseTrunkHalfWidth = 275;
  private onNewAnchorCreated?: (anchor: TreeHollowAnchor) => void;
  private onTreeGrew?: (newTotalTiers: number) => void;

  constructor(
    scene: Phaser.Scene,
    initialTiers = 2,
    onNewAnchorCreated?: (anchor: TreeHollowAnchor) => void,
    onTreeGrew?: (newTotalTiers: number) => void
  ) {
    this.scene = scene;
    this.onNewAnchorCreated = onNewAnchorCreated;
    this.onTreeGrew = onTreeGrew;

    this.rootContainer = scene.add.container(0, 0).setDepth(5);
    this.crownContainer = scene.add.container(0, 0).setDepth(8);
    this.rootContainer.add(this.crownContainer);

    // Initialize base spine node with a natural slight lean
    this.spineNodes.push({
      centerX: -18,
      halfWidth: this.baseTrunkHalfWidth,
      leanAngle: -0.09
    });

    for (let t = 0; t < initialTiers; t++) {
      this.appendTier(t, false);
    }

    this.rebuildFractalCrownAndSproutBud();
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
    return this.tiers.length * this.tierHeight + 340;
  }

  /**
   * Dynamically grows a new asymmetric fractal tier upwards from the current
   * apical trunk spine node.
   */
  public growUpwards(animate = true): TreeHollowAnchor[] {
    const nextTierIndex = this.tiers.length;
    const created = this.appendTier(nextTierIndex, animate);
    this.rebuildFractalCrownAndSproutBud(animate);
    if (this.onTreeGrew) {
      this.onTreeGrew(this.tiers.length);
    }
    return created;
  }

  private getOrComputeSpineNode(tierIndex: number): TrunkSpineNode {
    while (this.spineNodes.length <= tierIndex) {
      const idx = this.spineNodes.length;
      const prev = this.spineNodes[idx - 1];
      const rng = createSeededRng(idx * 9173 + 1337);

      // Asymmetric organic meander of the main trunk spine
      const swingDir = idx % 2 === 1 ? 1 : -1;
      const deltaX = swingDir * (36 + rng() * 34) + (rng() - 0.5) * 18;
      const nextCenterX = Phaser.Math.Clamp(prev.centerX + deltaX, -95, 95);
      // Leonardo pipe-model taper as lateral fractal boughs split off
      const nextHalfW = Math.max(145, prev.halfWidth * (0.84 + rng() * 0.05));
      const nextLean = (nextCenterX - prev.centerX) / this.tierHeight;

      this.spineNodes.push({
        centerX: nextCenterX,
        halfWidth: nextHalfW,
        leanAngle: nextLean
      });
    }
    return this.spineNodes[tierIndex];
  }

  private appendTier(tierIndex: number, animate: boolean): TreeHollowAnchor[] {
    const texKey = `wonder_tree_fractal_tier_${tierIndex}_${Date.now()}`;
    const canvasW = 1640;
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
      this.drawFractalTier(ctx, canvasW, canvasH, tierIndex, createdAnchors);
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
        duration: 750,
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
   * Renders an asymmetric, multi-forked recursive fractal crown at the top of
   * the tree along with the interactive "🌱 Grow New Branch" bud.
   */
  private rebuildFractalCrownAndSproutBud(animate = false): void {
    this.crownContainer.removeAll(true);

    const topTierIdx = this.tiers.length;
    const topNode = this.getOrComputeSpineNode(topTierIdx);
    const crownBaseY = -topTierIdx * this.tierHeight + 14;

    const texKey = `wonder_tree_fractal_crown_${topTierIdx}_${Date.now()}`;
    const canvasW = 1640;
    const canvasH = 460;
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
      const cx = canvasW / 2 + topNode.centerX;
      const cy = canvasH - 65;
      const rng = createSeededRng(topTierIdx * 4099 + 77);

      const foliageQueue: Array<{
        x: number;
        y: number;
        rx: number;
        ry: number;
        seed: number;
      }> = [];

      // Asymmetric 3-way main crown fork using Leonardo's area-preserving rule
      this.drawRecursiveFractalBranch(
        ctx,
        cx - topNode.halfWidth * 0.48,
        cy,
        -Math.PI * 0.76 + (rng() - 0.5) * 0.12,
        155,
        topNode.halfWidth * 0.46,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveFractalBranch(
        ctx,
        cx + topNode.halfWidth * 0.42,
        cy + 8,
        -Math.PI * 0.22 + (rng() - 0.5) * 0.12,
        170,
        topNode.halfWidth * 0.5,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveFractalBranch(
        ctx,
        cx - 8,
        cy - 10,
        -Math.PI * 0.53 + (rng() - 0.5) * 0.14,
        140,
        topNode.halfWidth * 0.44,
        4,
        rng,
        foliageQueue
      );

      // Paint terminal leaf clusters gathered from the fractal twigs
      for (const f of foliageQueue) {
        this.drawFoliageCluster(ctx, f.x, f.y, f.rx, f.ry, f.seed);
      }

      ctx.restore();
      canvasTex.refresh();
    }

    const crownImg = this.scene.add
      .image(0, crownBaseY - 165, texKey)
      .setScale(1 / dpr);
    this.crownContainer.add(crownImg);

    this.sproutBudContainer = this.scene.add.container(
      topNode.centerX,
      crownBaseY - 235
    );

    const budGlow = this.scene.add.circle(0, 0, 34, 0xffe66d, 0.3);
    const budCircle = this.scene.add
      .circle(0, 0, 24, 0x1b4332, 0.94)
      .setStrokeStyle(3, 0xffd166)
      .setInteractive({ useHandCursor: true });

    const budIcon = this.scene.add
      .text(0, 0, '🌱', { fontSize: '22px' })
      .setOrigin(0.5);

    const budLabel = this.scene.add
      .text(0, -36, '✨ Grow New Branch', {
        fontSize: '13px',
        color: '#fff3b0',
        fontStyle: 'bold',
        backgroundColor: '#162418dd',
        padding: { x: 9, y: 4 }
      })
      .setOrigin(0.5);

    this.scene.tweens.add({
      targets: budGlow,
      scale: 1.3,
      alpha: 0.5,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    budCircle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.growUpwards(true);
    });

    this.sproutBudContainer.add([budGlow, budCircle, budIcon, budLabel]);
    this.crownContainer.add(this.sproutBudContainer);

    if (animate) {
      this.crownContainer.setAlpha(0.3);
      this.scene.tweens.add({
        targets: this.crownContainer,
        alpha: 1,
        duration: 500,
        ease: 'Sine.easeOut'
      });
    }
  }

  /**
   * Recursive Fractal Branch Generator (Asymmetric L-System + Leonardo da Vinci's
   * cross-sectional pipe rule: r_parent^2.15 = r_1^2.15 + r_2^2.15).
   * Produces realistic, self-similar crooked boughs, secondary limbs, and twigs.
   */
  private drawRecursiveFractalBranch(
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

    // Asymmetric natural curvature along this branch segment
    const bend = (rng() - 0.46) * 0.28;
    const x1 = x0 + Math.cos(angle) * length;
    const y1 = y0 + Math.sin(angle) * length;

    const midAngle = angle + bend;
    const ctrlX = x0 + Math.cos(midAngle) * (length * 0.54);
    const ctrlY = y0 + Math.sin(midAngle) * (length * 0.54);

    // Leonardo da Vinci area-preserving split ratio p in [0.56, 0.72]
    const splitRatio = 0.56 + rng() * 0.16;
    const endRadius = radius * 0.76;

    // Compute perpendicular normals for organic tapered Bezier polygon
    const nx0 = -Math.sin(angle);
    const ny0 = Math.cos(angle);
    const nx1 = -Math.sin(angle + bend * 0.5);
    const ny1 = Math.cos(angle + bend * 0.5);

    const buildSegmentPath = () => {
      ctx.beginPath();
      ctx.moveTo(x0 + nx0 * radius, y0 + ny0 * radius);
      ctx.quadraticCurveTo(
        ctrlX + nx0 * (radius * 0.88),
        ctrlY + ny0 * (radius * 0.88),
        x1 + nx1 * endRadius,
        y1 + ny1 * endRadius
      );
      ctx.lineTo(x1 - nx1 * endRadius, y1 - ny1 * endRadius);
      ctx.quadraticCurveTo(
        ctrlX - nx0 * (radius * 0.88),
        ctrlY - ny0 * (radius * 0.88),
        x0 - nx0 * radius,
        y0 - ny0 * radius
      );
      ctx.closePath();
    };

    // 1. Flat 2D warm watercolor bark fill
    buildSegmentPath();
    ctx.fillStyle = depth >= 3 ? '#785238' : '#6c4830';
    ctx.fill();

    // 2. Flat 2D cel-shaded underside shadow band
    ctx.save();
    buildSegmentPath();
    ctx.clip();

    ctx.fillStyle = '#563824';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(ctrlX, ctrlY, x1, y1);
    ctx.lineTo(x1 - nx1 * endRadius * 1.4, y1 + Math.abs(ny1) * endRadius * 1.4 + 20);
    ctx.lineTo(x0 - nx0 * radius * 1.4, y0 + Math.abs(ny0) * radius * 1.4 + 20);
    ctx.closePath();
    ctx.fill();

    // Sketchy internal pen bark lines on thicker limbs
    if (radius > 10) {
      ctx.strokeStyle = '#26160c';
      ctx.lineWidth = Math.max(1.4, radius * 0.06);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(
        x0 + Math.cos(angle) * (length * 0.15),
        y0 + Math.sin(angle) * (length * 0.15)
      );
      ctx.quadraticCurveTo(
        ctrlX,
        ctrlY,
        x1 - Math.cos(angle) * (length * 0.15),
        y1 - Math.sin(angle) * (length * 0.15)
      );
      ctx.stroke();
    }
    ctx.restore();

    // 3. Hand-inked dip-pen outline
    buildSegmentPath();
    ctx.lineWidth = Math.max(2.2, Math.min(4.8, radius * 0.14));
    ctx.strokeStyle = '#23140b';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Moss cushion on top of major horizontal-ish limbs
    if (depth === 4 && Math.abs(Math.cos(angle)) > 0.45) {
      this.drawMossPatch(ctx, ctrlX, ctrlY - radius * 0.65, radius * 0.95, 13);
    }

    // Queue terminal hand-drawn leaf clusters at outer fractal branches
    if (depth <= 2) {
      foliageQueue.push({
        x: x1,
        y: y1 - 12,
        rx: 72 + depth * 36 + rng() * 24,
        ry: 44 + depth * 20 + rng() * 14,
        seed: Math.floor(rng() * 1000)
      });
    }

    // 4. Recursive Asymmetric Fractal Bifurcation (and occasional Trifurcation)
    const leonardoExp = 0.46; // 1 / 2.17
    const rDominant = endRadius * Math.pow(splitRatio, leonardoExp);
    const rSecondary = endRadius * Math.pow(1 - splitRatio, leonardoExp);

    // Dominant child branch bends gently; secondary child branch angles away more steeply
    const sideSign = rng() > 0.48 ? 1 : -1;
    const angleDom =
      angle + sideSign * (0.18 + rng() * 0.22) - Math.sin(angle) * 0.06;
    const angleSec =
      angle - sideSign * (0.42 + rng() * 0.34) - Math.sin(angle) * 0.08;

    const lenDom = length * (0.74 + rng() * 0.12);
    const lenSec = length * (0.58 + rng() * 0.16);

    this.drawRecursiveFractalBranch(
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

    this.drawRecursiveFractalBranch(
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

    // Occasional 3rd epicormic twig shoot for extra organic asymmetry
    if (depth >= 3 && rng() > 0.42) {
      const shootT = 0.45 + rng() * 0.25;
      const sx = x0 + (x1 - x0) * shootT;
      const sy = y0 + (y1 - y0) * shootT;
      const shootAngle = angle + (rng() > 0.5 ? 0.65 : -0.68);
      this.drawRecursiveFractalBranch(
        ctx,
        sx,
        sy,
        shootAngle,
        length * 0.48,
        radius * 0.38,
        depth - 2,
        rng,
        foliageQueue
      );
    }
  }

  private drawFractalTier(
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
    const rng = createSeededRng(tierIndex * 65537 + 42);

    const botCx = midX + bottomNode.centerX;
    const topCx = midX + topNode.centerX;

    const foliageQueue: Array<{
      x: number;
      y: number;
      rx: number;
      ry: number;
      seed: number;
    }> = [];

    // 1. Asymmetric Primary Fractal Boughs emerging at different heights and angles
    // Left fractal bough (positioned asymmetrically vs right bough)
    const leftOriginY =
      topY + (tierIndex % 2 === 0 ? 155 : 92) + (rng() - 0.5) * 24;
    const leftOriginX =
       Phaser.Math.Linear(topCx, botCx, (leftOriginY - topY) / this.tierHeight) -
      topNode.halfWidth * 0.72;
    const leftAngle =
      -Math.PI + (tierIndex % 2 === 0 ? 0.28 : 0.42) + (rng() - 0.5) * 0.1;
    const leftLen = (tierIndex % 2 === 0 ? 195 : 155) + rng() * 30;

    this.drawRecursiveFractalBranch(
      ctx,
      leftOriginX,
      leftOriginY,
      leftAngle,
      leftLen,
      48,
      4,
      rng,
      foliageQueue
    );

    // Right fractal bough (at a distinctly different height, length, and angle!)
    const rightOriginY =
      topY + (tierIndex % 2 === 0 ? 78 : 168) + (rng() - 0.5) * 24;
    const rightOriginX =
      Phaser.Math.Linear(topCx, botCx, (rightOriginY - topY) / this.tierHeight) +
      topNode.halfWidth * 0.74;
    const rightAngle =
      -(tierIndex % 2 === 0 ? 0.36 : 0.22) + (rng() - 0.5) * 0.1;
    const rightLen = (tierIndex % 2 === 0 ? 165 : 205) + rng() * 30;

    this.drawRecursiveFractalBranch(
      ctx,
      rightOriginX,
      rightOriginY,
      rightAngle,
      rightLen,
      50,
      4,
      rng,
      foliageQueue
    );

    // Extra asymmetric mid-tier secondary limb on one side only
    const extraSide = tierIndex % 2 === 0 ? -1 : 1;
    const extraY = topY + 215;
    const extraX =
      Phaser.Math.Linear(topCx, botCx, (extraY - topY) / this.tierHeight) +
      extraSide * topNode.halfWidth * 0.78;
    this.drawRecursiveFractalBranch(
      ctx,
      extraX,
      extraY,
      extraSide < 0 ? -Math.PI + 0.18 : -0.18,
      135,
      34,
      3,
      rng,
      foliageQueue
    );

    // 2. Render background leaf clusters behind the trunk
    for (let i = 0; i < foliageQueue.length; i += 2) {
      const f = foliageQueue[i];
      this.drawFoliageCluster(ctx, f.x, f.y, f.rx, f.ry, f.seed);
    }

    // 3. Asymmetric Gnarled 2D Hand-Drawn Trunk Segment & Fractal Root System
    this.drawAsymmetricFractalTrunk(
      ctx,
      botCx,
      topCx,
      bottomY,
      topY,
      bottomNode.halfWidth,
      topNode.halfWidth,
      tierIndex,
      rng
    );

    // 4. Render foreground leaf clusters overlapping boughs
    for (let i = 1; i < foliageQueue.length; i += 2) {
      const f = foliageQueue[i];
      this.drawFoliageCluster(ctx, f.x, f.y, f.rx * 0.9, f.ry * 0.9, f.seed + 7);
    }

    // 5. Winding asymmetric wooden steps following the trunk curve
    this.drawWoodenStairway(
      ctx,
      botCx,
      topCx,
      bottomY,
      topY,
      bottomNode.halfWidth,
      tierIndex
    );

    // 6. Natural Carved Tree Hollows (each unique activity appears strictly ONCE)
    if (tierIndex === 0) {
      const mathDef = UNIQUE_ACTIVITIES[0];
      if (!this.placedActivities.has(mathDef.minigame)) {
        this.placedActivities.add(mathDef.minigame);
        const leftHollowX = botCx - 148;
        const leftHollowY = bottomY - 76;
        this.drawNaturalTreeHollow(
          ctx,
          leftHollowX,
          leftHollowY,
          52,
          62,
          mathDef.glowHex
        );
        outAnchors.push({
          id: mathDef.id,
          tierIndex: 0,
          minigame: mathDef.minigame,
          localX: leftHollowX - midX,
          localY: leftHollowY - bottomY,
          branchSide: mathDef.branchSide
        });
      }

      const hubDef = UNIQUE_ACTIVITIES[1];
      if (!this.placedActivities.has(hubDef.minigame)) {
        this.placedActivities.add(hubDef.minigame);
        const centerHollowX = topCx + 42;
        const centerHollowY = topY + 112;
        this.drawNaturalTreeHollow(
          ctx,
          centerHollowX,
          centerHollowY,
          52,
          62,
          hubDef.glowHex
        );
        outAnchors.push({
          id: hubDef.id,
          tierIndex: 0,
          minigame: hubDef.minigame,
          localX: centerHollowX - midX,
          localY: centerHollowY - bottomY,
          branchSide: hubDef.branchSide
        });
      }
    } else {
      const nextActivity = UNIQUE_ACTIVITIES.find(
        (act) => !this.placedActivities.has(act.minigame)
      );
      if (nextActivity) {
        this.placedActivities.add(nextActivity.minigame);
        const hollowX =
          nextActivity.branchSide === 'left'
            ? topCx - 165
            : nextActivity.branchSide === 'right'
              ? topCx + 175
              : topCx - 15;
        const hollowY = topY + 118;
        this.drawNaturalTreeHollow(
          ctx,
          hollowX,
          hollowY,
          50,
          60,
          nextActivity.glowHex
        );
        outAnchors.push({
          id: nextActivity.id,
          tierIndex,
          minigame: nextActivity.minigame,
          localX: hollowX - midX,
          localY: hollowY - bottomY,
          branchSide: nextActivity.branchSide
        });
      }
    }
  }

  /**
   * Draws an asymmetric, gnarled 2D hand-drawn trunk segment whose left and right
   * walls bulge and curve independently, with fractal branching roots on Tier 0.
   */
  private drawAsymmetricFractalTrunk(
    ctx: CanvasRenderingContext2D,
    botCx: number,
    topCx: number,
    bottomY: number,
    topY: number,
    bottomHalfW: number,
    topHalfW: number,
    tierIndex: number,
    rng: () => number
  ): void {
    const includeRoots = tierIndex === 0;
    ctx.save();

    // Asymmetric left and right wall offsets so the trunk is never a symmetric cylinder
    const leftTopX = topCx - topHalfW * (0.94 + (tierIndex % 2) * 0.12);
    const rightTopX = topCx + topHalfW * (1.06 - (tierIndex % 2) * 0.12);
    const leftBotX = botCx - bottomHalfW * (0.94 + ((tierIndex + 1) % 2) * 0.12);
    const rightBotX = botCx + bottomHalfW * (1.06 - ((tierIndex + 1) % 2) * 0.12);

    // Gnarled intermediate control points with asymmetric burls
    const leftMidX1 =
      Phaser.Math.Linear(leftTopX, leftBotX, 0.35) - 28 + (rng() - 0.5) * 26;
    const leftMidX2 =
      Phaser.Math.Linear(leftTopX, leftBotX, 0.72) + 18 + (rng() - 0.5) * 26;
    const rightMidX1 =
      Phaser.Math.Linear(rightTopX, rightBotX, 0.32) + 16 + (rng() - 0.5) * 26;
    const rightMidX2 =
      Phaser.Math.Linear(rightTopX, rightBotX, 0.68) - 24 + (rng() - 0.5) * 26;

    // On Tier 0, draw recursive fractal root buttresses radiating asymmetrically
    if (includeRoots) {
      const rootConfigs = [
        { startX: leftBotX + 35, angle: Math.PI - 0.34, len: 185, r: 46 },
        { startX: leftBotX + 125, angle: Math.PI - 0.62, len: 135, r: 38 },
        { startX: botCx - 25, angle: Math.PI * 0.58, len: 95, r: 34 },
        { startX: rightBotX - 115, angle: 0.52, len: 145, r: 40 },
        { startX: rightBotX - 30, angle: 0.26, len: 205, r: 48 }
      ];
      for (const rc of rootConfigs) {
        this.drawFractalRootButtress(
          ctx,
          rc.startX,
          bottomY - 22,
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
      ctx.moveTo(leftTopX, topY);
      ctx.bezierCurveTo(
        leftMidX1,
        topY + this.tierHeight * 0.34,
        leftMidX2,
        topY + this.tierHeight * 0.68,
        includeRoots ? leftBotX - 95 : leftBotX,
        bottomY + 8
      );

      if (includeRoots) {
        // Irregular asymmetric root toes across the glade floor
        ctx.quadraticCurveTo(
          botCx - bottomHalfW * 0.95,
          bottomY + 46,
          botCx - bottomHalfW * 0.42,
          bottomY + 24
        );
        ctx.quadraticCurveTo(
          botCx + bottomHalfW * 0.08,
          bottomY + 52,
          botCx + bottomHalfW * 0.55,
          bottomY + 26
        );
        ctx.quadraticCurveTo(
          botCx + bottomHalfW * 1.05,
          bottomY + 48,
          rightBotX + 110,
          bottomY + 10
        );
      } else {
        ctx.lineTo(rightBotX, bottomY + 8);
      }

      ctx.bezierCurveTo(
        rightMidX2,
        topY + this.tierHeight * 0.68,
        rightMidX1,
        topY + this.tierHeight * 0.34,
        rightTopX,
        topY
      );
      ctx.closePath();
    };

    // 1. Flat 2D warm watercolor base fill
    buildTrunkPath();
    ctx.fillStyle = '#785238';
    ctx.fill();

    // 2. Clip inside the trunk for 2D cel-shaded watercolor zones & fractal bark plates
    ctx.save();
    buildTrunkPath();
    ctx.clip();

    // Sunlit irregular watercolor wash on the left-center face
    ctx.fillStyle = '#8a6245';
    ctx.beginPath();
    ctx.moveTo(leftTopX - 40, topY - 10);
    ctx.lineTo(topCx - topHalfW * 0.12, topY - 10);
    ctx.bezierCurveTo(
      botCx - bottomHalfW * 0.38,
      (topY + bottomY) * 0.45,
      botCx + bottomHalfW * 0.05,
      bottomY - 50,
      botCx - bottomHalfW * 0.32,
      bottomY + 60
    );
    ctx.lineTo(leftBotX - 180, bottomY + 60);
    ctx.closePath();
    ctx.fill();

    // Asymmetric cel-shaded shadow band along the right wall
    ctx.fillStyle = '#5c3d28';
    ctx.beginPath();
    ctx.moveTo(topCx + topHalfW * 0.32, topY - 10);
    ctx.lineTo(rightTopX + 140, topY - 10);
    ctx.lineTo(rightBotX + 180, bottomY + 60);
    ctx.lineTo(botCx + bottomHalfW * 0.36, bottomY + 60);
    ctx.bezierCurveTo(
      botCx + bottomHalfW * 0.18,
      bottomY - 80,
      topCx + topHalfW * 0.54,
      (topY + bottomY) * 0.42,
      topCx + topHalfW * 0.32,
      topY - 10
    );
    ctx.closePath();
    ctx.fill();

    // Irregular hand-painted bark plates
    const plateColors = ['#6b4730', '#825a3e', '#63412b', '#7d563b'];
    for (let p = 0; p < 15; p++) {
      const t = (p + 0.5) / 15;
      const spineX = Phaser.Math.Linear(topCx, botCx, t);
      const px = spineX + (rng() - 0.5) * topHalfW * 1.45;
      const py = topY + 24 + t * (this.tierHeight - 40) + (rng() - 0.5) * 25;
      const pw = 28 + rng() * 34;
      const ph = 48 + rng() * 52;

      ctx.fillStyle = plateColors[p % plateColors.length];
      ctx.beginPath();
      ctx.roundRect(px - pw / 2, py - ph / 2, pw, ph, 10);
      ctx.fill();
    }

    // 3. Fractal branching bark fissure lines (organic Y-forking ink cracks)
    ctx.strokeStyle = '#26160c';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let f = 0; f < 11; f++) {
      const fracRatio = (f - 5) / 5.8 + (rng() - 0.5) * 0.08;
      const startX = topCx + fracRatio * topHalfW * 0.88;
      const endX = botCx + fracRatio * bottomHalfW * 0.92;
      this.drawFractalBarkFissure(
        ctx,
        startX,
        topY + 10 + rng() * 35,
        endX,
        bottomY - 12 - rng() * 30,
        2,
        rng
      );
    }

    // Asymmetric wood knots / burls
    this.drawBarkKnot(
      ctx,
      topCx - topHalfW * (0.35 + rng() * 0.2),
      topY + 110 + rng() * 60,
      19,
      27
    );
    this.drawBarkKnot(
      ctx,
      botCx + bottomHalfW * (0.28 + rng() * 0.22),
      topY + 195 + rng() * 55,
      17,
      24
    );

    // Pen cross-hatching in deep bark crevices
    this.drawPenCrossHatching(
      ctx,
      rightTopX - 36,
      topY + 30,
      bottomY - 25,
      28
    );

    // Asymmetric climbing ivy vines
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

    ctx.restore(); // end trunk clip

    // 4. Hand-inked outer dip-pen contour
    buildTrunkPath();
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = '#23140b';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 5. Asymmetric mossy cushions
    this.drawMossPatch(ctx, leftMidX1 + 18, topY + 75, 46, 20);
    this.drawMossPatch(ctx, rightMidX2 - 16, topY + 155, 50, 21);
    if (includeRoots) {
      this.drawMossPatch(ctx, leftBotX - 55, bottomY + 14, 72, 22);
      this.drawMossPatch(ctx, rightBotX + 48, bottomY + 16, 68, 20);
      this.drawMossPatch(ctx, botCx - 18, bottomY + 26, 62, 19);
    }

    ctx.restore();
  }

  /**
   * Draws a recursive branching bark fissure (Y-forking ink crack) on the trunk.
   */
  private drawFractalBarkFissure(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    depth: number,
    rng: () => number
  ): void {
    const midX = (x0 + x1) * 0.5 + (rng() - 0.5) * 22;
    const midY = (y0 + y1) * 0.5;

    ctx.lineWidth = 1.6 + depth * 0.7;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(midX, midY, x1, y1);
    ctx.stroke();

    if (depth > 1 && rng() > 0.35) {
      const forkX = midX + (rng() > 0.5 ? 1 : -1) * (18 + rng() * 18);
      const forkY = midY + (y1 - y0) * (0.28 + rng() * 0.2);
      this.drawFractalBarkFissure(ctx, midX, midY, forkX, forkY, depth - 1, rng);
    }
  }

  /**
   * Recursive fractal root buttress that splits into smaller rootlets along the forest floor.
   */
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
    const y1 = y0 + Math.sin(angle) * len * 0.42; // Flatten roots along the ground plane
    const ctrlX = (x0 + x1) * 0.5 + (rng() - 0.5) * 18;
    const ctrlY = Math.min(y0, y1) - 8;
    const endR = radius * 0.45;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0 - radius * 0.55);
    ctx.quadraticCurveTo(ctrlX, ctrlY, x1, y1 - endR * 0.5);
    ctx.lineTo(x1, y1 + endR * 0.5);
    ctx.quadraticCurveTo(ctrlX, ctrlY + radius * 0.7, x0, y0 + radius * 0.55);
    ctx.closePath();

    ctx.fillStyle = '#6e4a32';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#23140b';
    ctx.stroke();
    ctx.restore();

    if (depth > 1) {
      this.drawFractalRootButtress(
        ctx,
        x1 - Math.cos(angle) * 18,
        y1,
        angle + 0.24,
        len * 0.55,
        radius * 0.55,
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
    ctx.fillStyle = '#5c3d28';
    ctx.strokeStyle = '#26160c';
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
    ctx.strokeStyle = 'rgba(35, 20, 11, 0.42)';
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

    ctx.strokeStyle = '#2d5a27';
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
      ctx.fillStyle = i % 3 === 0 ? '#74c69d' : '#52b788';
      ctx.strokeStyle = '#1b4332';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(9, 0, 0, 9);
      ctx.quadraticCurveTo(-9, 0, 0, -8);
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
    ctx.fillStyle = '#4f331f';
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#23140b';
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

    ctx.fillStyle = '#8a5a36';
    ctx.strokeStyle = '#23140b';
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
        spineX + Math.sin(t * Math.PI * 1.3 + tierIndex) * (trunkHalfW * 0.45) * dir;

      ctx.fillStyle = '#9c6b43';
      ctx.strokeStyle = '#23140b';
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

    ctx.fillStyle = '#52b788';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#1b4332';
    ctx.stroke();

    ctx.fillStyle = '#95d5b2';
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

  private drawFoliageCluster(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    seed: number
  ): void {
    ctx.save();

    const layers = [
      { scale: 1.0, fill: '#24553a', stroke: '#132a1d', yOff: 10 },
      { scale: 0.86, fill: '#367a53', stroke: '#1b4332', yOff: 0 },
      { scale: 0.7, fill: '#52b788', stroke: '#24553a', yOff: -10 },
      { scale: 0.48, fill: '#95d5b2', stroke: '#2d6a4f', yOff: -18 }
    ];

    for (const layer of layers) {
      ctx.beginPath();
      const lobes = 13;
      for (let i = 0; i < lobes; i++) {
        const a0 = (i / lobes) * Math.PI * 2;
        const aMid = ((i + 0.5) / lobes) * Math.PI * 2;
        const a1 = ((i + 1) / lobes) * Math.PI * 2;
        const wobble = 1 + 0.18 * Math.sin(seed + i * 2.7);

        const x0 = cx + Math.cos(a0) * rx * layer.scale;
        const y0 = cy + layer.yOff + Math.sin(a0) * ry * layer.scale;
        const xm = cx + Math.cos(aMid) * rx * layer.scale * 1.22 * wobble;
        const ym =
          cy + layer.yOff + Math.sin(aMid) * ry * layer.scale * 1.22 * wobble;
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

    ctx.strokeStyle = '#1b4332';
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
