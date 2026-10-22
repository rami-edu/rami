import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

interface ColorDrop {
  name: string;
  color: number;
}

export class ColorBloomActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'color_bloom',
      title: 'Color Bloom (Colors)',
      shortTitle: 'Color Bloom',
      pillar: 'Creativity',
      knowledgeTags: ['painting', 'science'],
      description:
        'Drag pure dewdrops to nourish forest flowers and mix vibrant new secondary colors.',
      parentGuide: {
        pedagogicalGoals:
          'Introduces primary color identification (Red, Yellow, Blue) and chromatic mixing (Yellow + Blue = Green, Red + Yellow = Orange, Red + Blue = Purple) without requiring text.',
        parentRecommendation:
          'Try mixing drops of food coloring in transparent cups of water at home! Ask your child to predict what color will appear before dropping the second color.'
      },
      animalInstructor: 'fox',
      backgroundKey: 'bg_color_bloom',
      backgroundUrl: './rhythm-background.jpg'
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

    // Palette of drops:
    // Star 1 (Level 1): Single flower needs 1 primary drop (e.g. Red)
    // Star 2 (Level 2): 2 flowers matching 2 primary drops (Red, Blue)
    // Star 3 (Level 3): Color mixing! Flower target needs Green (requires Yellow + Blue)
    // Star 4 (Level 4): Secondary targets Orange (Red + Yellow) or Purple (Red + Blue)
    // Star 5 (Level 5): Dual garden beds requiring both primary and mixed hues

    let targetRequiredMix: number[];
    let targetName: string;
    let targetHex: number;
    let availableDrops: ColorDrop[];

    const RED = 0xe63946;
    const YELLOW = 0xffbe0b;
    const BLUE = 0x4cc9f0;
    const GREEN = 0x52b788;
    const ORANGE = 0xf4a261;
    const PURPLE = 0x9b5de5;

    if (starLevel === 0) {
      targetName = 'Red Bloom';
      targetHex = RED;
      targetRequiredMix = [RED];
      availableDrops = [{ name: 'Red', color: RED }];
    } else if (starLevel === 1) {
      targetName = 'Blue Bloom';
      targetHex = BLUE;
      targetRequiredMix = [BLUE];
      availableDrops = [
        { name: 'Red', color: RED },
        { name: 'Blue', color: BLUE },
        { name: 'Yellow', color: YELLOW }
      ];
    } else if (starLevel === 2) {
      // Mixing Green
      targetName = 'Green Lotus (Mix Yellow + Blue)';
      targetHex = GREEN;
      targetRequiredMix = [YELLOW, BLUE];
      availableDrops = [
        { name: 'Yellow', color: YELLOW },
        { name: 'Blue', color: BLUE },
        { name: 'Red', color: RED }
      ];
    } else if (starLevel === 3) {
      // Mixing Orange
      targetName = 'Orange Blossom (Mix Red + Yellow)';
      targetHex = ORANGE;
      targetRequiredMix = [RED, YELLOW];
      availableDrops = [
        { name: 'Red', color: RED },
        { name: 'Yellow', color: YELLOW },
        { name: 'Blue', color: BLUE }
      ];
    } else {
      // Mixing Purple
      targetName = 'Purple Orchid (Mix Red + Blue)';
      targetHex = PURPLE;
      targetRequiredMix = [RED, BLUE];
      availableDrops = [
        { name: 'Red', color: RED },
        { name: 'Blue', color: BLUE },
        { name: 'Yellow', color: YELLOW }
      ];
    }

    const appliedColors: number[] = [];

    // Flower pot in center
    const flowerY = -15;
    const flowerContainer = scene.add.container(0, flowerY);

    // Glowing target halo showing desired blooming hue
    const targetHalo = scene.add
      .circle(0, 0, 72, targetHex, 0.22)
      .setStrokeStyle(3, targetHex, 0.85);

    // Flower stem & leaves
    const stem = scene.add.rectangle(0, 48, 10, 45, 0x2d6a4f);
    const leafLeft = scene.add.ellipse(-18, 52, 26, 12, 0x52b788).setAngle(-25);
    const leafRight = scene.add.ellipse(18, 52, 26, 12, 0x52b788).setAngle(25);

    // Flower petals (start uncolored / bud state)
    const petals: Phaser.GameObjects.Arc[] = [];
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      const px = Math.cos(a) * 32;
      const py = Math.sin(a) * 32;
      const petal = scene.add.circle(px, py, 20, 0x243828, 0.9);
      petal.setStrokeStyle(2, 0x74c69d);
      flowerContainer.add(petal);
      petals.push(petal);
    }

    // Flower center bud
    const centerBud = scene.add
      .circle(0, 0, 24, 0x1b2e1e)
      .setStrokeStyle(3, 0xffd166);

    flowerContainer.add([
      targetHalo,
      stem,
      leafLeft,
      leafRight,
      ...petals,
      centerBud
    ]);
    playArea.add(flowerContainer);

    // Drops shelf at bottom
    const dropsY = 115;
    const shelf = scene.add
      .rectangle(0, dropsY, 520, 75, 0x0f1c11, 0.8)
      .setStrokeStyle(2, 0x2d6a4f);
    playArea.add(shelf);

    const spacing = 480 / (availableDrops.length + 1);
    const startX = -((availableDrops.length - 1) * spacing) / 2;

    availableDrops.forEach((drop, i) => {
      const dx = startX + i * spacing;
      const dropContainer = scene.add.container(dx, dropsY);

      // Water drop shape
      const dropBg = scene.add
        .circle(0, 4, 24, drop.color, 0.95)
        .setStrokeStyle(3, 0xffffff);
      const dropTip = scene.add.triangle(0, -18, 0, -12, 16, 8, -16, 8, drop.color);

      dropContainer.add([dropBg, dropTip]);
      dropContainer.setSize(56, 56);
      dropContainer.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(dropContainer);

      scene.input.setDraggable(dropContainer);

      dropContainer.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          dropContainer.setPosition(dragX, dragY);
        }
      );

      dropContainer.on('dragend', () => {
        const dist = Math.hypot(
          dropContainer.x - 0,
          dropContainer.y - flowerY
        );

        if (dist < 85) {
          // Drop absorbed into flower!
          appliedColors.push(drop.color);

          // Animate drop splash
          scene.tweens.add({
            targets: dropContainer,
            scale: 1.3,
            alpha: 0,
            duration: 180,
            onComplete: () => {
              dropContainer.setPosition(dx, dropsY);
              dropContainer.setScale(1);
              dropContainer.setAlpha(1);
            }
          });

          // Check if applied colors match required mix
          const isCorrectDrop = targetRequiredMix.includes(drop.color);
          if (!isCorrectDrop) {
            onWrongAttempt(`Added incorrect color drop to ${targetName}`);
            scene.tweens.add({
              targets: flowerContainer,
              x: 10,
              duration: 80,
              yoyo: true,
              repeat: 2
            });
            return;
          }

          // Flower absorbs color: update petals
          petals.forEach((p, idx) => {
            p.setFillStyle(drop.color);
            scene.tweens.add({
              targets: p,
              scale: 1.25,
              duration: 150,
              yoyo: true,
              delay: idx * 40
            });
          });

          // Check if all required colors are applied
          const hasAll = targetRequiredMix.every((c) =>
            appliedColors.includes(c)
          );

          if (hasAll) {
            centerBud.setFillStyle(targetHex);
            petals.forEach((p) => p.setFillStyle(targetHex));

            scene.tweens.add({
              targets: flowerContainer,
              scale: 1.2,
              duration: 300,
              yoyo: true,
              ease: 'Back.easeOut'
            });

            onInstanceSolved(
              `Bloomed ${targetName} by blending colors (Star Level ${starLevel + 1})`
            );
          }
        } else {
          // Snap back
          scene.tweens.add({
            targets: dropContainer,
            x: dx,
            y: dropsY,
            duration: 200,
            ease: 'Cubic.easeOut'
          });
        }
      });
    });
  }
}

export const colorBloomActivity = new ColorBloomActivity();
export default colorBloomActivity;
