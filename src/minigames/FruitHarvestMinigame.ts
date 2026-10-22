import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

export class FruitHarvestActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'fruit_harvest',
      title: 'Fruit Harvest (Numbers)',
      shortTitle: 'Fruit Harvest',
      pillar: 'Solving',
      knowledgeTags: ['mathematics', 'science'],
      description:
        'Harvest woodland apples and match quantities into counting baskets with domino dots.',
      parentGuide: {
        pedagogicalGoals:
          'Fosters subitizing (instant quantity recognition), 1-to-1 correspondence, and counting up to 5 without needing numerals.',
        parentRecommendation:
          'Count small items together during daily routines: count grapes in a bowl, steps climbed on a staircase, or blocks in a tower.'
      },
      animalInstructor: 'bear',
      backgroundKey: 'bg_fruit_harvest',
      backgroundUrl: './minigame-background.jpg'
    });
  }

  protected setupGameplay(context: {
    scene: Phaser.Scene;
    container: Phaser.GameObjects.Container;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  }): void {
    this.currentPlayContext = context;
    this.advanceNextInstance();
  }

  protected advanceNextInstance(): void {
    if (!this.currentPlayContext) return;
    const { scene, playArea, onInstanceSolved, onWrongAttempt } =
      this.currentPlayContext;
    playArea.removeAll(true);

    const starProgress = this.getStarProgress();
    const starLevel = starProgress.starsEarned;

    // Target quantity:
    // Star 1 (Level 1): 1 apple to basket with 1 slot
    // Star 2 (Level 2): 2 apples to basket with 2 dots
    // Star 3 (Level 3): 3 apples to basket with 3 dots
    // Star 4 (Level 4): 4 apples with mixed berries
    // Star 5 (Level 5): 5 apples to harvest cart
    const targetQuantity = Math.min(5, starLevel + 1);

    // Tree branch across the top
    const branch = scene.add
      .rectangle(0, -50, 520, 18, 0x5c4033)
      .setStrokeStyle(2, 0x8b5a2b);
    playArea.add(branch);

    // Baskets container at bottom
    const basketY = 90;
    const basket = scene.add.container(0, basketY);

    const basketBody = scene.add
      .ellipse(0, 15, 140, 60, 0x8b5a2b)
      .setStrokeStyle(3, 0xd4a373);
    const basketRim = scene.add
      .ellipse(0, -6, 130, 26, 0x5c4033)
      .setStrokeStyle(2, 0xd4a373);

    // Domino dots on basket to indicate required count visually without numbers
    const dotsContainer = scene.add.container(0, 16);
    const dotSpacing = 22;
    const startDotX = -((targetQuantity - 1) * dotSpacing) / 2;
    for (let d = 0; d < targetQuantity; d++) {
      const dot = scene.add.circle(startDotX + d * dotSpacing, 0, 6, 0xffd166);
      dot.setStrokeStyle(1.5, 0xffffff);
      dotsContainer.add(dot);
    }

    basket.add([basketBody, basketRim, dotsContainer]);
    playArea.add(basket);

    let collectedCount = 0;
    const appleSpacing = 420 / (targetQuantity + 1);
    const startAppleX = -((targetQuantity - 1) * appleSpacing) / 2;

    for (let i = 0; i < targetQuantity; i++) {
      const ax = startAppleX + i * appleSpacing;
      const ay = -50 + (i % 2 === 0 ? 32 : 44);

      // Apple stem hanging from branch
      const stem = scene.add.line(0, 0, ax, -50, ax, ay - 16, 0x2d6a4f);
      stem.setLineWidth(2);
      playArea.add(stem);

      const appleContainer = scene.add.container(ax, ay);

      const fruitColor = i >= 3 ? 0x9b5de5 : 0xe63946; // berries/apples
      const appleBody = scene.add
        .circle(0, 0, 20, fruitColor)
        .setStrokeStyle(2, 0xffffff);
      const appleLeaf = scene.add
        .ellipse(6, -16, 10, 6, 0.4, 0x80ed99)
        .setStrokeStyle(1, 0x2d6a4f);

      appleContainer.add([appleBody, appleLeaf]);
      appleContainer.setSize(44, 44);
      appleContainer.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(appleContainer);

      scene.input.setDraggable(appleContainer);

      appleContainer.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          appleContainer.setPosition(dragX, dragY);
        }
      );

      appleContainer.on('dragend', () => {
        const dist = Math.hypot(
          appleContainer.x - 0,
          appleContainer.y - basketY
        );

        if (dist < 80) {
          // Dropped into basket!
          appleContainer.disableInteractive();
          stem.destroy();
          collectedCount++;

          scene.tweens.add({
            targets: appleContainer,
            x: -40 + collectedCount * 18,
            y: basketY - 10,
            scale: 0.85,
            duration: 180,
            ease: 'Back.easeOut'
          });

          // Basket gentle bounce
          scene.tweens.add({
            targets: basket,
            scaleY: 0.9,
            scaleX: 1.05,
            duration: 100,
            yoyo: true
          });

          if (collectedCount >= targetQuantity) {
            onInstanceSolved(
              `Harvested ${targetQuantity} fruits into the basket (Star Level ${starLevel + 1})`
            );
          }
        } else {
          onWrongAttempt('Fruit dropped outside the harvest basket');
          scene.tweens.add({
            targets: appleContainer,
            x: ax,
            y: ay,
            duration: 220,
            ease: 'Cubic.easeOut'
          });
        }
      });
    }
  }
}

export const fruitHarvestActivity = new FruitHarvestActivity();
export default fruitHarvestActivity;
