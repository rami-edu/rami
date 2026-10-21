import Phaser from 'phaser';

/**
 * SplashScreenScene (migrated from splash_screen.gd + loading_animation.gd).
 * Displays the Rami title and an animated ring of nature-green dots before
 * transitioning to The Wonder Tree hub scene.
 */
export class SplashScreenScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private timePassed = 0;
  private readonly rotationSpeed = 5.0;
  private readonly dotsCount = 8;
  private readonly radius = 32.0;

  constructor() {
    super({ key: 'SplashScreenScene' });
  }

  public create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 70, '🌳 Project Rami', {
        fontSize: '42px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 20, 'The Wonder Tree — Single Player Edition', {
        fontSize: '20px',
        color: '#d8f3dc'
      })
      .setOrigin(0.5);

    this.graphics = this.add.graphics();

    this.time.delayedCall(1500, () => {
      this.scene.start('WonderTreeScene');
    });
  }

  public update(_time: number, delta: number): void {
    const { width, height } = this.scale;
    const dt = delta / 1000;
    this.timePassed += dt * this.rotationSpeed;

    this.graphics.clear();
    const centerX = width / 2;
    const centerY = height / 2 + 55;

    for (let i = 0; i < this.dotsCount; i++) {
      const angle = (i / this.dotsCount) * Math.PI * 2 + this.timePassed;
      const x = centerX + Math.cos(angle) * this.radius;
      const y = centerY + Math.sin(angle) * this.radius;
      const alpha = 1.0 - i / this.dotsCount;

      this.graphics.fillStyle(0x66cc4d, alpha);
      this.graphics.fillCircle(x, y, 5.5);
    }
  }
}
