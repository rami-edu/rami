import Phaser from 'phaser';

/**
 * SplashScreenScene — Displays the illustrated "Tree of Knowledge" filled with
 * animal instructors (owl astronomer, dinosaur geometer, raccoon chemist, fox
 * musician, and bear mathematician) along with an animated loading ring and
 * progress bar before entering The Wonder Tree hub.
 */
export class SplashScreenScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private timePassed = 0;
  private readonly rotationSpeed = 5.0;
  private readonly dotsCount = 8;
  private readonly radius = 22.0;
  private readonly splashDuration = 3200;

  constructor() {
    super({ key: 'SplashScreenScene' });
  }

  public preload(): void {
    this.load.image('treeOfKnowledge', './tree-of-knowledge.jpg');
  }

  public create(): void {
    const { width, height } = this.scale;

    // Full-screen Tree of Knowledge background artwork
    const bgImage = this.add.image(width / 2, height / 2, 'treeOfKnowledge');
    const scaleX = width / bgImage.width;
    const scaleY = height / bgImage.height;
    const coverScale = Math.max(scaleX, scaleY);
    bgImage.setScale(coverScale);

    // Subtle gentle zoom-in animation during loading
    this.tweens.add({
      targets: bgImage,
      scale: coverScale * 1.04,
      duration: this.splashDuration,
      ease: 'Sine.easeInOut'
    });

    // Bottom translucent banner for title, subtitle, and loading progress
    const bannerHeight = 175;
    const bannerY = height - bannerHeight / 2;

    this.add
      .rectangle(width / 2, bannerY, width, bannerHeight, 0x0b160e, 0.82)
      .setStrokeStyle(2, 0x52b788);

    this.add
      .text(width / 2, height - 132, '🌳 Project Rami — The Tree of Knowledge', {
        fontSize: '32px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height - 94,
        'Learn with the Owl, Dinosaur, Raccoon, Fox & Bear Instructors',
        {
          fontSize: '17px',
          color: '#d8f3dc'
        }
      )
      .setOrigin(0.5);

    // Progress bar track + animated fill
    const barWidth = 360;
    const barHeight = 12;
    const barY = height - 46;

    this.add
      .rectangle(width / 2, barY, barWidth, barHeight, 0x1b4332)
      .setStrokeStyle(1.5, 0x74c69d);

    this.progressFill = this.add
      .rectangle(width / 2 - barWidth / 2, barY, 4, barHeight - 4, 0x80ed99)
      .setOrigin(0, 0.5);

    this.tweens.add({
      targets: this.progressFill,
      width: barWidth - 4,
      duration: this.splashDuration - 200,
      ease: 'Power1'
    });

    this.graphics = this.add.graphics();

    // Hide the HTML initial loader once Phaser canvas is ready
    const htmlLoader = document.getElementById('initial-loading-screen');
    if (htmlLoader) {
      htmlLoader.classList.add('fade-out');
      window.setTimeout(() => htmlLoader.remove(), 500);
    }

    // Allow clicking/tapping to skip after a brief moment, or auto-transition
    this.time.delayedCall(this.splashDuration, () => {
      this.scene.start('WonderTreeScene');
    });
  }

  public update(_time: number, delta: number): void {
    const { width, height } = this.scale;
    const dt = delta / 1000;
    this.timePassed += dt * this.rotationSpeed;

    this.graphics.clear();
    const centerX = width / 2 + 225;
    const centerY = height - 46;

    for (let i = 0; i < this.dotsCount; i++) {
      const angle = (i / this.dotsCount) * Math.PI * 2 + this.timePassed;
      const x = centerX + Math.cos(angle) * this.radius;
      const y = centerY + Math.sin(angle) * this.radius;
      const alpha = 1.0 - i / this.dotsCount;

      this.graphics.fillStyle(0x80ed99, alpha);
      this.graphics.fillCircle(x, y, 4);
    }
  }
}
