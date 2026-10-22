import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

interface ShadowAnimal {
  id: string;
  emoji: string;
  name: string;
  color: number;
}

const ANIMALS: ShadowAnimal[] = [
  { id: 'butterfly', emoji: '🦋', name: 'Butterfly', color: 0x9b5de5 },
  { id: 'rabbit', emoji: '🐰', name: 'Rabbit', color: 0xffd166 },
  { id: 'turtle', emoji: '🐢', name: 'Turtle', color: 0x52b788 },
  { id: 'bird', emoji: '🐦', name: 'Songbird', color: 0x4cc9f0 },
  { id: 'squirrel', emoji: '🐿️', name: 'Squirrel', color: 0xf4a261 }
];

export class ShadowMatchActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'shadow_match',
      title: 'Shadow Match (Observation)',
      shortTitle: 'Shadow Match',
      pillar: 'Logic',
      knowledgeTags: ['logic', 'science'],
      description:
        'Match vibrant woodland animals into their dark shadow silhouettes projected by the lantern.',
      parentGuide: {
        pedagogicalGoals:
          'Fosters form constancy, visual discrimination (identifying objects by outline alone), and spatial figure-ground perception.',
        parentRecommendation:
          'Turn down the lights before bedtime and use a phone flashlight to make animal shadows on the bedroom wall with your hands!'
      },
      animalInstructor: 'owl',
      backgroundKey: 'bg_shadow_match',
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

    // Number of silhouettes to match:
    // Star 1 (Level 1): 1 animal
    // Star 2 (Level 2): 2 animals
    // Star 3 (Level 3): 3 animals
    // Star 4 (Level 4): 4 animals
    // Star 5 (Level 5): 5 animals
    const animalCount = Math.min(5, starLevel + 1);
    const activeAnimals = ANIMALS.slice(0, animalCount);

    // Glowing parchment board across top
    const board = scene.add
      .rectangle(0, -30, 560, 100, 0x1b2e1e, 0.9)
      .setStrokeStyle(3, 0xffd166, 0.8);
    playArea.add(board);

    const spacing = 500 / (animalCount + 1);
    const startX = -((animalCount - 1) * spacing) / 2;
    const shadowY = -30;

    const shadowSlots: Array<{
      x: number;
      y: number;
      animal: ShadowAnimal;
    }> = [];

    activeAnimals.forEach((animal, i) => {
      const sx = startX + i * spacing;

      // Dark shadow outline
      const shadowHole = scene.add
        .circle(sx, shadowY, 32, 0x050e07, 0.98)
        .setStrokeStyle(2, 0x2d6a4f);

      // Darkened silhouette icon
      const silhouette = scene.add
        .text(sx, shadowY, animal.emoji, { fontSize: '32px' })
        .setOrigin(0.5)
        .setTint(0x000000)
        .setAlpha(0.65);

      playArea.add([shadowHole, silhouette]);
      shadowSlots.push({ x: sx, y: shadowY, animal });
    });

    // Colored animals on shelf at bottom
    const shelfY = 110;
    const shelf = scene.add
      .rectangle(0, shelfY, 520, 75, 0x0f1c11, 0.8)
      .setStrokeStyle(2, 0x2d6a4f);
    playArea.add(shelf);

    // Shuffle animal order on bottom shelf
    const shuffled = [...activeAnimals].sort(() => Math.random() - 0.5);
    let matchedCount = 0;

    shuffled.forEach((animal, i) => {
      const px = startX + i * spacing;
      const card = scene.add.container(px, shelfY);

      const plate = scene.add
        .circle(0, 0, 30, animal.color, 0.9)
        .setStrokeStyle(2.5, 0xffffff);

      const emoji = scene.add
        .text(0, 0, animal.emoji, { fontSize: '30px' })
        .setOrigin(0.5);

      card.add([plate, emoji]);
      card.setSize(60, 60);
      card.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(card);

      scene.input.setDraggable(card);

      card.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          card.setPosition(dragX, dragY);
        }
      );

      card.on('dragend', () => {
        const matchingSlot = shadowSlots.find(
          (s) => s.animal.id === animal.id
        );

        if (matchingSlot) {
          const dist = Math.hypot(
            card.x - matchingSlot.x,
            card.y - matchingSlot.y
          );

          if (dist < 65) {
            // Matched into shadow!
            card.disableInteractive();
            matchedCount++;

            scene.tweens.add({
              targets: card,
              x: matchingSlot.x,
              y: matchingSlot.y,
              scale: 1.15,
              duration: 180,
              yoyo: true,
              ease: 'Back.easeOut'
            });

            if (matchedCount >= animalCount) {
              onInstanceSolved(
                `Matched ${animalCount} animals into their shadows (Star Level ${starLevel + 1})`
              );
            }
            return;
          }
        }

        onWrongAttempt(`Placed ${animal.name} into incorrect shadow`);
        scene.tweens.add({
          targets: card,
          x: px,
          y: shelfY,
          duration: 220,
          ease: 'Cubic.easeOut'
        });
      });
    });
  }
}

export const shadowMatchActivity = new ShadowMatchActivity();
export default shadowMatchActivity;
