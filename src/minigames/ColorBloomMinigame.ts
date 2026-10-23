import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

interface ColorDrop {
  name: string;
  color: number;
}

interface PrimaryColorDef {
  name: string;
  color: number;
  flowerName: string;
}

interface SecondaryColorDef {
  name: string;
  color: number;
  flowerName: string;
  mix: number[];
  mixNames: string;
}

const RED = 0xe63946;
const YELLOW = 0xffbe0b;
const BLUE = 0x4cc9f0;
const GREEN = 0x52b788;
const ORANGE = 0xf4a261;
const PURPLE = 0x9b5de5;

const PRIMARY_COLORS: PrimaryColorDef[] = [
  { name: 'Red', color: RED, flowerName: 'Red Poppy' },
  { name: 'Yellow', color: YELLOW, flowerName: 'Golden Sunflower' },
  { name: 'Blue', color: BLUE, flowerName: 'Blue Bell' }
];

const SECONDARY_COLORS: SecondaryColorDef[] = [
  {
    name: 'Green',
    color: GREEN,
    flowerName: 'Green Lotus',
    mix: [YELLOW, BLUE],
    mixNames: 'Yellow + Blue'
  },
  {
    name: 'Orange',
    color: ORANGE,
    flowerName: 'Orange Marigold',
    mix: [RED, YELLOW],
    mixNames: 'Red + Yellow'
  },
  {
    name: 'Purple',
    color: PURPLE,
    flowerName: 'Purple Orchid',
    mix: [RED, BLUE],
    mixNames: 'Red + Blue'
  }
];

export class ColorBloomActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };
  private lastTargetColor?: number;
  private flowerGrowthStage = 1;

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
      animalInstructor: 'owl',
      backgroundKey: 'bg_color_bloom',
      backgroundUrl: './bg-color-bloom.jpg'
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

  private pickRandomTarget(starLevel: number): {
    targetName: string;
    targetHex: number;
    targetRequiredMix: number[];
    availableDrops: ColorDrop[];
    recipeIngredients?: Array<{ color: number; name: string }>;
  } {
    if (starLevel === 0) {
      // Level 1: Single primary color match. Randomly pick Red, Yellow, or Blue!
      const candidates = PRIMARY_COLORS.filter(
        (c) => c.color !== this.lastTargetColor
      );
      const chosen =
        candidates[Math.floor(Math.random() * candidates.length)] ??
        PRIMARY_COLORS[0];
      this.lastTargetColor = chosen.color;

      // Provide the target drop + 1 decoy so it's a friendly introductory choice
      const otherPrimaries = PRIMARY_COLORS.filter((p) => p.color !== chosen.color);
      const decoy = otherPrimaries[Math.floor(Math.random() * otherPrimaries.length)];
      const drops: ColorDrop[] = [
        { name: chosen.name, color: chosen.color },
        { name: decoy.name, color: decoy.color }
      ].sort(() => Math.random() - 0.5);

      return {
        targetName: chosen.flowerName,
        targetHex: chosen.color,
        targetRequiredMix: [chosen.color],
        availableDrops: drops
      };
    }

    if (starLevel === 1) {
      // Level 2: Primary color discrimination among all 3 primary colors. Randomly pick Red, Yellow, or Blue!
      const candidates = PRIMARY_COLORS.filter(
        (c) => c.color !== this.lastTargetColor
      );
      const chosen =
        candidates[Math.floor(Math.random() * candidates.length)] ??
        PRIMARY_COLORS[0];
      this.lastTargetColor = chosen.color;

      const drops: ColorDrop[] = PRIMARY_COLORS.map((p) => ({
        name: p.name,
        color: p.color
      })).sort(() => Math.random() - 0.5);

      return {
        targetName: chosen.flowerName,
        targetHex: chosen.color,
        targetRequiredMix: [chosen.color],
        availableDrops: drops
      };
    }

    if (starLevel === 2 || starLevel === 3) {
      // Level 3 & 4: Secondary chromatic mixing. Randomly pick Green, Orange, or Purple!
      const candidates = SECONDARY_COLORS.filter(
        (c) => c.color !== this.lastTargetColor
      );
      const chosen =
        candidates[Math.floor(Math.random() * candidates.length)] ??
        SECONDARY_COLORS[0];
      this.lastTargetColor = chosen.color;

      const drops: ColorDrop[] = PRIMARY_COLORS.map((p) => ({
        name: p.name,
        color: p.color
      })).sort(() => Math.random() - 0.5);

      const ingredients = chosen.mix.map((c) => {
        const primary = PRIMARY_COLORS.find((p) => p.color === c);
        return { color: c, name: primary?.name ?? 'Color' };
      });

      return {
        targetName: `${chosen.flowerName} (Mix ${chosen.mixNames})`,
        targetHex: chosen.color,
        targetRequiredMix: chosen.mix,
        availableDrops: drops,
        recipeIngredients: ingredients
      };
    }

    // Level 5+: Master colorist! Randomly choose from any secondary or primary mix
    const allOptions = [...SECONDARY_COLORS, ...PRIMARY_COLORS];
    const candidates = allOptions.filter(
      (c) => c.color !== this.lastTargetColor
    );
    const chosen =
      candidates[Math.floor(Math.random() * candidates.length)] ??
      SECONDARY_COLORS[0];
    this.lastTargetColor = chosen.color;

    const drops: ColorDrop[] = PRIMARY_COLORS.map((p) => ({
      name: p.name,
      color: p.color
    })).sort(() => Math.random() - 0.5);

    const isSecondary = 'mix' in chosen;
    const mix = isSecondary ? (chosen as SecondaryColorDef).mix : [chosen.color];
    const ingredients = isSecondary
      ? (chosen as SecondaryColorDef).mix.map((c) => {
          const primary = PRIMARY_COLORS.find((p) => p.color === c);
          return { color: c, name: primary?.name ?? 'Color' };
        })
      : undefined;

    return {
      targetName: isSecondary
        ? `${chosen.flowerName} (Mix ${(chosen as SecondaryColorDef).mixNames})`
        : chosen.flowerName,
      targetHex: chosen.color,
      targetRequiredMix: mix,
      availableDrops: drops,
      recipeIngredients: ingredients
    };
  }

  protected advanceNextInstance(): void {
    if (!this.currentPlayContext) return;
    const { scene, playArea, onInstanceSolved, onWrongAttempt } =
      this.currentPlayContext;
    playArea.removeAll(true);

    const starProgress = this.getStarProgress();
    const starLevel = starProgress.starsEarned;

    // Dynamically pick a random target solution for this round
    const {
      targetName,
      targetHex,
      targetRequiredMix,
      availableDrops,
      recipeIngredients
    } = this.pickRandomTarget(starLevel);

    const appliedColors: number[] = [];

    // Flower pot in center
    const flowerY = -25;
    const flowerBaseScale = Math.min(1.30, 0.85 + (this.flowerGrowthStage - 1) * 0.08);
    const flowerContainer = scene.add.container(0, flowerY).setScale(flowerBaseScale);

    // Glowing target halo showing desired blooming hue
    const targetHalo = scene.add
      .circle(0, 0, 94, targetHex, 0.22)
      .setStrokeStyle(4, targetHex, 0.88);

    // Flower stem & leaves
    const stem = scene.add.rectangle(0, 64, 14, 56, 0x2d6a4f);
    const leafLeft = scene.add.ellipse(-26, 68, 36, 18, 0x52b788).setAngle(-25);
    const leafRight = scene.add.ellipse(26, 68, 36, 18, 0x52b788).setAngle(25);

    // Flower petals (start uncolored / bud state)
    const petals: Phaser.GameObjects.Arc[] = [];
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      const px = Math.cos(a) * 44;
      const py = Math.sin(a) * 44;
      const petal = scene.add.circle(px, py, 28, 0x243828, 0.9);
      petal.setStrokeStyle(3, 0x74c69d);
      flowerContainer.add(petal);
      petals.push(petal);
    }

    // Flower center bud
    const centerBud = scene.add
      .circle(0, 0, 34, 0x1b2e1e)
      .setStrokeStyle(4, 0xffd166);

    flowerContainer.add([
      targetHalo,
      stem,
      leafLeft,
      leafRight,
      ...petals,
      centerBud
    ]);

    // Non-verbal Montessori recipe visual guide when mixing is required: Dot1 + Dot2 = Target
    let ing1Dot: Phaser.GameObjects.Arc | undefined;
    let ing2Dot: Phaser.GameObjects.Arc | undefined;

    if (recipeIngredients && recipeIngredients.length >= 2) {
      const recipeContainer = scene.add.container(0, 106);
      const recipeBg = scene.add
        .rectangle(0, 0, 190, 36, 0x0a160d, 0.9)
        .setStrokeStyle(2, 0x2d6a4f);

      ing1Dot = scene.add
        .circle(-54, 0, 13, recipeIngredients[0].color)
        .setStrokeStyle(2.5, 0xffffff);

      const plusText = scene.add
        .text(-25, -1, '+', {
          fontSize: '20px',
          color: '#b7e4c7',
          fontStyle: 'bold'
        })
        .setOrigin(0.5);

      ing2Dot = scene.add
        .circle(4, 0, 13, recipeIngredients[1].color)
        .setStrokeStyle(2.5, 0xffffff);

      const arrowText = scene.add
        .text(32, -1, '=', {
          fontSize: '20px',
          color: '#b7e4c7',
          fontStyle: 'bold'
        })
        .setOrigin(0.5);

      const targetDot = scene.add
        .circle(62, 0, 14, targetHex)
        .setStrokeStyle(3, 0xffd166);

      recipeContainer.add([
        recipeBg,
        ing1Dot,
        plusText,
        ing2Dot,
        arrowText,
        targetDot
      ]);
      flowerContainer.add(recipeContainer);
    }

    playArea.add(flowerContainer);

    scene.tweens.add({
      targets: targetHalo,
      scale: 1.15,
      alpha: 0.45,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Drops shelf at bottom
    const dropsY = 120;
    const shelf = scene.add
      .rectangle(0, dropsY, 620, 105, 0x0f1c11, 0.88)
      .setStrokeStyle(3, 0x2d6a4f);
    playArea.add(shelf);

    const spacing = 520 / (availableDrops.length + 1);
    const startX = -((availableDrops.length - 1) * spacing) / 2;

    availableDrops.forEach((drop, i) => {
      const dx = startX + i * spacing;
      const dropContainer = scene.add.container(dx, dropsY);

      // Recessed slot guide on shelf
      const slotGuide = scene.add
        .circle(dx, dropsY, 40, 0x09140c, 0.75)
        .setStrokeStyle(2, 0x1b4332);
      playArea.add(slotGuide);

      // Water drop shape (generous preschool size: 68px)
      const dropBg = scene.add
        .circle(0, 8, 34, drop.color, 0.96)
        .setStrokeStyle(4, 0xffffff);
      const dropTip = scene.add.triangle(
        0,
        -24,
        0,
        -18,
        22,
        12,
        -22,
        12,
        drop.color
      );

      // Glossy specular shine highlight
      const dropGleam = scene.add
        .ellipse(-10, -2, 12, 7, 0xffffff, 0.6)
        .setAngle(-35);

      dropContainer.add([dropBg, dropTip, dropGleam]);
      dropContainer.setSize(72, 76);
      dropContainer.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(dropContainer);

      scene.input.setDraggable(dropContainer);

      dropContainer.on('dragstart', () => {
        dropContainer.setDepth(150);
        scene.tweens.add({
          targets: dropContainer,
          scale: 1.15,
          duration: 120,
          ease: 'Back.easeOut'
        });
      });

      dropContainer.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          dropContainer.setPosition(dragX, dragY);
        }
      );

      dropContainer.on('dragend', () => {
        dropContainer.setDepth(100);
        const dist = Math.hypot(
          dropContainer.x - 0,
          dropContainer.y - flowerY
        );

        if (dist < 110) {
          // Check if this color was already absorbed into the flower
          if (appliedColors.includes(drop.color)) {
            // Already absorbed: snap back with gentle feedback
            scene.tweens.add({
              targets: dropContainer,
              x: dx,
              y: dropsY,
              scale: 1,
              duration: 200,
              ease: 'Cubic.easeOut'
            });
            return;
          }

          // Check if applied color is part of the required mix
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

            scene.tweens.add({
              targets: dropContainer,
              x: dx,
              y: dropsY,
              scale: 1,
              duration: 220,
              ease: 'Cubic.easeOut'
            });
            return;
          }

          // Correct drop absorbed into flower!
          appliedColors.push(drop.color);

          // Animate drop splash
          scene.tweens.add({
            targets: dropContainer,
            scale: 1.35,
            alpha: 0,
            duration: 180,
            onComplete: () => {
              dropContainer.setPosition(dx, dropsY);
              dropContainer.setScale(1);
              dropContainer.setAlpha(1);
            }
          });

          // Light up corresponding ingredient dot on recipe guide
          if (recipeIngredients && recipeIngredients[0]?.color === drop.color && ing1Dot) {
            ing1Dot.setStrokeStyle(3, 0xffd166);
          } else if (recipeIngredients && recipeIngredients[1]?.color === drop.color && ing2Dot) {
            ing2Dot.setStrokeStyle(3, 0xffd166);
          }

          // Flower absorbs color: update petals with intermediate or full color
          petals.forEach((p, idx) => {
            p.setFillStyle(drop.color);
            scene.tweens.add({
              targets: p,
              scale: 1.25,
              duration: 150,
              yoyo: true,
              delay: idx * 35
            });
          });

          // Check if all required colors are applied
          const hasAll = targetRequiredMix.every((c) =>
            appliedColors.includes(c)
          );

          if (hasAll) {
            centerBud.setFillStyle(targetHex);
            petals.forEach((p) => p.setFillStyle(targetHex));
            this.flowerGrowthStage++;
            const newScale = Math.min(1.30, 0.85 + (this.flowerGrowthStage - 1) * 0.08);

            scene.tweens.add({
              targets: flowerContainer,
              scale: newScale * 1.15,
              duration: 350,
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
            scale: 1,
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
