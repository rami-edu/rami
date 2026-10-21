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

const MINIGAME_ROTATION = [
  'Acorn Scale',
  'The Clockwork Tower',
  'Rhythm in the Branches'
];

/**
 * DynamicWonderTree — Explicit, procedurally rendered 2D hand-drawn storybook
 * Wonder Tree. Uses flat cel/watercolor washes, sketchy dip-pen ink linework,
 * gnarled bark plates, wood knots, pen cross-hatching, climbing ivy vines, and
 * scalloped ink-and-wash leaf clusters (zero 3D cylindrical shading).
 * Supports growing new wide branch tiers upwards dynamically at runtime.
 */
export class DynamicWonderTree {
  private scene: Phaser.Scene;
  private rootContainer: Phaser.GameObjects.Container;
  private crownContainer: Phaser.GameObjects.Container;
  private sproutBudContainer!: Phaser.GameObjects.Container;
  private tiers: TierVisual[] = [];
  private allAnchors: TreeHollowAnchor[] = [];
  private readonly tierHeight = 320;
  private readonly baseTrunkHalfWidth = 285;
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

    for (let t = 0; t < initialTiers; t++) {
      this.appendTier(t, false);
    }

    this.rebuildCrownAndSproutBud();
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
    return this.tiers.length * this.tierHeight + 290;
  }

  /**
   * Dynamically grows a new wide branch tier upwards, generating new hand-drawn
   * branches, foliage, wooden steps, and an activity portal hollow inside the new branch.
   */
  public growUpwards(animate = true): TreeHollowAnchor[] {
    const nextTierIndex = this.tiers.length;
    const created = this.appendTier(nextTierIndex, animate);
    this.rebuildCrownAndSproutBud(animate);
    if (this.onTreeGrew) {
      this.onTreeGrew(this.tiers.length);
    }
    return created;
  }

  private getTrunkHalfWidthAtTier(tierIndex: number): number {
    // Keep the trunk monumental and wide as it rises
    return Math.max(175, this.baseTrunkHalfWidth - tierIndex * 22);
  }

  private appendTier(tierIndex: number, animate: boolean): TreeHollowAnchor[] {
    const texKey = `wonder_tree_tier_${tierIndex}_${Date.now()}`;
    const canvasW = 1520;
    const canvasH = 480;
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
      this.drawHandDrawnTier(ctx, canvasW, canvasH, tierIndex, createdAnchors);
      ctx.restore();
      canvasTex.refresh();
    }

    const tierContainer = this.scene.add.container(0, tierBottomY);
    const img = this.scene.add
      .image(0, -canvasH / 2 + 65, texKey)
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
   * Renders the wide, lush hand-drawn uppermost canopy crown and the interactive
   * "Grow New Branch" golden bud at the top of the tree.
   */
  private rebuildCrownAndSproutBud(animate = false): void {
    this.crownContainer.removeAll(true);

    const topTierIdx = this.tiers.length;
    const crownBaseY = -topTierIdx * this.tierHeight + 12;
    const topHalfW = this.getTrunkHalfWidthAtTier(topTierIdx);

    const texKey = `wonder_tree_crown_${topTierIdx}_${Date.now()}`;
    const canvasW = 1520;
    const canvasH = 380;
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
      const cx = canvasW / 2;
      const cy = canvasH - 55;

      // Wide hand-inked crown boughs spreading far left and right
      this.drawHandDrawnBranch(ctx, cx - topHalfW * 0.65, cy, cx - 440, cy - 135, 76, 28, -1, topTierIdx + 1);
      this.drawHandDrawnBranch(ctx, cx + topHalfW * 0.65, cy, cx + 440, cy - 135, 76, 28, 1, topTierIdx + 2);
      this.drawHandDrawnBranch(ctx, cx - topHalfW * 0.2, cy, cx - 180, cy - 175, 68, 26, -1, topTierIdx + 3);
      this.drawHandDrawnBranch(ctx, cx + topHalfW * 0.2, cy, cx + 180, cy - 175, 68, 26, 1, topTierIdx + 4);
      this.drawHandDrawnBranch(ctx, cx, cy, cx, cy - 195, 74, 30, 0, topTierIdx + 5);

      // Wide, overlapping storybook ink-and-watercolor leaf canopies
      this.drawFoliageCluster(ctx, cx - 420, cy - 140, 195, 105, 11 + topTierIdx);
      this.drawFoliageCluster(ctx, cx + 420, cy - 140, 195, 105, 23 + topTierIdx);
      this.drawFoliageCluster(ctx, cx - 210, cy - 185, 225, 118, 37 + topTierIdx);
      this.drawFoliageCluster(ctx, cx + 210, cy - 185, 225, 118, 51 + topTierIdx);
      this.drawFoliageCluster(ctx, cx, cy - 210, 260, 128, 73 + topTierIdx);

      ctx.restore();
      canvasTex.refresh();
    }

    const crownImg = this.scene.add
      .image(0, crownBaseY - 135, texKey)
      .setScale(1 / dpr);
    this.crownContainer.add(crownImg);

    this.sproutBudContainer = this.scene.add.container(0, crownBaseY - 205);

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

  private drawHandDrawnTier(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tierIndex: number,
    outAnchors: TreeHollowAnchor[]
  ): void {
    const cx = w / 2;
    const bottomY = h - 65;
    const topY = bottomY - this.tierHeight;

    const bottomHalfW = this.getTrunkHalfWidthAtTier(tierIndex);
    const topHalfW = this.getTrunkHalfWidthAtTier(tierIndex + 1);

    const isEven = tierIndex % 2 === 0;
    const leftBranchEndX = cx - (isEven ? 510 : 545);
    const leftBranchEndY = topY + (isEven ? 115 : 85);
    const rightBranchEndX = cx + (isEven ? 540 : 500);
    const rightBranchEndY = topY + (isEven ? 85 : 115);

    // 1. Background leaf clusters behind the wide branches
    this.drawFoliageCluster(
      ctx,
      leftBranchEndX - 35,
      leftBranchEndY - 45,
      210,
      110,
      tierIndex * 17 + 3
    );
    this.drawFoliageCluster(
      ctx,
      rightBranchEndX + 35,
      rightBranchEndY - 45,
      210,
      110,
      tierIndex * 19 + 7
    );

    // 2. Massive sweeping left & right hand-drawn boughs
    this.drawHandDrawnBranch(
      ctx,
      cx - topHalfW * 0.76,
      topY + 110,
      leftBranchEndX,
      leftBranchEndY,
      86,
      34,
      -1,
      tierIndex * 7 + 1
    );
    this.drawHandDrawnBranch(
      ctx,
      cx + topHalfW * 0.76,
      topY + 95,
      rightBranchEndX,
      rightBranchEndY,
      86,
      34,
      1,
      tierIndex * 7 + 2
    );

    // 3. Flat watercolor/cel-shaded 2D hand-drawn trunk with irregular ink plates, knots, and vines
    this.drawTrunkBody2DHandDrawn(
      ctx,
      cx,
      bottomY,
      topY,
      bottomHalfW,
      topHalfW,
      tierIndex
    );

    // 4. Foreground scalloped ink-and-wash leaf clusters overlapping branch tips
    this.drawFoliageCluster(
      ctx,
      leftBranchEndX + 15,
      leftBranchEndY - 68,
      165,
      90,
      tierIndex * 29 + 11
    );
    this.drawFoliageCluster(
      ctx,
      rightBranchEndX - 15,
      rightBranchEndY - 68,
      165,
      90,
      tierIndex * 31 + 13
    );

    // 5. Hand-drawn wooden steps & rope railings winding across the colossal bark
    this.drawWoodenStairway(ctx, cx, bottomY, topY, bottomHalfW, tierIndex);

    // 6. Natural carved Tree Hollows inside the trunk and thick branch bases
    if (tierIndex === 0) {
      // Lower-left root hollow (Acorn Scale)
      const leftHollowX = cx - 165;
      const leftHollowY = bottomY - 72;
      this.drawNaturalTreeHollow(ctx, leftHollowX, leftHollowY, 52, 62, '#ffd166');
      outAnchors.push({
        id: 'portal_math',
        tierIndex: 0,
        minigame: 'Acorn Scale',
        localX: leftHollowX - cx,
        localY: leftHollowY - bottomY,
        branchSide: 'left'
      });

      // Central trunk hollow (The Clockwork Tower / Cave Echoes)
      const centerHollowX = cx + 38;
      const centerHollowY = topY + 102;
      this.drawNaturalTreeHollow(ctx, centerHollowX, centerHollowY, 52, 62, '#90e0ef');
      outAnchors.push({
        id: 'portal_hub',
        tierIndex: 0,
        minigame: 'The Clockwork Tower',
        localX: centerHollowX - cx,
        localY: centerHollowY - bottomY,
        branchSide: 'center'
      });
    } else if (tierIndex === 1) {
      // Upper-right bough junction hollow (Rhythm in the Branches)
      const rightHollowX = cx + 195;
      const rightHollowY = topY + 112;
      this.drawNaturalTreeHollow(ctx, rightHollowX, rightHollowY, 50, 60, '#80ed99');
      outAnchors.push({
        id: 'portal_music',
        tierIndex: 1,
        minigame: 'Rhythm in the Branches',
        localX: rightHollowX - cx,
        localY: rightHollowY - bottomY,
        branchSide: 'right'
      });
    } else {
      // Dynamically grown upper tiers
      const sideIdx = tierIndex % 3;
      const mgName =
        MINIGAME_ROTATION[(tierIndex - 1) % MINIGAME_ROTATION.length];
      const offsetX = sideIdx === 0 ? -170 : sideIdx === 1 ? 170 : 0;
      const hollowX = cx + offsetX;
      const hollowY = topY + 115;
      const glowHex =
        sideIdx === 0 ? '#ffd166' : sideIdx === 1 ? '#80ed99' : '#90e0ef';

      this.drawNaturalTreeHollow(ctx, hollowX, hollowY, 48, 58, glowHex);
      outAnchors.push({
        id: `portal_dynamic_tier_${tierIndex}`,
        tierIndex,
        minigame: mgName,
        localX: hollowX - cx,
        localY: hollowY - bottomY,
        branchSide: sideIdx === 0 ? 'left' : sideIdx === 1 ? 'right' : 'center'
      });
    }
  }

  /**
   * Draws the trunk using a pure 2D hand-drawn storybook aesthetic:
   * - Flat warm watercolor paper wash (NO 3D cylindrical gradient)
   * - Flat cel-shaded shadow band along the right edge and root crevices
   * - Gnarled, asymmetric dip-pen ink contours (double-pass sketchy ink lines)
   * - Short, broken vertical bark-plate pen strokes, wood knots, and cross-hatching
   * - Hand-drawn climbing ivy vines with individual leaves
   */
  private drawTrunkBody2DHandDrawn(
    ctx: CanvasRenderingContext2D,
    cx: number,
    bottomY: number,
    topY: number,
    bottomHalfW: number,
    topHalfW: number,
    tierIndex: number
  ): void {
    const includeRoots = tierIndex === 0;
    ctx.save();

    const buildTrunkPath = () => {
      ctx.beginPath();
      if (includeRoots) {
        ctx.moveTo(cx - topHalfW, topY);
        // Gnarled left trunk contour flaring into wide storybook roots
        ctx.bezierCurveTo(
          cx - topHalfW - 18,
          topY + 110,
          cx - bottomHalfW * 1.18,
          bottomY - 85,
          cx - bottomHalfW * 1.75,
          bottomY + 34
        );
        // Irregular organic root toes
        ctx.quadraticCurveTo(
          cx - bottomHalfW * 1.25,
          bottomY + 52,
          cx - bottomHalfW * 0.82,
          bottomY + 28
        );
        ctx.quadraticCurveTo(
          cx - bottomHalfW * 0.35,
          bottomY + 56,
          cx + bottomHalfW * 0.15,
          bottomY + 34
        );
        ctx.quadraticCurveTo(
          cx + bottomHalfW * 0.78,
          bottomY + 54,
          cx + bottomHalfW * 1.75,
          bottomY + 32
        );
        // Gnarled right trunk contour
        ctx.bezierCurveTo(
          cx + bottomHalfW * 1.18,
          bottomY - 85,
          cx + topHalfW + 16,
          topY + 110,
          cx + topHalfW,
          topY
        );
      } else {
        const wobbleL = Math.sin(tierIndex * 2.1) * 14;
        const wobbleR = Math.cos(tierIndex * 1.9) * 14;
        ctx.moveTo(cx - topHalfW, topY);
        ctx.bezierCurveTo(
          cx - topHalfW + wobbleL,
          topY + 105,
          cx - bottomHalfW - wobbleL,
          bottomY - 105,
          cx - bottomHalfW,
          bottomY + 6
        );
        ctx.lineTo(cx + bottomHalfW, bottomY + 6);
        ctx.bezierCurveTo(
          cx + bottomHalfW + wobbleR,
          bottomY - 105,
          cx + topHalfW - wobbleR,
          topY + 105,
          cx + topHalfW,
          topY
        );
      }
      ctx.closePath();
    };

    // 1. Flat 2D warm watercolor base fill (NO cylindrical 3D gradient!)
    buildTrunkPath();
    ctx.fillStyle = '#785238';
    ctx.fill();

    // 2. Clip inside the trunk to paint flat 2D cel-shaded storybook washes & bark plates
    ctx.save();
    buildTrunkPath();
    ctx.clip();

    // Left sunlit watercolor wash zone (flat warm ochre-tan)
    ctx.fillStyle = '#8a6245';
    ctx.beginPath();
    ctx.moveTo(cx - topHalfW - 60, topY - 10);
    ctx.lineTo(cx - topHalfW * 0.18, topY - 10);
    ctx.bezierCurveTo(
      cx - bottomHalfW * 0.32,
      (topY + bottomY) * 0.5,
      cx - bottomHalfW * 0.12,
      bottomY - 40,
      cx - bottomHalfW * 0.45,
      bottomY + 60
    );
    ctx.lineTo(cx - bottomHalfW * 2.0, bottomY + 60);
    ctx.closePath();
    ctx.fill();

    // Right cel-shaded shadow band (flat deep umber wash)
    ctx.fillStyle = '#5e3e28';
    ctx.beginPath();
    ctx.moveTo(cx + topHalfW * 0.38, topY - 10);
    ctx.lineTo(cx + topHalfW + 120, topY - 10);
    ctx.lineTo(cx + bottomHalfW * 2.0, bottomY + 60);
    ctx.lineTo(cx + bottomHalfW * 0.42, bottomY + 60);
    ctx.bezierCurveTo(
      cx + bottomHalfW * 0.28,
      bottomY - 70,
      cx + topHalfW * 0.52,
      (topY + bottomY) * 0.45,
      cx + topHalfW * 0.38,
      topY - 10
    );
    ctx.closePath();
    ctx.fill();

    // Flat hand-painted bark plates (irregular rounded rectangles of slightly warmer/cooler washes)
    const plateColors = ['#6b4730', '#825a3e', '#63412b', '#7d563b'];
    for (let p = 0; p < 14; p++) {
      const px =
        cx +
        ((p % 5) - 2) * (topHalfW * 0.38) +
        Math.sin(tierIndex * 5 + p * 3.1) * 22;
      const py =
        topY +
        28 +
        Math.floor(p / 5) * 98 +
        Math.cos(p * 2.7) * 16;
      const pw = 36 + (p % 3) * 18;
      const ph = 64 + (p % 2) * 28;

      ctx.fillStyle = plateColors[(p + tierIndex) % plateColors.length];
      ctx.beginPath();
      ctx.roundRect(px - pw / 2, py - ph / 2, pw, ph, 12);
      ctx.fill();
    }

    // 3. Hand-inked broken bark cracks, wood knots, and pen cross-hatching
    ctx.strokeStyle = '#26160c';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Broken irregular pen-and-ink bark lines (short sketchy segments, NOT 3D mesh wires)
    const crackColumns = 7;
    for (let col = -crackColumns; col <= crackColumns; col++) {
      const baseX = cx + (col / (crackColumns + 0.5)) * topHalfW * 0.92;
      let curY = topY + 12 + ((col * 19) & 15);
      while (curY < bottomY - 25) {
        const segLen = 28 + ((col * 13 + Math.floor(curY)) % 38);
        const nextY = Math.min(bottomY - 8, curY + segLen);
        const driftX = Math.sin(curY * 0.04 + col * 1.3 + tierIndex) * 9;
        const flare =
          includeRoots && curY > bottomY - 90
            ? (col / crackColumns) * 42
            : 0;

        ctx.lineWidth = 2.2 + ((Math.abs(col) + Math.floor(curY)) % 2) * 0.9;
        ctx.beginPath();
        ctx.moveTo(baseX + driftX + flare * 0.4, curY);
        ctx.quadraticCurveTo(
          baseX - driftX * 0.6 + flare * 0.7,
          (curY + nextY) * 0.5,
          baseX + driftX * 0.8 + flare,
          nextY
        );
        ctx.stroke();

        // Occasional tiny horizontal bark notch
        if ((col + Math.floor(curY)) % 5 === 0) {
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(baseX + driftX - 8, nextY - 6);
          ctx.lineTo(baseX + driftX + 10, nextY - 3);
          ctx.stroke();
        }

        curY = nextY + 14 + ((Math.abs(col) * 7) % 18);
      }
    }

    // Hand-drawn swirling wood knots / burls
    this.drawBarkKnot(ctx, cx - topHalfW * 0.42, topY + 165, 20, 28);
    this.drawBarkKnot(ctx, cx + topHalfW * 0.48, topY + 215, 18, 25);

    // Pen cross-hatching along the right shadow edge and root hollows
    this.drawPenCrossHatching(
      ctx,
      cx + topHalfW * 0.68,
      topY + 30,
      bottomY - 20,
      28
    );
    this.drawPenCrossHatching(
      ctx,
      cx - topHalfW * 0.78,
      topY + 45,
      bottomY - 30,
      18
    );

    // Hand-drawn climbing ivy vines with individual ink-and-wash leaves
    this.drawIvyVine(
      ctx,
      cx - topHalfW * 0.55,
      topY + 10,
      cx - bottomHalfW * 0.25,
      bottomY - 15,
      tierIndex + 1
    );
    this.drawIvyVine(
      ctx,
      cx + topHalfW * 0.52,
      topY + 15,
      cx + bottomHalfW * 0.35,
      bottomY - 20,
      tierIndex + 4
    );

    ctx.restore(); // end clip

    // 4. Double-pass hand-inked outer contour line for authentic dip-pen look
    buildTrunkPath();
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = '#23140b';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Root division ink lines overlapping the trunk base on Tier 0
    if (includeRoots) {
      this.drawRootFoldInkLine(
        ctx,
        cx - bottomHalfW * 0.55,
        bottomY - 115,
        cx - bottomHalfW * 0.82,
        bottomY + 28
      );
      this.drawRootFoldInkLine(
        ctx,
        cx + bottomHalfW * 0.05,
        bottomY - 95,
        cx + bottomHalfW * 0.15,
        bottomY + 34
      );
      this.drawRootFoldInkLine(
        ctx,
        cx + bottomHalfW * 0.58,
        bottomY - 110,
        cx + bottomHalfW * 0.88,
        bottomY + 28
      );
    }

    // 5. Lush hand-drawn moss cushions along the bark and roots
    this.drawMossPatch(ctx, cx - topHalfW * 0.84, topY + 62, 48, 22);
    this.drawMossPatch(ctx, cx + topHalfW * 0.8, topY + 125, 52, 22);
    if (includeRoots) {
      this.drawMossPatch(ctx, cx - bottomHalfW * 1.28, bottomY + 16, 78, 24);
      this.drawMossPatch(ctx, cx + bottomHalfW * 1.18, bottomY + 18, 74, 22);
      this.drawMossPatch(ctx, cx - 25, bottomY + 28, 66, 20);
    }

    ctx.restore();
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
    ctx.ellipse(x, y, rx, ry, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.58, ry * 0.58, 0.12, 0.4, Math.PI * 1.85);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.25, ry * 0.25, 0.12, 0, Math.PI * 1.6);
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

  private drawRootFoldInkLine(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): void {
    ctx.save();
    ctx.strokeStyle = '#23140b';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) * 0.5 - 14, (y0 + y1) * 0.5, x1, y1);
    ctx.stroke();
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
    const ctrlX = (x0 + x1) * 0.5 + Math.sin(seed) * 45;
    const ctrlY = (y0 + y1) * 0.5;

    ctx.strokeStyle = '#2d5a27';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(ctrlX, ctrlY, x1, y1);
    ctx.stroke();

    // Individual hand-inked ivy leaves along the vine
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

  private drawHandDrawnBranch(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    startThick: number,
    endThick: number,
    dir: number,
    seed: number
  ): void {
    ctx.save();
    const ctrlX = (startX + endX) * 0.5 + dir * 35;
    const ctrlY = Math.min(startY, endY) + 24;

    const buildBranchPath = () => {
      ctx.beginPath();
      ctx.moveTo(startX, startY - startThick * 0.5);
      ctx.quadraticCurveTo(
        ctrlX,
        ctrlY - startThick * 0.35,
        endX,
        endY - endThick * 0.5
      );
      ctx.lineTo(endX, endY + endThick * 0.5);
      ctx.quadraticCurveTo(
        ctrlX,
        ctrlY + startThick * 0.48,
        startX,
        startY + startThick * 0.5
      );
      ctx.closePath();
    };

    // Flat 2D warm bark fill
    buildBranchPath();
    ctx.fillStyle = '#785238';
    ctx.fill();

    // Flat cel-shaded underside shadow along the lower half of the branch
    ctx.save();
    buildBranchPath();
    ctx.clip();

    ctx.fillStyle = '#5a3b26';
    ctx.beginPath();
    ctx.moveTo(startX, startY + 2);
    ctx.quadraticCurveTo(ctrlX, ctrlY + 6, endX, endY);
    ctx.lineTo(endX, endY + endThick);
    ctx.lineTo(startX, startY + startThick);
    ctx.closePath();
    ctx.fill();

    // Hand-drawn ink grain lines along the branch
    ctx.strokeStyle = '#26160c';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let g = -1; g <= 1; g++) {
      const offY = g * (startThick * 0.18);
      ctx.beginPath();
      ctx.moveTo(startX + dir * 18, startY + offY);
      ctx.quadraticCurveTo(
        ctrlX,
        ctrlY + offY * 0.7,
        endX - dir * 24,
        endY + offY * 0.4
      );
      ctx.stroke();
    }
    ctx.restore();

    // Bold hand-inked branch outline
    buildBranchPath();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#23140b';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Smaller forked sub-branch twig for natural hand-drawn silhouette
    if (dir !== 0) {
      const forkX = startX + (endX - startX) * 0.55;
      const forkY = startY + (endY - startY) * 0.55 - 8;
      ctx.fillStyle = '#785238';
      ctx.strokeStyle = '#23140b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(forkX - dir * 12, forkY);
      ctx.quadraticCurveTo(
        forkX + dir * 28,
        forkY - 38,
        forkX + dir * 68,
        forkY - 58
      );
      ctx.lineTo(forkX + dir * 72, forkY - 46);
      ctx.quadraticCurveTo(
        forkX + dir * 32,
        forkY - 24,
        forkX + dir * 12,
        forkY + 6
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Moss along the top ridge of the branch
    this.drawMossPatch(
      ctx,
      (startX + endX) * 0.48,
      ctrlY - startThick * 0.28,
      58,
      16
    );

    // Warm hanging storybook lantern suspended from the branch
    if (dir !== 0 && seed > 0) {
      const lx = startX + (endX - startX) * 0.62;
      const ly = startY + (endY - startY) * 0.62 + 18;
      ctx.beginPath();
      ctx.moveTo(lx, ly - 12);
      ctx.lineTo(lx, ly + 14);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#23140b';
      ctx.stroke();

      const lanternGlow = ctx.createRadialGradient(
        lx,
        ly + 22,
        3,
        lx,
        ly + 22,
        28
      );
      lanternGlow.addColorStop(0, 'rgba(255, 243, 176, 0.95)');
      lanternGlow.addColorStop(0.5, 'rgba(255, 209, 102, 0.5)');
      lanternGlow.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = lanternGlow;
      ctx.beginPath();
      ctx.arc(lx, ly + 22, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#23140b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(lx - 8, ly + 13, 16, 18, 4);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draws a natural arched hole carved directly into the bark of the tree,
   * with a hand-inked wooden rim, mossy brow, warm inner sanctuary glow,
   * and a carved wooden threshold step.
   */
  private drawNaturalTreeHollow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rx: number,
    ry: number,
    glowHex: string
  ): void {
    ctx.save();

    // Outer hand-inked bark collar around the tree hole
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 14, ry + 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4f331f';
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#23140b';
    ctx.stroke();

    // Radial bark collar lines around the rim
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (rx + 2), y + Math.sin(a) * (ry + 2));
      ctx.lineTo(x + Math.cos(a) * (rx + 12), y + Math.sin(a) * (ry + 12));
      ctx.stroke();
    }

    // Deep recessed hollow interior with warm magical light
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
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1a0f07';
    ctx.stroke();

    // Mossy cap above the tree hole arch
    this.drawMossPatch(ctx, x, y - ry - 6, rx * 0.9, 15);

    // Rustic wooden threshold ledge at the bottom of the hole
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
    cx: number,
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
      const sx =
        cx + Math.sin(t * Math.PI * 1.25) * (trunkHalfW * 0.48) * dir;

      // Flat cel-shaded wooden plank step with hand-inked outline
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

    // Scalloped 2D cel-shaded moss cushion instead of smooth ellipse gradient
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

    // Inner bright highlight tuft
    ctx.fillStyle = '#95d5b2';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.15, y - ry * 0.2, rx * 0.55, ry * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Hand-draws a lush, multi-layered 2D ink-and-watercolor leaf canopy with
   * scalloped silhouettes and individual hand-inked leaf veins.
   */
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
      { scale: 0.88, fill: '#367a53', stroke: '#1b4332', yOff: 0 },
      { scale: 0.72, fill: '#52b788', stroke: '#24553a', yOff: -10 },
      { scale: 0.5, fill: '#95d5b2', stroke: '#2d6a4f', yOff: -20 }
    ];

    for (const layer of layers) {
      ctx.beginPath();
      const lobes = 14;
      for (let i = 0; i < lobes; i++) {
        const a0 = (i / lobes) * Math.PI * 2;
        const aMid = ((i + 0.5) / lobes) * Math.PI * 2;
        const a1 = ((i + 1) / lobes) * Math.PI * 2;
        const wobble = 1 + 0.15 * Math.sin(seed + i * 2.3);

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
      ctx.lineWidth = 3;
      ctx.strokeStyle = layer.stroke;
      ctx.stroke();
    }

    // Subtle hand-inked leaf cluster detail arcs inside the canopy
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let k = -2; k <= 2; k++) {
      const lx = cx + k * (rx * 0.26);
      const ly = cy - 6 + Math.sin(seed + k) * 14;
      ctx.beginPath();
      ctx.arc(lx, ly, 22, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }

    ctx.restore();
  }
}
