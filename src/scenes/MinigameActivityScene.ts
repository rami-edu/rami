import Phaser from 'phaser';
import type { MinigameModule } from '../managers/MinigameLoader';
import { ActivityThemedBackgroundBuilder } from '../objects/ActivityThemedBackgroundBuilder';

export interface MinigameActivityConfig {
  sceneKey: string;
  module: MinigameModule;
  onExit: () => void;
}

/**
 * Dedicated full-screen Phaser.Scene created dynamically when the player enters
 * a portal and completely destroyed (scene.remove) when the player leaves.
 * Provides a standardized Return Portal button across all activities and plays
 * a reverse-spinning golden/celestial portal vortex transition upon exit.
 */
export class MinigameActivityScene extends Phaser.Scene {
  private bgImage!: Phaser.GameObjects.Image;
  private returnPortalBtn!: Phaser.GameObjects.Container;
  private returnRuneRing!: Phaser.GameObjects.Graphics;
  private activityModule: MinigameModule;
  private onExitCallback: () => void;
  private isLeaving = false;

  constructor(config: MinigameActivityConfig) {
    super({ key: config.sceneKey });
    this.activityModule = config.module;
    this.onExitCallback = config.onExit;
  }

  private getDpr(): number {
    return Math.min(window.devicePixelRatio || 1, 3);
  }

  public preload(): void {
    const { id, backgroundKey, backgroundUrl } = this.activityModule.descriptor;
    ActivityThemedBackgroundBuilder.ensureBackgroundTexture(
      this,
      id,
      backgroundKey
    );
    if (!this.textures.exists(backgroundKey)) {
      this.load.image(backgroundKey, backgroundUrl);
    }
  }

  public create(): void {
    const { width, height } = this.scale;
    const { id, backgroundKey } = this.activityModule.descriptor;
    ActivityThemedBackgroundBuilder.ensureBackgroundTexture(
      this,
      id,
      backgroundKey
    );

    // Full-screen activity-specific storybook background
    this.bgImage = this.add
      .image(width / 2, height / 2, backgroundKey)
      .setDepth(0);

    this.createStandardReturnButton();
    this.layoutScene(width, height);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      if (this.scene.isActive() && this.bgImage?.active) {
        this.layoutScene(gameSize.width, gameSize.height);
      }
    };
    this.scale.on('resize', onResize);

    // Smoothly fade in from the portal swirl transition
    this.cameras.main.fadeIn(350, 11, 22, 14);

    // Hide the top-left player name badge while inside the activity
    const playerBadge = document.getElementById('hud-player-badge');
    if (playerBadge) {
      playerBadge.style.display = 'none';
    }

    const triggerReturn = () => {
      if (this.isLeaving) return;
      this.isLeaving = true;
      this.scale.off('resize', onResize);
      this.playReverseReturnPortalTransition().then(() => {
        // Restore player name badge upon returning to the tree
        const badge = document.getElementById('hud-player-badge');
        if (badge) {
          badge.style.display = 'flex';
        }
        this.onExitCallback();
      });
    };

    // Launch the specific minigame UI inside this dedicated scene
    this.activityModule.launch(this, triggerReturn);
  }

  /**
   * Standardized Return to Wonder Tree button:
   * - No text (zero-reading preschool UX).
   * - Placed on the top-left of the screen.
   * - Has an iconic visual of "going outside a portal": a celestial portal aperture
   *   with an energetic golden exit arrow breaking out toward the outside/left.
   */
  private createStandardReturnButton(): void {
    const dpr = this.getDpr();
    const margin = Math.max(40, 32 * dpr);
    this.returnPortalBtn = this.add
      .container(margin, margin)
      .setScale(dpr * 1.05)
      .setDepth(160);

    // Glowing outer portal aura
    const aura = this.add.circle(0, 0, 32, 0xffd166, 0.22);

    // Rotating celestial portal rune ring
    this.returnRuneRing = this.add.graphics();
    this.returnRuneRing.lineStyle(1.5, 0x48cae4, 0.85);
    this.returnRuneRing.strokeCircle(0, 0, 27);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.returnRuneRing.fillStyle(0x90e0ef, 0.95);
      this.returnRuneRing.fillCircle(
        Math.cos(angle) * 27,
        Math.sin(angle) * 27,
        2
      );
    }

    // Circular button background with golden rim
    const btnBg = this.add
      .circle(0, 0, 25, 0x162418, 0.96)
      .setStrokeStyle(2.5, 0xffd166);

    // Interactive hit zone
    const hitZone = this.add
      .circle(0, 0, 28, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });

    // "Going outside a portal" vector icon
    const iconGraphics = this.add.graphics();

    // 1. Portal aperture ellipse on right
    iconGraphics.lineStyle(2.5, 0x48cae4, 0.95);
    iconGraphics.strokeEllipse(6, 0, 16, 28);
    iconGraphics.fillStyle(0x0a1e17, 0.95);
    iconGraphics.fillEllipse(6, 0, 14, 26);

    // Inner swirling vortex ripples inside the portal
    iconGraphics.lineStyle(1.5, 0x90e0ef, 0.8);
    iconGraphics.beginPath();
    iconGraphics.arc(6, -4, 5, 0, Math.PI, false);
    iconGraphics.strokePath();
    iconGraphics.beginPath();
    iconGraphics.arc(6, 4, 5, Math.PI, 0, false);
    iconGraphics.strokePath();

    // 2. Outward exit arrow emerging from inside the portal toward the outside / left
    iconGraphics.lineStyle(3.5, 0xffd166, 1);
    iconGraphics.beginPath();
    iconGraphics.moveTo(8, 0);   // origin inside portal
    iconGraphics.lineTo(-13, 0); // shoots out to the left
    iconGraphics.strokePath();

    // Bold golden arrowhead pointing left (going outside)
    iconGraphics.fillStyle(0xffd166, 1);
    iconGraphics.beginPath();
    iconGraphics.moveTo(-16, 0);
    iconGraphics.lineTo(-7, -7);
    iconGraphics.lineTo(-7, 7);
    iconGraphics.closePath();
    iconGraphics.fillPath();

    // 3. Dimensional exit ripples / motion waves on the left
    iconGraphics.lineStyle(2, 0x80ed99, 0.85);
    iconGraphics.beginPath();
    iconGraphics.arc(-13, 0, 7, Math.PI * 0.65, Math.PI * 1.35, false);
    iconGraphics.strokePath();

    iconGraphics.lineStyle(1.5, 0x48cae4, 0.55);
    iconGraphics.beginPath();
    iconGraphics.arc(-16, 0, 11, Math.PI * 0.7, Math.PI * 1.3, false);
    iconGraphics.strokePath();

    // Idle animations
    this.tweens.add({
      targets: aura,
      scale: 1.25,
      alpha: 0.38,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: this.returnRuneRing,
      rotation: -Math.PI * 2,
      duration: 9000,
      repeat: -1
    });

    // Hover & click handlers
    hitZone.on('pointerover', () => {
      btnBg.setFillStyle(0x2d6a4f, 0.98);
      btnBg.setStrokeStyle(3, 0xfff3b0);
      this.tweens.add({
        targets: this.returnPortalBtn,
        scale: 1.1,
        duration: 160,
        ease: 'Back.easeOut'
      });
    });

    hitZone.on('pointerout', () => {
      btnBg.setFillStyle(0x162418, 0.96);
      btnBg.setStrokeStyle(2.5, 0xffd166);
      this.tweens.add({
        targets: this.returnPortalBtn,
        scale: 1.0,
        duration: 160,
        ease: 'Cubic.easeOut'
      });
    });

    hitZone.on('pointerdown', () => {
      if (this.isLeaving) return;
      this.isLeaving = true;
      this.playReverseReturnPortalTransition().then(() => {
        this.onExitCallback();
      });
    });

    this.returnPortalBtn.add([
      aura,
      this.returnRuneRing,
      btnBg,
      iconGraphics,
      hitZone
    ]);
  }

  /**
   * Plays the portal vortex animation in reverse direction with a distinct
   * golden-amber & celestial-cyan color palette when returning to the main screen.
   */
  private playReverseReturnPortalTransition(): Promise<void> {
    return new Promise((resolve) => {
      const { width, height } = this.scale;
      const dpr = this.getDpr();
      const maxDim = Math.hypot(width, height);
      const originX = this.returnPortalBtn?.x ?? width / 2;
      const originY = this.returnPortalBtn?.y ?? height / 2;

      const swirlContainer = this.add
        .container(originX, originY)
        .setDepth(200);

      const veil = this.add
        .circle(0, 0, maxDim, 0x161124, 0)
        .setOrigin(0.5);
      swirlContainer.add(veil);

      this.tweens.add({
        targets: veil,
        fillAlpha: 0.96,
        duration: 800,
        ease: 'Sine.easeInOut'
      });

      const vortexArms = this.add.graphics();
      // Distinct golden-amber and celestial-aqua return portal colors
      const returnColors = [0xffd166, 0x48cae4, 0xf4a261, 0x90e0ef, 0xffe66d];
      for (let arm = 0; arm < 6; arm++) {
        const baseAngle = (arm / 6) * Math.PI * 2;
        const color = returnColors[arm % returnColors.length];
        vortexArms.lineStyle(5 * dpr, color, 0.9);
        vortexArms.beginPath();
        for (let step = 0; step <= 45; step++) {
          const t = step / 45;
          const r = t * 240 * dpr;
          // Reverse spiral winding (-Math.PI * 3.5)
          const theta = baseAngle - t * Math.PI * 3.5;
          const sx = Math.cos(theta) * r;
          const sy = Math.sin(theta) * r;
          if (step === 0) {
            vortexArms.moveTo(sx, sy);
          } else {
            vortexArms.lineTo(sx, sy);
          }
        }
        vortexArms.strokePath();

        const orbDist = (45 + arm * 28) * dpr;
        const orb = this.add.circle(
          Math.cos(baseAngle) * orbDist,
          Math.sin(baseAngle) * orbDist,
          7 * dpr,
          0x90e0ef,
          0.95
        );
        swirlContainer.add(orb);
      }

      swirlContainer.add(vortexArms);
      const fullScale = (maxDim / (220 * dpr)) * 1.15;
      swirlContainer.setScale(fullScale);

      // Animate to center while spinning in reverse (-Math.PI * 3.5) and collapsing
      this.tweens.add({
        targets: swirlContainer,
        x: width / 2,
        y: height / 2,
        rotation: -Math.PI * 3.5,
        scale: 0.12,
        duration: 880,
        ease: 'Cubic.easeInOut'
      });

      this.time.delayedCall(880, () => {
        swirlContainer.destroy();
        resolve();
      });
    });
  }

  private layoutScene(width: number, height: number): void {
    const dpr = this.getDpr();
    const scaleX = width / this.bgImage.width;
    const scaleY = height / this.bgImage.height;
    this.bgImage
      .setPosition(width / 2, height / 2)
      .setScale(Math.max(scaleX, scaleY));

    if (this.returnPortalBtn) {
      const margin = Math.max(40, 32 * dpr);
      this.returnPortalBtn.setPosition(margin, margin).setScale(dpr * 1.05);
    }
  }
}
