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
 * Loads and renders the activity's unique high-quality background illustration
 * so the main hub is completely hidden.
 */
export class MinigameActivityScene extends Phaser.Scene {
  private bgImage!: Phaser.GameObjects.Image;
  private activityModule: MinigameModule;
  private onExitCallback: () => void;
  private isLeaving = false;

  constructor(config: MinigameActivityConfig) {
    super({ key: config.sceneKey });
    this.activityModule = config.module;
    this.onExitCallback = config.onExit;
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

    this.layoutBackground(width, height);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      if (this.scene.isActive() && this.bgImage?.active) {
        this.layoutBackground(gameSize.width, gameSize.height);
      }
    };
    this.scale.on('resize', onResize);

    // Smoothly fade in from the portal swirl transition
    this.cameras.main.fadeIn(350, 11, 22, 14);

    // Launch the specific minigame UI inside this dedicated scene
    this.activityModule.launch(this, () => {
      if (this.isLeaving) return;
      this.isLeaving = true;
      this.scale.off('resize', onResize);

      this.cameras.main.fadeOut(300, 11, 22, 14);
      this.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        () => {
          this.onExitCallback();
        }
      );
    });
  }

  private layoutBackground(width: number, height: number): void {
    const scaleX = width / this.bgImage.width;
    const scaleY = height / this.bgImage.height;
    this.bgImage
      .setPosition(width / 2, height / 2)
      .setScale(Math.max(scaleX, scaleY));
  }
}
