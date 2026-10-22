import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

type CategoryType = 'leaf' | 'crystal' | 'acorn' | 'flower';

interface SortItem {
  id: number;
  category: CategoryType;
  emoji: string;
  name: string;
}

const CATEGORY_ICONS: Record<CategoryType, { emoji: string; color: number; label: string }> = {
  leaf: { emoji: '🍃', color: 0x52b788, label: 'Leaves' },
  crystal: { emoji: '💎', color: 0x4cc9f0, label: 'Crystals' },
  acorn: { emoji: '🌰', color: 0xd4a373, label: 'Acorns' },
  flower: { emoji: '🌸', color: 0xff99c8, label: 'Flowers' }
};

export class NatureSortingActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'nature_sorting',
      title: 'Nature Sorting (Science)',
      shortTitle: 'Nature Sorting',
      pillar: 'Logic',
      knowledgeTags: ['science', 'logic'],
      description:
        'Sort woodland treasures into matching natural baskets by identifying shared attributes.',
      parentGuide: {
        pedagogicalGoals:
          'Develops cognitive categorization, set theory, attribute identification, and executive organization.',
        parentRecommendation:
          'Sort laundry socks by color or organize toys into baskets (soft plushies vs hard building blocks) to practice real-world categorization!'
      },
      animalInstructor: 'bear',
      backgroundKey: 'bg_nature_sorting',
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

    // Number of categories & items:
    // Star 1 (Level 1): 2 categories (1 leaf, 1 crystal)
    // Star 2 (Level 2): 2 categories (2 leaves, 2 crystals = 4 items)
    // Star 3 (Level 3): 3 categories (leaf, crystal, acorn = 3 items)
    // Star 4 (Level 4): 3 categories (leaf, crystal, acorn = 6 items)
    // Star 5 (Level 5): 4 categories (leaf, crystal, acorn, flower = 8 items)

    let activeCategories: CategoryType[];
    let itemsPerCategory: number;

    if (starLevel === 0) {
      activeCategories = ['leaf', 'crystal'];
      itemsPerCategory = 1;
    } else if (starLevel === 1) {
      activeCategories = ['leaf', 'crystal'];
      itemsPerCategory = 2;
    } else if (starLevel === 2) {
      activeCategories = ['leaf', 'crystal', 'acorn'];
      itemsPerCategory = 1;
    } else if (starLevel === 3) {
      activeCategories = ['leaf', 'crystal', 'acorn'];
      itemsPerCategory = 2;
    } else {
      activeCategories = ['leaf', 'crystal', 'acorn', 'flower'];
      itemsPerCategory = 2;
    }

    const totalItems = activeCategories.length * itemsPerCategory;
    let placedCount = 0;

    // Build Category Baskets across the upper row
    const basketY = -35;
    const basketSpacing = 500 / (activeCategories.length + 1);
    const startBasketX = -((activeCategories.length - 1) * basketSpacing) / 2;

    const basketSlots: Array<{
      category: CategoryType;
      x: number;
      y: number;
    }> = [];

    activeCategories.forEach((cat, idx) => {
      const bx = startBasketX + idx * basketSpacing;
      const def = CATEGORY_ICONS[cat];

      const basketContainer = scene.add.container(bx, basketY);

      // Wicker basket bowl
      const bowl = scene.add
        .ellipse(0, 8, 86, 52, 0x2d1e12, 0.95)
        .setStrokeStyle(3, def.color);

      // Category icon emblem
      const icon = scene.add
        .text(0, 0, def.emoji, { fontSize: '28px' })
        .setOrigin(0.5);

      basketContainer.add([bowl, icon]);
      playArea.add(basketContainer);

      basketSlots.push({ category: cat, x: bx, y: basketY });
    });

    // Build unsorted items pool
    const itemsToSpawn: SortItem[] = [];
    let idCounter = 0;
    activeCategories.forEach((cat) => {
      const def = CATEGORY_ICONS[cat];
      for (let k = 0; k < itemsPerCategory; k++) {
        itemsToSpawn.push({
          id: idCounter++,
          category: cat,
          emoji: def.emoji,
          name: def.label
        });
      }
    });

    // Shuffle items
    itemsToSpawn.sort(() => Math.random() - 0.5);

    // Bottom shelf for unsorted items
    const shelfY = 110;
    const shelf = scene.add
      .rectangle(0, shelfY, 540, 75, 0x0f1c11, 0.8)
      .setStrokeStyle(2, 0x2d6a4f);
    playArea.add(shelf);

    const itemSpacing = Math.min(65, 500 / (itemsToSpawn.length + 1));
    const startItemX = -((itemsToSpawn.length - 1) * itemSpacing) / 2;

    itemsToSpawn.forEach((item, idx) => {
      const ix = startItemX + idx * itemSpacing;
      const itemContainer = scene.add.container(ix, shelfY);

      const plate = scene.add
        .circle(0, 0, 24, 0x1e3321, 0.9)
        .setStrokeStyle(2, 0xffffff);
      const text = scene.add
        .text(0, 0, item.emoji, { fontSize: '24px' })
        .setOrigin(0.5);

      itemContainer.add([plate, text]);
      itemContainer.setSize(48, 48);
      itemContainer.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(itemContainer);

      scene.input.setDraggable(itemContainer);

      itemContainer.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          itemContainer.setPosition(dragX, dragY);
        }
      );

      itemContainer.on('dragend', () => {
        const targetSlot = basketSlots.find(
          (b) => b.category === item.category
        );

        if (targetSlot) {
          const dist = Math.hypot(
            itemContainer.x - targetSlot.x,
            itemContainer.y - targetSlot.y
          );

          if (dist < 75) {
            // Correct basket!
            itemContainer.disableInteractive();
            placedCount++;

            scene.tweens.add({
              targets: itemContainer,
              x: targetSlot.x + (Math.random() - 0.5) * 20,
              y: targetSlot.y + (Math.random() - 0.5) * 15,
              scale: 0.9,
              duration: 160,
              ease: 'Back.easeOut'
            });

            if (placedCount >= totalItems) {
              onInstanceSolved(
                `Sorted ${totalItems} nature treasures into matching baskets (Star Level ${starLevel + 1})`
              );
            }
            return;
          }
        }

        onWrongAttempt(`Placed ${item.name} into incorrect basket`);
        scene.tweens.add({
          targets: itemContainer,
          x: ix,
          y: shelfY,
          duration: 220,
          ease: 'Cubic.easeOut'
        });
      });
    });
  }
}

export const natureSortingActivity = new NatureSortingActivity();
export default natureSortingActivity;
