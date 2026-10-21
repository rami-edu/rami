import Phaser from 'phaser';

/**
 * SplashScreenScene — Displays the illustrated "Tree of Knowledge" filled with
 * animal instructors (owl astronomer, dinosaur geometer, raccoon chemist, fox
 * musician, and bear mathematician) at full native Retina/HiDPI resolution.
 */
export class SplashScreenScene extends Phaser.Scene {
  private bgImage!: Phaser.GameObjects.Image;
  private bannerRect!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private progressTrack!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private graphics!: Phaser.GameObjects.Graphics;
  private timePassed = 0;
  private progressRatio = 0;
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
    const { width, height } = this.scale;

    this.bgImage = this.add.image(width / 2, height / 2, 'treeOfKnowledge');

    this.bannerRect = this.add
      .rectangle(width / 2, height - 85, width, 170, 0x0b160e, 0.82)
      .setStrokeStyle(2, 0x52b788);

    this.titleText = this.add
      .text(width / 2, height - 130, '🌳 Project Rami — The Tree of Knowledge', {
        fontSize: '28px',
        color: '#95d5b2',
        fontStyle: 'bold',
        align: 'center'
      })
      .setOrigin(0.5);

    this.subtitleText = this.add
      .text(
        width / 2,
        height - 90,
        'Learn with the Owl, Dinosaur, Raccoon, Fox & Bear Instructors',
        {
          fontSize: '16px',
          color: '#d8f3dc',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    this.progressTrack = this.add
      .rectangle(width / 2, height - 42, 280, 12, 0x1b4332)
      .setStrokeStyle(1.5, 0x74c69d);

    this.progressFill = this.add
      .rectangle(width / 2 - 138, height - 42, 4, 8, 0x80ed99)
      .setOrigin(0, 0.5);

    this.tweens.add({
      targets: this,
      progressRatio: 1,
      duration: this.splashDuration - 200,
      ease: 'Power1'
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

  private layoutScene(width: number, height: number): void {
    const dpr = this.getDpr();
    const cssWidth = width / dpr;
    const isCompact = cssWidth < 600;

    const scaleX = width / this.bgImage.width;
    const scaleY = height / this.bgImage.height;
    const coverScale = Math.max(scaleX, scaleY);
    this.bgImage.setPosition(width / 2, height / 2).setScale(coverScale);

    const bannerHeight = (isCompact ? 185 : 170) * dpr;
    const bannerY = height - bannerHeight / 2;
    this.bannerRect
      .setPosition(width / 2, bannerY)
      .setSize(width, bannerHeight)
      .setStrokeStyle(2 * dpr, 0x52b788);

    this.titleText
      .setPosition(width / 2, height - bannerHeight + 42 * dpr)
      .setFontSize((isCompact ? 20 : 28) * dpr)
      .setWordWrapWidth(width - 32 * dpr);

    this.subtitleText
      .setPosition(width / 2, height - bannerHeight + 88 * dpr)
      .setFontSize((isCompact ? 14 : 16) * dpr)
      .setWordWrapWidth(width - 32 * dpr);

    const barWidth = Math.min(340 * dpr, width - 110 * dpr);
    const barHeight = 12 * dpr;
    const barY = height - 38 * dpr;
    this.progressTrack
      .setPosition(width / 2, barY)
      .setSize(barWidth, barHeight)
      .setStrokeStyle(1.5 * dpr, 0x74c69d);

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

    const barWidth = Math.min(340 * dpr, width - 110 * dpr);
    this.progressFill.width = Math.max(
      4 * dpr,
      (barWidth - 4 * dpr) * this.progressRatio
    );

    this.graphics.clear();
    const centerX = width / 2 + barWidth / 2 + 28 * dpr;
    const centerY = height - 38 * dpr;
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
