import Phaser from 'phaser';

/**
 * SplashScreenScene — Displays the illustrated "Tree of Knowledge" background
 * with the custom Rami emblem animated in the center of the screen and the
 * loading progress bar directly below the logo (no text, no loading circle).
 */
export class SplashScreenScene extends Phaser.Scene {
  private bgImage!: Phaser.GameObjects.Image;
  private logoImage!: Phaser.GameObjects.Image;
  private progressTrack!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private progressRatio = 0;
  private logoPulseScale = 1;
  private readonly splashDuration = 3200;

  constructor() {
    super({ key: 'SplashScreenScene' });
  }

  private getDpr(): number {
    if (this.scale && window.innerWidth > 0) {
      return this.scale.width / window.innerWidth;
    }
    return Math.min(window.devicePixelRatio || 1, 3);
  }

  public preload(): void {
    this.load.image('treeOfKnowledge', './tree-of-knowledge.jpg');
    this.load.image('ramiLogo', './rami-logo.png');
    this.load.image('forestBackground', './forest-background.jpg');
    this.load.image('minigameBackground', './minigame-background.jpg');
    this.load.image('avatar_dino', './avatars/dino.png');
    this.load.image('avatar_raccoon', './avatars/raccoon.png');
    this.load.image('avatar_owl', './avatars/owl.png');
    this.load.image('avatar_fox', './avatars/fox.png');
    this.load.image('avatar_bear', './avatars/bear.png');
    this.load.image('avatar_otter', './avatars/otter.png');
    this.load.image('portal_geom_shapes', './portal-shape-nest.png');
    this.load.image('portal_color_bloom', './portal-color-bloom.png');
    this.load.image('portal_phonics_pond', './portal-phonics-pond.png');
    this.load.image('portal_creature_ladder', './portal-creature-ladder.png');
    this.load.image('portal_pattern_path', './portal-pattern-path.png');
    this.load.image('portal_shadow_match', './portal-shadow-match.png');
    this.load.image('portal_nature_sorting', './portal-nature-sorting.png');
    this.load.image('portal_symmetry_wings', './portal-symmetry-wings.png');
    this.load.image('tree_stage_1', './tree-stage-1.png');
    this.load.image('tree_stage_2', './tree-stage-2.png');
    this.load.image('tree_stage_3', './tree-stage-3.png');
    this.load.image('tree_stage_4', './tree-stage-4.png');
  }

  public create(): void {
    const hudOverlay = document.getElementById('hud-overlay');
    if (hudOverlay) {
      hudOverlay.style.display = 'none';
    }

    const { width, height } = this.scale;

    this.bgImage = this.add.image(width / 2, height / 2, 'treeOfKnowledge');
    this.logoImage = this.add.image(width / 2, height / 2, 'ramiLogo');

    this.progressTrack = this.add
      .rectangle(width / 2, height / 2 + 120, 280, 14, 0x0f1c11, 0.88)
      .setStrokeStyle(2, 0x74c69d);

    this.progressFill = this.add
      .rectangle(width / 2 - 138, height / 2 + 120, 4, 10, 0x80ed99)
      .setOrigin(0, 0.5);

    this.tweens.add({
      targets: this,
      progressRatio: 1,
      duration: this.splashDuration - 200,
      ease: 'Power1'
    });

    this.tweens.add({
      targets: this,
      logoPulseScale: 1.05,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.layoutScene(width, height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      if (this.scene.isActive()) {
        this.layoutScene(gameSize.width, gameSize.height);
      }
    });

    const htmlLoader = document.getElementById('initial-loading-screen');
    if (htmlLoader) {
      htmlLoader.classList.add('fade-out');
      window.setTimeout(() => htmlLoader.remove(), 500);
    }

    this.time.delayedCall(this.splashDuration, () => {
      this.scene.start('WonderTreeScene');
    });
  }

  private getBaseLogoScale(width: number, height: number): number {
    const dpr = this.getDpr();
    const targetLogoWidth = Math.min(width * 0.78, 680 * dpr);
    const maxLogoHeight = height * 0.52;
    return Math.min(
      targetLogoWidth / this.logoImage.width,
      maxLogoHeight / this.logoImage.height
    );
  }

  private layoutScene(width: number, height: number): void {
    const dpr = this.getDpr();

    const scaleX = width / this.bgImage.width;
    const scaleY = height / this.bgImage.height;
    const coverScale = Math.max(scaleX, scaleY);
    this.bgImage.setPosition(width / 2, height / 2).setScale(coverScale);

    const baseLogoScale = this.getBaseLogoScale(width, height);
    const renderedLogoWidth = this.logoImage.width * baseLogoScale;
    const renderedLogoHeight = this.logoImage.height * baseLogoScale;

    const logoY = height / 2 - 14 * dpr;
    this.logoImage
      .setPosition(width / 2, logoY)
      .setScale(baseLogoScale * this.logoPulseScale);

    // Place the loading bar directly below the Rami logo
    const barWidth = Math.min(
      Math.max(220 * dpr, renderedLogoWidth * 0.72),
      width - 64 * dpr
    );
    const barHeight = 14 * dpr;
    const barY = logoY + renderedLogoHeight / 2 + 24 * dpr;

    this.progressTrack
      .setPosition(width / 2, barY)
      .setSize(barWidth, barHeight)
      .setStrokeStyle(2 * dpr, 0x74c69d);

    this.progressFill
      .setPosition(width / 2 - barWidth / 2 + 2 * dpr, barY)
      .setSize(
        Math.max(4 * dpr, (barWidth - 4 * dpr) * this.progressRatio),
        barHeight - 4 * dpr
      );
  }

  public update(): void {
    const { width, height } = this.scale;
    const dpr = this.getDpr();

    const baseLogoScale = this.getBaseLogoScale(width, height);
    const renderedLogoWidth = this.logoImage.width * baseLogoScale;
    this.logoImage.setScale(baseLogoScale * this.logoPulseScale);

    const barWidth = Math.min(
      Math.max(220 * dpr, renderedLogoWidth * 0.72),
      width - 64 * dpr
    );
    this.progressFill.width = Math.max(
      4 * dpr,
      (barWidth - 4 * dpr) * this.progressRatio
    );
  }
}
