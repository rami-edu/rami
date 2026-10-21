import Phaser from 'phaser';

/**
 * SplashScreenScene — Displays the illustrated "Tree of Knowledge" background
 * with the custom Rami emblem centered on screen and zero text.
 */
export class SplashScreenScene extends Phaser.Scene {
  private bgImage!: Phaser.GameObjects.Image;
  private logoImage!: Phaser.GameObjects.Image;
  private progressTrack!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private graphics!: Phaser.GameObjects.Graphics;
  private timePassed = 0;
  private progressRatio = 0;
  private logoPulseScale = 1;
  private readonly rotationSpeed = 5.0;
  private readonly dotsCount = 8;
  private readonly splashDuration = 3200;

  constructor() {
    super({ key: 'SplashScreenScene' });
  }

  private getDpr(): number {
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
      .rectangle(width / 2, height - 48, 280, 12, 0x0f1c11, 0.85)
      .setStrokeStyle(2, 0x74c69d);

    this.progressFill = this.add
      .rectangle(width / 2 - 138, height - 48, 4, 8, 0x80ed99)
      .setOrigin(0, 0.5);

    this.tweens.add({
      targets: this,
      progressRatio: 1,
      duration: this.splashDuration - 200,
      ease: 'Power1'
    });

    this.tweens.add({
      targets: this,
      logoPulseScale: 1.04,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.graphics = this.add.graphics();

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
    const targetLogoWidth = Math.min(width * 0.72, 480 * dpr);
    const maxLogoHeight = height * 0.45;
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
    this.logoImage
      .setPosition(width / 2, height / 2)
      .setScale(baseLogoScale * this.logoPulseScale);

    const barWidth = Math.min(340 * dpr, width - 110 * dpr);
    const barHeight = 12 * dpr;
    const barY = height - 44 * dpr;
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

  public update(_time: number, delta: number): void {
    const { width, height } = this.scale;
    const dpr = this.getDpr();
    const dt = delta / 1000;
    this.timePassed += dt * this.rotationSpeed;

    const baseLogoScale = this.getBaseLogoScale(width, height);
    this.logoImage.setScale(baseLogoScale * this.logoPulseScale);

    const barWidth = Math.min(340 * dpr, width - 110 * dpr);
    this.progressFill.width = Math.max(
      4 * dpr,
      (barWidth - 4 * dpr) * this.progressRatio
    );

    this.graphics.clear();
    const centerX = width / 2 + barWidth / 2 + 28 * dpr;
    const centerY = height - 44 * dpr;
    const radius = 16 * dpr;

    for (let i = 0; i < this.dotsCount; i++) {
      const angle = (i / this.dotsCount) * Math.PI * 2 + this.timePassed;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const alpha = 1.0 - i / this.dotsCount;

      this.graphics.fillStyle(0x80ed99, alpha);
      this.graphics.fillCircle(x, y, 3.5 * dpr);
    }
  }
}
