import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

interface SeriationItem {
  id: number;
  sizeRatio: number; // 0.6 to 1.4
  color: number;
}

export class CreatureLadderActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'creature_ladder',
      title: 'Creature Ladder (Sizes)',
      shortTitle: 'Creature Ladder',
      pillar: 'Logic',
      knowledgeTags: ['mathematics', 'logic'],
      description:
        'Order forest stepping stones and glowing mushrooms from smallest to largest to build a path.',
      parentGuide: {
        pedagogicalGoals:
          'Teaches cognitive seriation (arranging objects along a continuum by size/height), relative comparison, and left-to-right progression.',
        parentRecommendation:
          'Line up spoons or toy cars from smallest to biggest on the floor or kitchen table. Ask your child "Which one is the baby spoon? Which one is the giant spoon?"'
      },
      animalInstructor: 'owl',
      backgroundKey: 'bg_creature_ladder',
      backgroundUrl: './bg-creature-ladder.jpg'
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

    // Number of stones to order:
    // Star 1 (Level 1): 2 stones (small vs big)
    // Star 2 (Level 2): 3 stones (small, medium, large)
    // Star 3 (Level 3): 4 stones
    // Star 4 (Level 4): 5 stones
    // Star 5 (Level 5): 5 ascending river stones across creek
    const itemCount = Math.min(5, starLevel + 2);

    const items: SeriationItem[] = [];
    for (let i = 0; i < itemCount; i++) {
      items.push({
        id: i,
        sizeRatio: 0.6 + (i / (itemCount - 1 || 1)) * 0.7, // e.g. 0.6 .. 1.3
        color: 0x52b788
      });
    }

    // Creek river in middle (spacious natural channel)
    const river = scene.add
      .rectangle(0, -25, 620, 120, 0x0f352c, 0.85)
      .setStrokeStyle(3, 0x4cc9f0);
    playArea.add(river);

    // Stepping stone target slots across the river (ordered smallest to largest left to right)
    const slotSpacing = 520 / (itemCount + 1);
    const startSlotX = -((itemCount - 1) * slotSpacing) / 2;
    const slotY = -25;

    const slots: Array<{
      x: number;
      y: number;
      targetId: number;
      sizeRatio: number;
    }> = [];

    items.forEach((item, i) => {
      const sx = startSlotX + i * slotSpacing;
      const baseW = 58 * item.sizeRatio;
      const baseH = 38 * item.sizeRatio;

      // Dashed slot outline
      const slotBg = scene.add
        .ellipse(sx, slotY, baseW * 2, baseH * 2, 0x071b12, 0.95)
        .setStrokeStyle(2.5, 0x74c69d, 0.85);
      playArea.add(slotBg);

      slots.push({
        x: sx,
        y: slotY,
        targetId: item.id,
        sizeRatio: item.sizeRatio
      });
    });

    // Unordered stones on shelf at bottom (generous tactile shelf)
    const shelfY = 118;
    const shelf = scene.add
      .rectangle(0, shelfY, 620, 115, 0x0f1c11, 0.9)
      .setStrokeStyle(2.5, 0x2d6a4f);
    playArea.add(shelf);

    // Shuffle items for the player to drag
    const shuffledItems = [...items].sort(() => Math.random() - 0.5);
    let placedCount = 0;

    shuffledItems.forEach((item, i) => {
      const px = startSlotX + i * slotSpacing;
      const stoneW = 54 * item.sizeRatio;
      const stoneH = 34 * item.sizeRatio;

      const stoneContainer = scene.add.container(px, shelfY);

      // Stone visual
      const stoneBody = scene.add
        .ellipse(0, 0, stoneW * 2, stoneH * 2, 0x5c677d)
        .setStrokeStyle(3, 0xffffff);

      // Mushroom on stone
      const mushroomStem = scene.add
        .rectangle(0, -stoneH * 0.45, 6 * item.sizeRatio, 12 * item.sizeRatio, 0xffeedd);
      const mushroomCap = scene.add
        .circle(0, -stoneH * 0.75, 14 * item.sizeRatio, 0xe63946)
        .setStrokeStyle(2, 0xffffff);

      stoneContainer.add([stoneBody, mushroomStem, mushroomCap]);
      stoneContainer.setSize(stoneW * 2 + 10, stoneH * 2 + 15);
      stoneContainer.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(stoneContainer);

      scene.input.setDraggable(stoneContainer);

      stoneContainer.on('dragstart', () => {
        stoneContainer.setDepth(150);
        scene.tweens.add({
          targets: stoneContainer,
          scale: 1.12,
          duration: 120,
          ease: 'Back.easeOut'
        });
      });

      stoneContainer.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          stoneContainer.setPosition(dragX, dragY);
        }
      );

      stoneContainer.on('dragend', () => {
        stoneContainer.setDepth(100);
        // Find matching slot for this size
        const targetSlot = slots[item.id];
        const dist = Math.hypot(
          stoneContainer.x - targetSlot.x,
          stoneContainer.y - targetSlot.y
        );

        if (dist < 85) {
          // Correctly placed in ladder sequence!
          stoneContainer.disableInteractive();
          placedCount++;

          scene.tweens.add({
            targets: stoneContainer,
            x: targetSlot.x,
            y: targetSlot.y,
            scale: 1.1,
            duration: 160,
            yoyo: true,
            ease: 'Back.easeOut'
          });

          if (placedCount >= itemCount) {
            onInstanceSolved(
              `Ordered ${itemCount} stepping stones from smallest to largest (Star Level ${starLevel + 1})`
            );
          }
        } else {
          onWrongAttempt(`Stone of size ${item.id + 1} placed out of order`);
          scene.tweens.add({
            targets: stoneContainer,
            x: px,
            y: shelfY,
            duration: 220,
            ease: 'Cubic.easeOut'
          });
        }
      });
    });
  }
}

export const creatureLadderActivity = new CreatureLadderActivity();
export default creatureLadderActivity;
