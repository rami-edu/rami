import Phaser from 'phaser';
import type { MinigameModule } from '../managers/MinigameLoader';

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
    const { backgroundKey, backgroundUrl } = this.activityModule.descriptor;
    if (!this.textures.exists(backgroundKey)) {
      this.load.image(backgroundKey, backgroundUrl);
    }
  }

  public create(): void {
    const { width, height } = this.scale;
    const { backgroundKey } = this.activityModule.descriptor;

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

    const triggerReturn = () => {
      if (this.isLeaving) return;
      this.isLeaving = true;
      this.scale.off('resize', onResize);
      this.playReverseReturnPortalTransition().then(() => {
        this.onExitCallback();
      });
    };

    // Launch the specific minigame UI inside this dedicated scene
    this.activityModule.launch(this, triggerReturn);
  }

  /**
   * Standardized Return Portal button rendered at the bottom of every activity.
   */
  private createStandardReturnButton(): void {
    const { width, height } = this.scale;
    this.returnPortalBtn = this.add
      .container(width / 2, height - 48)
      .setDepth(150);

    const aura = this.add.circle(-118, 0, 26, 0xffd166, 0.24);

    this.returnRuneRing = this.add.graphics();
    this.returnRuneRing.lineStyle(2, 0xffd166, 0.9);
    this.returnRuneRing.strokeCircle(0, 0, 20);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.returnRuneRing.fillStyle(0x90e0ef, 0.95);
      this.returnRuneRing.fillCircle(
        Math.cos(angle) * 20,
        Math.sin(angle) * 20,
        2.5
      );
    }
    this.returnRuneRing.setPosition(-118, 0);

    const pillBg = this.add
      .rectangle(0, 0, 290, 48, 0x1b2e1e, 0.95)
      .setStrokeStyle(2.5, 0xffd166)
      .setInteractive({ useHandCursor: true });

    const portalBadge = this.add
      .circle(-118, 0, 16, 0x162418, 0.95)
      .setStrokeStyle(2, 0x90e0ef);

    const portalIcon = this.add
      .text(-118, 0, '🌀', { fontSize: '18px' })
      .setOrigin(0.5);

    const btnLabel = this.add
      .text(14, 0, 'Return to Wonder Tree', {
        fontSize: '18px',
        color: '#fff3b0',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: aura,
      scale: 1.25,
      alpha: 0.45,
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

    pillBg.on('pointerover', () => {
      pillBg.setFillStyle(0x2d6a4f, 0.98);
    });
    pillBg.on('pointerout', () => {
      pillBg.setFillStyle(0x1b2e1e, 0.95);
    });
    pillBg.on('pointerdown', () => {
      if (this.isLeaving) return;
      this.isLeaving = true;
      this.playReverseReturnPortalTransition().then(() => {
        this.onExitCallback();
      });
    });

    this.returnPortalBtn.add([
      pillBg,
      aura,
      this.returnRuneRing,
      portalBadge,
      portalIcon,
      btnLabel
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
      const panelScale = Math.min(
        dpr,
        (width - 24 * dpr) / 760,
        (height - 40 * dpr) / 460
      );
      const panelBottomY = height / 2 + 145 * panelScale;
      this.returnPortalBtn
        .setPosition(width / 2, Math.min(height - 36 * dpr, panelBottomY))
        .setScale(panelScale);
    }
  }
}
