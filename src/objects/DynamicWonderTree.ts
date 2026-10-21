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
 * DynamicWonderTree — Explicit, procedurally rendered hand-drawn storybook tree
 * element. Uses high-resolution HTML5 Canvas 2D Bezier illustration (gouache
 * gradients, organic sepia ink linework, bark striations, mossy patches,
 * carved wooden steps, and layered leaf clusters) and supports growing new
 * branch tiers upwards dynamically at runtime.
 */
export class DynamicWonderTree {
  private scene: Phaser.Scene;
  private rootContainer: Phaser.GameObjects.Container;
  private crownContainer: Phaser.GameObjects.Container;
  private sproutBudContainer!: Phaser.GameObjects.Container;
  private tiers: TierVisual[] = [];
  private allAnchors: TreeHollowAnchor[] = [];
  private readonly tierHeight = 250;
  private readonly baseTrunkHalfWidth = 155;
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

  /**
   * Returns the total logical height of the tree (in 1x coordinates) from base to crown.
   */
  public getTotalLogicalHeight(): number {
    return this.tiers.length * this.tierHeight + 220;
  }

  /**
   * Dynamically grows a new branch tier upwards, generating new hand-drawn
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
    // Gentle taper that keeps the trunk colossal even high in the canopy
    return Math.max(82, this.baseTrunkHalfWidth - tierIndex * 16);
  }

  private appendTier(tierIndex: number, animate: boolean): TreeHollowAnchor[] {
    const texKey = `wonder_tree_tier_${tierIndex}_${Date.now()}`;
    const canvasW = 1040;
    const canvasH = 380;
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
      .image(0, -canvasH / 2 + 50, texKey)
      .setScale(1 / dpr)
      .setOrigin(0.5, 0.5);

    tierContainer.add(img);
    // Lower tiers stay in front of upper tiers at the seam
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

    // Convert tier-local anchor Y into tree-root-relative Y
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
   * Renders the lush uppermost canopy crown and the interactive "Grow New Branch"
   * golden bud at the top of the tree.
   */
  private rebuildCrownAndSproutBud(animate = false): void {
    this.crownContainer.removeAll(true);

    const topTierIdx = this.tiers.length;
    const crownBaseY = -topTierIdx * this.tierHeight + 10;
    const topHalfW = this.getTrunkHalfWidthAtTier(topTierIdx);

    const texKey = `wonder_tree_crown_${topTierIdx}_${Date.now()}`;
    const canvasW = 1040;
    const canvasH = 300;
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
      const cy = canvasH - 45;

      // Upper boughs fanning into the crown
      this.drawHandDrawnBranch(ctx, cx - topHalfW * 0.5, cy, cx - 260, cy - 110, 44, 18, -1);
      this.drawHandDrawnBranch(ctx, cx + topHalfW * 0.5, cy, cx + 260, cy - 110, 44, 18, 1);
      this.drawHandDrawnBranch(ctx, cx, cy, cx, cy - 145, 52, 22, 0);

      // Lush overlapping storybook foliage clusters
      this.drawFoliageCluster(ctx, cx - 250, cy - 115, 130, 82, 11 + topTierIdx);
      this.drawFoliageCluster(ctx, cx + 250, cy - 115, 130, 82, 23 + topTierIdx);
      this.drawFoliageCluster(ctx, cx - 115, cy - 145, 155, 95, 37 + topTierIdx);
      this.drawFoliageCluster(ctx, cx + 115, cy - 145, 155, 95, 51 + topTierIdx);
      this.drawFoliageCluster(ctx, cx, cy - 170, 175, 105, 73 + topTierIdx);

      ctx.restore();
      canvasTex.refresh();
    }

    const crownImg = this.scene.add
      .image(0, crownBaseY - 105, texKey)
      .setScale(1 / dpr);
    this.crownContainer.add(crownImg);

    // Interactive "Sprout New Branches" bud nestled in the upper crown
    this.sproutBudContainer = this.scene.add.container(0, crownBaseY - 155);

    const budGlow = this.scene.add.circle(0, 0, 32, 0xffe66d, 0.28);
    const budCircle = this.scene.add
      .circle(0, 0, 22, 0x1b4332, 0.92)
      .setStrokeStyle(2.5, 0xffd166)
      .setInteractive({ useHandCursor: true });

    const budIcon = this.scene.add
      .text(0, 0, '🌱', { fontSize: '20px' })
      .setOrigin(0.5);

    const budLabel = this.scene.add
      .text(0, -34, '✨ Grow New Branch', {
        fontSize: '12px',
        color: '#fff3b0',
        fontStyle: 'bold',
        backgroundColor: '#162418dd',
        padding: { x: 8, y: 3 }
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
   * Hand-draws a single tier of the colossal Wonder Tree onto a 2D canvas context:
   * - Tier 0: Colossal buttress roots, lower-left root hollow, central trunk hollow,
   *   carved wooden steps, mossy patches, and lower foliage boughs.
   * - Tier >= 1: Seamless colossal trunk extension, sweeping left/right branches with
   *   hand-drawn foliage clusters, rope-bridge steps, and branch/trunk tree hollows.
   */
  private drawHandDrawnTier(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tierIndex: number,
    outAnchors: TreeHollowAnchor[]
  ): void {
    const cx = w / 2;
    const bottomY = h - 50;
    const topY = bottomY - this.tierHeight;

    const bottomHalfW = this.getTrunkHalfWidthAtTier(tierIndex);
    const topHalfW = this.getTrunkHalfWidthAtTier(tierIndex + 1);

    // 1. Background boughs & deep canopy leaves behind the trunk
    const isEven = tierIndex % 2 === 0;
    const leftBranchEndX = cx - (isEven ? 310 : 340);
    const leftBranchEndY = topY + (isEven ? 95 : 70);
    const rightBranchEndX = cx + (isEven ? 335 : 300);
    const rightBranchEndY = topY + (isEven ? 65 : 95);

    this.drawFoliageCluster(
      ctx,
      leftBranchEndX - 25,
      leftBranchEndY - 35,
      145,
      88,
      tierIndex * 17 + 3
    );
    this.drawFoliageCluster(
      ctx,
      rightBranchEndX + 25,
      rightBranchEndY - 35,
      145,
      88,
      tierIndex * 19 + 7
    );

    // 2. Primary sweeping left & right branches
    this.drawHandDrawnBranch(
      ctx,
      cx - topHalfW * 0.72,
      topY + 85,
      leftBranchEndX,
      leftBranchEndY,
      58,
      24,
      -1
    );
    this.drawHandDrawnBranch(
      ctx,
      cx + topHalfW * 0.72,
      topY + 75,
      rightBranchEndX,
      rightBranchEndY,
      58,
      24,
      1
    );

    // 3. Main colossal trunk body (and sprawling mossy roots on Tier 0)
    this.drawTrunkBody(
      ctx,
      cx,
      bottomY,
      topY,
      bottomHalfW,
      topHalfW,
      tierIndex === 0
    );

    // 4. Foreground leaf clusters overlapping branch tips
    this.drawFoliageCluster(
      ctx,
      leftBranchEndX - 10,
      leftBranchEndY - 52,
      115,
      70,
      tierIndex * 29 + 11
    );
    this.drawFoliageCluster(
      ctx,
      rightBranchEndX + 10,
      rightBranchEndY - 52,
      115,
      70,
      tierIndex * 31 + 13
    );

    // 5. Winding wooden steps & rope bridges connecting the hollows
    this.drawWoodenStairway(ctx, cx, bottomY, topY, tierIndex);

    // 6. Carved Tree Hollows (natural holes in the bark where portals live)
    if (tierIndex === 0) {
      // Lower-left root burrow hollow (Acorn Scale)
      const leftHollowX = cx - 92;
      const leftHollowY = bottomY - 58;
      this.drawNaturalTreeHollow(ctx, leftHollowX, leftHollowY, 44, 52, '#ffd166');
      outAnchors.push({
        id: 'portal_math',
        tierIndex: 0,
        minigame: 'Acorn Scale',
        localX: leftHollowX - cx,
        localY: leftHollowY - bottomY,
        branchSide: 'left'
      });

      // Central trunk heartwood hollow (The Clockwork Tower / Cave Echoes)
      const centerHollowX = cx + 18;
      const centerHollowY = topY + 78;
      this.drawNaturalTreeHollow(ctx, centerHollowX, centerHollowY, 44, 52, '#90e0ef');
      outAnchors.push({
        id: 'portal_hub',
        tierIndex: 0,
        minigame: 'The Clockwork Tower',
        localX: centerHollowX - cx,
        localY: centerHollowY - bottomY,
        branchSide: 'center'
      });
    } else if (tierIndex === 1) {
      // Tier 1 upper-right bough hollow (Rhythm in the Branches)
      const rightHollowX = cx + 125;
      const rightHollowY = topY + 88;
      this.drawNaturalTreeHollow(ctx, rightHollowX, rightHollowY, 44, 50, '#80ed99');
      outAnchors.push({
        id: 'portal_music',
        tierIndex: 1,
        minigame: 'Rhythm in the Branches',
        localX: rightHollowX - cx,
        localY: rightHollowY - bottomY,
        branchSide: 'right'
      });
    } else {
      // Dynamically grown upper tiers (Tier 2, 3, 4...): alternate left/right/center branch hollows
      const sideIdx = tierIndex % 3;
      const mgName =
        MINIGAME_ROTATION[(tierIndex - 1) % MINIGAME_ROTATION.length];
      const offsetX = sideIdx === 0 ? -105 : sideIdx === 1 ? 105 : 0;
      const hollowX = cx + offsetX;
      const hollowY = topY + 92;
      const glowHex =
        sideIdx === 0 ? '#ffd166' : sideIdx === 1 ? '#80ed99' : '#90e0ef';

      this.drawNaturalTreeHollow(ctx, hollowX, hollowY, 42, 48, glowHex);
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

  private drawTrunkBody(
    ctx: CanvasRenderingContext2D,
    cx: number,
    bottomY: number,
    topY: number,
    bottomHalfW: number,
    topHalfW: number,
    includeRoots: boolean
  ): void {
    ctx.save();

    // Warm hand-painted gouache wood gradient
    const trunkGrad = ctx.createLinearGradient(
      cx - bottomHalfW,
      topY,
      cx + bottomHalfW,
      bottomY
    );
    trunkGrad.addColorStop(0, '#3d2514');
    trunkGrad.addColorStop(0.28, '#5c3a21');
    trunkGrad.addColorStop(0.55, '#6e472b');
    trunkGrad.addColorStop(0.82, '#4a2e19');
    trunkGrad.addColorStop(1, '#2f1c0e');

    ctx.beginPath();
    if (includeRoots) {
      // Wide sprawling mossy roots at the base of the colossal tree
      ctx.moveTo(cx - topHalfW, topY);
      ctx.bezierCurveTo(
        cx - topHalfW * 0.95,
        topY + 95,
        cx - bottomHalfW * 1.15,
        bottomY - 65,
        cx - bottomHalfW * 1.85,
        bottomY + 28
      );
      // Scalloped root toes across the forest floor
      ctx.quadraticCurveTo(
        cx - bottomHalfW * 1.2,
        bottomY + 42,
        cx - bottomHalfW * 0.75,
        bottomY + 26
      );
      ctx.quadraticCurveTo(
        cx - bottomHalfW * 0.25,
        bottomY + 45,
        cx + bottomHalfW * 0.2,
        bottomY + 30
      );
      ctx.quadraticCurveTo(
        cx + bottomHalfW * 0.85,
        bottomY + 44,
        cx + bottomHalfW * 1.85,
        bottomY + 26
      );
      ctx.bezierCurveTo(
        cx + bottomHalfW * 1.15,
        bottomY - 65,
        cx + topHalfW * 0.95,
        topY + 95,
        cx + topHalfW,
        topY
      );
    } else {
      // Seamless upper trunk segment with slight organic curve
      ctx.moveTo(cx - topHalfW, topY);
      ctx.bezierCurveTo(
        cx - topHalfW * 0.92,
        topY + 85,
        cx - bottomHalfW * 0.95,
        bottomY - 85,
        cx - bottomHalfW,
        bottomY + 4
      );
      ctx.lineTo(cx + bottomHalfW, bottomY + 4);
      ctx.bezierCurveTo(
        cx + bottomHalfW * 0.95,
        bottomY - 85,
        cx + topHalfW * 0.92,
        topY + 85,
        cx + topHalfW,
        topY
      );
    }
    ctx.closePath();

    ctx.fillStyle = trunkGrad;
    ctx.fill();

    // Hand-inked outer contour line
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#1f1209';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Flowing hand-drawn bark grain lines
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(31, 18, 9, 0.55)';
    const ribCount = 9;
    for (let i = -ribCount; i <= ribCount; i++) {
      const ratio = i / (ribCount + 1);
      const sx = cx + ratio * topHalfW * 0.88;
      const ex =
        cx + ratio * bottomHalfW * (includeRoots ? 1.35 : 0.92);
      const midX = (sx + ex) * 0.5 + Math.sin(i * 1.7) * 12;
      const midY = (topY + bottomY) * 0.5;

      ctx.beginPath();
      ctx.moveTo(sx, topY + 6);
      ctx.quadraticCurveTo(midX, midY, ex, bottomY - 4);
      ctx.stroke();
    }

    // Lush Cushion Moss patches along the bark edges and roots
    this.drawMossPatch(ctx, cx - topHalfW * 0.82, topY + 55, 34, 18);
    this.drawMossPatch(ctx, cx + topHalfW * 0.78, topY + 110, 38, 19);
    if (includeRoots) {
      this.drawMossPatch(ctx, cx - bottomHalfW * 1.25, bottomY + 10, 56, 20);
      this.drawMossPatch(ctx, cx + bottomHalfW * 1.15, bottomY + 12, 52, 18);
      this.drawMossPatch(ctx, cx - 20, bottomY + 22, 48, 16);
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
    dir: number
  ): void {
    ctx.save();
    const ctrlX = (startX + endX) * 0.5 + dir * 25;
    const ctrlY = Math.min(startY, endY) + 18;

    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, '#4a2e19');
    grad.addColorStop(0.6, '#633f24');
    grad.addColorStop(1, '#3d2514');

    ctx.beginPath();
    ctx.moveTo(startX, startY - startThick * 0.5);
    ctx.quadraticCurveTo(ctrlX, ctrlY - startThick * 0.35, endX, endY - endThick * 0.5);
    ctx.lineTo(endX, endY + endThick * 0.5);
    ctx.quadraticCurveTo(ctrlX, ctrlY + startThick * 0.45, startX, startY + startThick * 0.5);
    ctx.closePath();

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1f1209';
    ctx.stroke();

    // Moss along the top ridge of the branch
    this.drawMossPatch(
      ctx,
      (startX + endX) * 0.5,
      ctrlY - startThick * 0.25,
      44,
      14
    );

    // Warm hanging lantern suspended from the branch
    if (dir !== 0) {
      const lx = startX + (endX - startX) * 0.58;
      const ly = startY + (endY - startY) * 0.58 + 14;
      ctx.beginPath();
      ctx.moveTo(lx, ly - 10);
      ctx.lineTo(lx, ly + 12);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2b1a0e';
      ctx.stroke();

      const lanternGlow = ctx.createRadialGradient(lx, ly + 18, 2, lx, ly + 18, 24);
      lanternGlow.addColorStop(0, 'rgba(255, 243, 176, 0.95)');
      lanternGlow.addColorStop(0.45, 'rgba(255, 209, 102, 0.55)');
      lanternGlow.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = lanternGlow;
      ctx.beginPath();
      ctx.arc(lx, ly + 18, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#2b1a0e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, ly + 18, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draws a natural arched hole carved directly into the bark of the tree,
   * with a mossy wooden brow, recessed shadow, warm inner sanctuary glow,
   * and a small wooden threshold step.
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

    // Outer carved bark arch frame
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 11, ry + 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2b190d';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#180d06';
    ctx.stroke();

    // Deep recessed hollow interior with warm magical light
    const innerGrad = ctx.createRadialGradient(x, y + 6, 4, x, y, Math.max(rx, ry));
    innerGrad.addColorStop(0, '#fff3b0');
    innerGrad.addColorStop(0.45, glowHex);
    innerGrad.addColorStop(0.82, '#2d1a0c');
    innerGrad.addColorStop(1, '#120a04');

    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a0f07';
    ctx.stroke();

    // Mossy cap above the tree hole arch
    this.drawMossPatch(ctx, x, y - ry - 4, rx * 0.85, 13);

    // Rustic wooden threshold ledge at the bottom of the hole
    ctx.fillStyle = '#5c3a21';
    ctx.strokeStyle = '#1f1209';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - rx * 0.85, y + ry - 8, rx * 1.7, 14, 5);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws curving storybook wooden steps and rope railings winding up the trunk.
   */
  private drawWoodenStairway(
    ctx: CanvasRenderingContext2D,
    cx: number,
    bottomY: number,
    topY: number,
    tierIndex: number
  ): void {
    ctx.save();
    const steps = 7;
    const dir = tierIndex % 2 === 0 ? 1 : -1;

    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const sy = bottomY - t * (bottomY - topY);
      const sx = cx + Math.sin(t * Math.PI * 1.2) * 65 * dir;

      ctx.fillStyle = '#7f5539';
      ctx.strokeStyle = '#221409';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(sx - 24, sy - 4, 48, 9, 4);
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
    const grad = ctx.createLinearGradient(x, y - ry, x, y + ry);
    grad.addColorStop(0, '#95d5b2');
    grad.addColorStop(0.55, '#52b788');
    grad.addColorStop(1, '#2d6a4f');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Hand-draws a lush, multi-layered gouache leaf cluster with scalloped silhouettes.
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
      { scale: 1.0, fill: '#1b4332', stroke: '#081c15', yOff: 8 },
      { scale: 0.88, fill: '#2d6a4f', stroke: '#1b4332', yOff: 0 },
      { scale: 0.72, fill: '#52b788', stroke: '#2d6a4f', yOff: -8 },
      { scale: 0.48, fill: '#95d5b2', stroke: '#40916c', yOff: -16 }
    ];

    for (const layer of layers) {
      ctx.beginPath();
      const lobes = 12;
      for (let i = 0; i < lobes; i++) {
        const a0 = (i / lobes) * Math.PI * 2;
        const aMid = ((i + 0.5) / lobes) * Math.PI * 2;
        const a1 = ((i + 1) / lobes) * Math.PI * 2;
        const wobble = 1 + 0.14 * Math.sin(seed + i * 2.3);

        const x0 = cx + Math.cos(a0) * rx * layer.scale;
        const y0 = cy + layer.yOff + Math.sin(a0) * ry * layer.scale;
        const xm = cx + Math.cos(aMid) * rx * layer.scale * 1.18 * wobble;
        const ym =
          cy + layer.yOff + Math.sin(aMid) * ry * layer.scale * 1.18 * wobble;
        const x1 = cx + Math.cos(a1) * rx * layer.scale;
        const y1 = cy + layer.yOff + Math.sin(a1) * ry * layer.scale;

        if (i === 0) ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(xm, ym, x1, y1);
      }
      ctx.closePath();
      ctx.fillStyle = layer.fill;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = layer.stroke;
      ctx.stroke();
    }

    ctx.restore();
  }
}
