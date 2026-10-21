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
 * - Characteristic decurrent camphor growth habit: colossal, squat, deeply
 *   fluted warm ash-brown trunk that divides low into thick, sinuous S-curved
 *   co-dominant fractal limbs supporting a wide, billowing umbrella dome crown.
 * - Glossy bright yellow-green / spring chartreuse camphor foliage clouds with
 *   signature bronze-coral new leaf flushes and dark camphor berries.
 * - Uses Leonardo da Vinci's cross-sectional pipe model (r^alpha = r1^alpha + r2^alpha)
 *   for asymmetric recursive fractal branching.
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
  private readonly tierHeight = 320;
  private readonly baseTrunkHalfWidth = 305;
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

    // Camphor trees have a muscular, slightly leaning base trunk
    this.spineNodes.push({
      centerX: -22,
      halfWidth: this.baseTrunkHalfWidth,
      leanAngle: -0.08
    });

    for (let t = 0; t < initialTiers; t++) {
      this.appendTier(t, false);
    }

    this.rebuildCamphorDomeCrownAndSproutBud();
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
    return this.tiers.length * this.tierHeight + 370;
  }

  /**
   * Dynamically grows a new asymmetric fractal Camphor tier upwards.
   */
  public growUpwards(animate = true): TreeHollowAnchor[] {
    const nextTierIndex = this.tiers.length;
    const created = this.appendTier(nextTierIndex, animate);
    this.rebuildCamphorDomeCrownAndSproutBud(animate);
    if (this.onTreeGrew) {
      this.onTreeGrew(this.tiers.length);
    }
    return created;
  }

  private getOrComputeSpineNode(tierIndex: number): TrunkSpineNode {
    while (this.spineNodes.length <= tierIndex) {
      const idx = this.spineNodes.length;
      const prev = this.spineNodes[idx - 1];
      const rng = createSeededRng(idx * 9173 + 2027);

      const swingDir = idx % 2 === 1 ? 1 : -1;
      const deltaX = swingDir * (38 + rng() * 32) + (rng() - 0.5) * 18;
      const nextCenterX = Phaser.Math.Clamp(prev.centerX + deltaX, -95, 95);
      // Camphor trunk divides into massive co-dominant limbs as it rises
      const nextHalfW = Math.max(155, prev.halfWidth * (0.83 + rng() * 0.05));
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
    const texKey = `camphor_tree_tier_${tierIndex}_${Date.now()}`;
    const canvasW = 1680;
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
      this.drawCamphorFractalTier(ctx, canvasW, canvasH, tierIndex, createdAnchors);
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
   * Renders the signature broad, billowing umbrella-dome crown of an ancient
   * Camphor tree (Cinnamomum camphora), supported by 5 co-dominant S-curved
   * fractal boughs radiating into dense cumulus-like chartreuse-emerald leaf clouds.
   */
  private rebuildCamphorDomeCrownAndSproutBud(animate = false): void {
    this.crownContainer.removeAll(true);

    const topTierIdx = this.tiers.length;
    const topNode = this.getOrComputeSpineNode(topTierIdx);
    const crownBaseY = -topTierIdx * this.tierHeight + 16;

    const texKey = `camphor_tree_crown_${topTierIdx}_${Date.now()}`;
    const canvasW = 1680;
    const canvasH = 500;
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
      const rng = createSeededRng(topTierIdx * 4099 + 109);

      const foliageQueue: Array<{
        x: number;
        y: number;
        rx: number;
        ry: number;
        seed: number;
      }> = [];

      // 1. Background dome canopy clouds (deep camphor shadow green)
      this.drawCamphorFoliageCloud(ctx, cx - 390, cy - 175, 235, 118, 13, false);
      this.drawCamphorFoliageCloud(ctx, cx + 385, cy - 170, 240, 120, 29, false);
      this.drawCamphorFoliageCloud(ctx, cx - 185, cy - 235, 260, 130, 43, false);
      this.drawCamphorFoliageCloud(ctx, cx + 190, cy - 230, 260, 130, 61, false);
      this.drawCamphorFoliageCloud(ctx, cx, cy - 265, 295, 142, 89, false);

      // 2. Co-dominant S-curved fractal Camphor crown limbs fanning into the dome
      this.drawRecursiveCamphorBranch(
        ctx,
        cx - topNode.halfWidth * 0.58,
        cy + 10,
        -Math.PI * 0.82 + (rng() - 0.5) * 0.08,
        185,
        topNode.halfWidth * 0.44,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveCamphorBranch(
        ctx,
        cx - topNode.halfWidth * 0.22,
        cy,
        -Math.PI * 0.64 + (rng() - 0.5) * 0.08,
        175,
        topNode.halfWidth * 0.46,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveCamphorBranch(
        ctx,
        cx + 12,
        cy - 8,
        -Math.PI * 0.47 + (rng() - 0.5) * 0.1,
        165,
        topNode.halfWidth * 0.44,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveCamphorBranch(
        ctx,
        cx + topNode.halfWidth * 0.28,
        cy + 4,
        -Math.PI * 0.32 + (rng() - 0.5) * 0.08,
        180,
        topNode.halfWidth * 0.48,
        4,
        rng,
        foliageQueue
      );
      this.drawRecursiveCamphorBranch(
        ctx,
        cx + topNode.halfWidth * 0.6,
        cy + 12,
        -Math.PI * 0.16 + (rng() - 0.5) * 0.08,
        190,
        topNode.halfWidth * 0.42,
        4,
        rng,
        foliageQueue
      );

      // 3. Foreground sunlit chartreuse-emerald camphor foliage domes & bronze spring flushes
      for (const f of foliageQueue) {
        this.drawCamphorFoliageCloud(ctx, f.x, f.y, f.rx, f.ry, f.seed, true);
      }

      ctx.restore();
      canvasTex.refresh();
    }

    const crownImg = this.scene.add
      .image(0, crownBaseY - 185, texKey)
      .setScale(1 / dpr);
    this.crownContainer.add(crownImg);

    this.sproutBudContainer = this.scene.add.container(
      topNode.centerX,
      crownBaseY - 255
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
   * Recursive Fractal Camphor Branch Generator:
   * Camphor limbs are famous for their sinuous S-curved undulations (sweeping
   * outward and then curving upward at the tips) and Leonardo da Vinci's
   * area-preserving pipe rule (r_parent^2.15 = r_1^2.15 + r_2^2.15).
   */
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

    // Characteristic Camphor S-curve: dip slightly then curl upwards toward sunlight
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

    // 1. Flat 2D Camphor ash-brown watercolor bark fill (#746455 / #68584a)
    buildSegmentPath();
    ctx.fillStyle = depth >= 3 ? '#756556' : '#665749';
    ctx.fill();

    // 2. Flat 2D cel-shaded underside shadow
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

    // Camphor furrowed bark lines along thicker limbs
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

    // 3. Hand-inked dip-pen outline
    buildSegmentPath();
    ctx.lineWidth = Math.max(2.2, Math.min(4.8, radius * 0.14));
    ctx.strokeStyle = '#241b14';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Lush epiphytic moss and ferns along horizontal Camphor boughs
    if (depth === 4 && Math.abs(Math.cos(angle)) > 0.42) {
      this.drawMossPatch(ctx, ctrl1X, ctrl1Y - radius * 0.68, radius * 0.98, 14);
    }

    // Queue terminal Camphor leaf domes at outer fractal twigs
    if (depth <= 2) {
      foliageQueue.push({
        x: x1,
        y: y1 - 14,
        rx: 84 + depth * 42 + rng() * 28,
        ry: 48 + depth * 22 + rng() * 16,
        seed: Math.floor(rng() * 1000)
      });
    }

    // 4. Recursive Asymmetric Fractal Bifurcation (Leonardo's pipe rule)
    const leonardoExp = 0.46;
    const rDominant = endRadius * Math.pow(splitRatio, leonardoExp);
    const rSecondary = endRadius * Math.pow(1 - splitRatio, leonardoExp);

    const sideSign = rng() > 0.48 ? 1 : -1;
    // Camphor branches curve gently upward toward the canopy dome (-Math.PI/2)
    const upwardPull = ( -Math.PI * 0.5 - angle ) * 0.14;
    const angleDom =
      angle + sideSign * (0.2 + rng() * 0.22) + upwardPull;
    const angleSec =
      angle - sideSign * (0.44 + rng() * 0.32) + upwardPull * 0.6;

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
      topY + (tierIndex % 2 === 0 ? 150 : 88) + (rng() - 0.5) * 22;
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
      topY + (tierIndex % 2 === 0 ? 74 : 162) + (rng() - 0.5) * 22;
    const rightOriginX =
      Phaser.Math.Linear(topCx, botCx, (rightOriginY - topY) / this.tierHeight) +
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

    // Asymmetric secondary lateral Camphor limb
    const extraSide = tierIndex % 2 === 0 ? -1 : 1;
    const extraY = topY + 215;
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
      botCx,
      topCx,
      bottomY,
      topY,
      bottomNode.halfWidth,
      topNode.halfWidth,
      tierIndex,
      rng
    );

    // 4. Foreground sunlit Camphor foliage clouds with bronze-coral spring leaf tips
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

    // 6. Natural Carved Tree Hollows (each unique activity appears strictly ONCE)
    if (tierIndex === 0) {
      const mathDef = UNIQUE_ACTIVITIES[0];
      if (!this.placedActivities.has(mathDef.minigame)) {
        this.placedActivities.add(mathDef.minigame);
        const leftHollowX = botCx - 155;
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
        const centerHollowX = topCx + 45;
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
            ? topCx - 175
            : nextActivity.branchSide === 'right'
              ? topCx + 185
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
   * Draws the characteristic deeply fluted, muscular warm ash-grey-brown bark
   * of an ancient Camphor tree (Cinnamomum camphora) in 2D hand-drawn style.
   */
  private drawCamphorFlutedTrunk(
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

    const leftTopX = topCx - topHalfW * (0.94 + (tierIndex % 2) * 0.12);
    const rightTopX = topCx + topHalfW * (1.06 - (tierIndex % 2) * 0.12);
    const leftBotX = botCx - bottomHalfW * (0.94 + ((tierIndex + 1) % 2) * 0.12);
    const rightBotX = botCx + bottomHalfW * (1.06 - ((tierIndex + 1) % 2) * 0.12);

    const leftMidX1 =
      Phaser.Math.Linear(leftTopX, leftBotX, 0.35) - 32 + (rng() - 0.5) * 28;
    const leftMidX2 =
      Phaser.Math.Linear(leftTopX, leftBotX, 0.72) + 20 + (rng() - 0.5) * 28;
    const rightMidX1 =
      Phaser.Math.Linear(rightTopX, rightBotX, 0.32) + 20 + (rng() - 0.5) * 28;
    const rightMidX2 =
      Phaser.Math.Linear(rightTopX, rightBotX, 0.68) - 28 + (rng() - 0.5) * 28;

    // On Tier 0, draw massive, coiling surface roots typical of ancient Camphor trees
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
      ctx.moveTo(leftTopX, topY);
      ctx.bezierCurveTo(
        leftMidX1,
        topY + this.tierHeight * 0.34,
        leftMidX2,
        topY + this.tierHeight * 0.68,
        includeRoots ? leftBotX - 110 : leftBotX,
        bottomY + 8
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

    // 1. Flat 2D Camphor warm ash-brown base wash (#756556)
    buildTrunkPath();
    ctx.fillStyle = '#756556';
    ctx.fill();

    // 2. Clip inside the trunk for 2D cel-shaded watercolor zones & fluted camphor bark plates
    ctx.save();
    buildTrunkPath();
    ctx.clip();

    // Left-center sunlit warm taupe-ochre wash (#877665)
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

    // Right cel-shaded shadow band (#56493e)
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

    // Camphor rough vertical-interlocking bark plates
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

    // 3. Deeply furrowed Y-forking Camphor bark fissures
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

    // Gnarled Camphor trunk burls / knots
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

    // 4. Bold hand-inked dip-pen outer contour
    buildTrunkPath();
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = '#241b14';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 5. Lush mossy cushions on the Camphor trunk and roots
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
      // Glossy oval-pointed Camphor/ivy leaf with 3 characteristic basal veins
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
        spineX + Math.sin(t * Math.PI * 1.3 + tierIndex) * (trunkHalfW * 0.45) * dir;

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

  /**
   * Draws a billowing, rounded cumulus-like Camphor tree (Cinnamomum camphora)
   * foliage dome:
   * - Glossy bright spring yellow-green / chartreuse-emerald leaf layers
   * - Characteristic bronze-coral / warm reddish-amber new leaf flush tips
   * - Small dark blue-black camphor berries nestled in the leaf clusters
   */
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
      // Signature Cinnamomum camphora bronze-coral / warm reddish-amber new leaf flush tips
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

      // Small cluster of dark blue-black camphor berries
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

    // Hand-inked internal leaf cluster contour arcs
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
