import Phaser from 'phaser';

/**
 * SplashScreenScene — Displays the illustrated "Tree of Knowledge" filled with
 * animal instructors (owl astronomer, dinosaur geometer, raccoon chemist, fox
 * musician, and bear mathematician) occupying the entire viewport in both
 * horizontal (landscape) and vertical (portrait) orientations.
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
  private readonly radius = 18.0;
  private readonly splashDuration = 3200;

  constructor() {
    super({ key: 'SplashScreenScene' });
  }

  public preload(): void {
    this.load.image('treeOfKnowledge', './tree-of-knowledge.jpg');
    this.load.image('forestBackground', './forest-background.jpg');
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
        align: 'center',
        wordWrap: { width: width - 32 }
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
          align: 'center',
          wordWrap: { width: width - 32 }
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
    const scaleX = width / this.bgImage.width;
    const scaleY = height / this.bgImage.height;
    const coverScale = Math.max(scaleX, scaleY);
    this.bgImage.setPosition(width / 2, height / 2).setScale(coverScale);

    const bannerHeight = width < 600 ? 185 : 170;
    const bannerY = height - bannerHeight / 2;
    this.bannerRect
      .setPosition(width / 2, bannerY)
      .setSize(width, bannerHeight);

    const isCompact = width < 600;
    this.titleText
      .setPosition(width / 2, height - bannerHeight + 42)
      .setFontSize(isCompact ? 20 : 28)
      .setWordWrapWidth(width - 32);

    this.subtitleText
      .setPosition(width / 2, height - bannerHeight + 88)
      .setFontSize(isCompact ? 14 : 16)
      .setWordWrapWidth(width - 32);

    const barWidth = Math.min(340, width - 110);
    const barY = height - 38;
    this.progressTrack.setPosition(width / 2, barY).setSize(barWidth, 12);
    this.progressFill.setPosition(width / 2 - barWidth / 2 + 2, barY);
    this.progressFill.width = Math.max(4, (barWidth - 4) * this.progressRatio);
  }

  public update(_time: number, delta: number): void {
    const { width, height } = this.scale;
    const dt = delta / 1000;
    this.timePassed += dt * this.rotationSpeed;

    const barWidth = Math.min(340, width - 110);
    this.progressFill.width = Math.max(4, (barWidth - 4) * this.progressRatio);

    this.graphics.clear();
    const centerX = width / 2 + barWidth / 2 + 28;
    const centerY = height - 38;

    for (let i = 0; i < this.dotsCount; i++) {
      const angle = (i / this.dotsCount) * Math.PI * 2 + this.timePassed;
      const x = centerX + Math.cos(angle) * this.radius;
      const y = centerY + Math.sin(angle) * this.radius;
      const alpha = 1.0 - i / this.dotsCount;

      this.graphics.fillStyle(0x80ed99, alpha);
      this.graphics.fillCircle(x, y, 3.5);
    }
  }
}
