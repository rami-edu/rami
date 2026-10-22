import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

type TrailItemType = 'leaf' | 'acorn' | 'flower' | 'crystal';

interface TrailToken {
  type: TrailItemType;
  color: number;
  label: string;
}

const TOKEN_DEFS: Record<TrailItemType, TrailToken> = {
  leaf: { type: 'leaf', color: 0x80ed99, label: 'Green Leaf' },
  acorn: { type: 'acorn', color: 0xd4a373, label: 'Golden Acorn' },
  flower: { type: 'flower', color: 0xff99c8, label: 'Pink Flower' },
  crystal: { type: 'crystal', color: 0x4cc9f0, label: 'Blue Crystal' }
};

export class PatternPathActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'pattern_path',
      title: 'Pattern Path (Patterns)',
      shortTitle: 'Pattern Path',
      pillar: 'Logic',
      knowledgeTags: ['logic', 'mathematics'],
      description:
        'Complete repetitive forest trails (ABAB, AABB, ABC) by identifying the missing token.',
      parentGuide: {
        pedagogicalGoals:
          'Builds early algebraic thinking, pattern recognition, visual predictability, and sequence extension without requiring reading.',
        parentRecommendation:
          'Create physical patterns using colored crayons or building blocks (e.g. red block, blue block, red block...). Pause and ask your child "Which block comes next?"'
      },
      animalInstructor: 'fox',
      backgroundKey: 'bg_pattern_path',
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

    // Progression of patterns:
    // Star 1 (Level 1): AA (Leaf, Leaf, [?])
    // Star 2 (Level 2): ABAB (Leaf, Acorn, Leaf, Acorn, [?])
    // Star 3 (Level 3): ABC (Leaf, Acorn, Flower, Leaf, Acorn, [?])
    // Star 4 (Level 4): AABB (Leaf, Leaf, Acorn, Acorn, Leaf, [?])
    // Star 5 (Level 5): 4-token cycle (Leaf, Acorn, Flower, Crystal, Leaf, [?])

    let sequenceTemplate: TrailItemType[];

    if (starLevel === 0) {
      sequenceTemplate = ['leaf', 'leaf', 'leaf'];
    } else if (starLevel === 1) {
      sequenceTemplate = ['leaf', 'acorn', 'leaf', 'acorn'];
    } else if (starLevel === 2) {
      sequenceTemplate = ['leaf', 'acorn', 'flower', 'leaf', 'acorn', 'flower'];
    } else if (starLevel === 3) {
      sequenceTemplate = ['leaf', 'leaf', 'acorn', 'acorn', 'leaf'];
    } else {
      sequenceTemplate = ['leaf', 'acorn', 'flower', 'crystal', 'leaf', 'acorn'];
    }

    // The last token in the path is missing (the puzzle target!)
    const targetType = sequenceTemplate[sequenceTemplate.length - 1];
    const pathItems = sequenceTemplate.slice(0, sequenceTemplate.length - 1);

    // River bed trail in center (spacious natural channel)
    const river = scene.add
      .rectangle(0, -25, 620, 115, 0x142b20, 0.85)
      .setStrokeStyle(3, 0x52b788);
    playArea.add(river);

    const totalSlots = sequenceTemplate.length;
    const spacing = Math.min(95, 540 / (totalSlots + 1));
    const startX = -((totalSlots - 1) * spacing) / 2;
    const pathY = -25;

    // Draw given pattern items (large, tactile stepping stones)
    pathItems.forEach((type, idx) => {
      const x = startX + idx * spacing;
      const stoneBg = scene.add.circle(x, pathY, 36, 0x243828);
      stoneBg.setStrokeStyle(3, 0x74c69d);
      playArea.add(stoneBg);

      const tokenObj = this.drawToken(scene, x, pathY, type);
      playArea.add(tokenObj);
    });

    // Empty slot at the end
    const targetSlotX = startX + pathItems.length * spacing;
    const targetSlot = scene.add
      .circle(targetSlotX, pathY, 38, 0x0a160d, 0.95)
      .setStrokeStyle(3.5, 0xffd166, 0.95);
    const questionText = scene.add
      .text(targetSlotX, pathY, '?', {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: '28px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    playArea.add([targetSlot, questionText]);

    // Pulse animation on the empty question slot
    scene.tweens.add({
      targets: [targetSlot, questionText],
      scale: 1.12,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Choices shelf at bottom (generous tactile shelf)
    const shelfY = 118;
    const shelf = scene.add
      .rectangle(0, shelfY, 620, 115, 0x0f1c11, 0.9)
      .setStrokeStyle(2.5, 0x2d6a4f);
    playArea.add(shelf);

    // Available token choices
    const choices: TrailItemType[] = Array.from(new Set(sequenceTemplate));
    // Ensure at least 2 choices
    if (choices.length < 2) choices.push('acorn');

    const choiceSpacing = 420 / (choices.length + 1);
    const startChoiceX = -((choices.length - 1) * choiceSpacing) / 2;

    choices.forEach((type, i) => {
      const cx = startChoiceX + i * choiceSpacing;
      const choiceContainer = scene.add.container(cx, shelfY);

      // Recessed slot guide on shelf
      const slotGuide = scene.add
        .circle(cx, shelfY, 44, 0x09140c, 0.75)
        .setStrokeStyle(1.5, 0x1b4332);
      playArea.add(slotGuide);

      const choicePlate = scene.add
        .circle(0, 0, 40, 0x1e3321, 0.96)
        .setStrokeStyle(3, 0xffffff);
      const token = this.drawToken(scene, 0, 0, type);

      choiceContainer.add([choicePlate, token]);
      choiceContainer.setSize(80, 80);
      choiceContainer.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(choiceContainer);

      scene.input.setDraggable(choiceContainer);

      choiceContainer.on('dragstart', () => {
        choiceContainer.setDepth(150);
        scene.tweens.add({
          targets: choiceContainer,
          scale: 1.15,
          duration: 120,
          ease: 'Back.easeOut'
        });
      });

      choiceContainer.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          choiceContainer.setPosition(dragX, dragY);
        }
      );

      choiceContainer.on('dragend', () => {
        choiceContainer.setDepth(100);
        const dist = Math.hypot(
          choiceContainer.x - targetSlotX,
          choiceContainer.y - pathY
        );

        if (dist < 80) {
          if (type === targetType) {
            // Correct token placed!
            choiceContainer.disableInteractive();
            scene.tweens.add({
              targets: choiceContainer,
              x: targetSlotX,
              y: pathY,
              scale: 1.2,
              duration: 180,
              yoyo: true,
              ease: 'Back.easeOut'
            });

            onInstanceSolved(
              `Completed pattern path with ${TOKEN_DEFS[type].label} (Star Level ${starLevel + 1})`
            );
          } else {
            onWrongAttempt(
              `Placed ${TOKEN_DEFS[type].label} instead of ${TOKEN_DEFS[targetType].label}`
            );
            scene.tweens.add({
              targets: choiceContainer,
              x: cx,
              y: shelfY,
              duration: 220,
              ease: 'Cubic.easeOut'
            });
          }
        } else {
          scene.tweens.add({
            targets: choiceContainer,
            x: cx,
            y: shelfY,
            duration: 200,
            ease: 'Cubic.easeOut'
          });
        }
      });
    });
  }

  private drawToken(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: TrailItemType
  ): Phaser.GameObjects.GameObject {
    const def = TOKEN_DEFS[type];
    switch (type) {
      case 'leaf': {
        const leaf = scene.add
          .ellipse(x, y, 40, 24, def.color)
          .setStrokeStyle(2.5, 0xffffff);
        return leaf;
      }
      case 'acorn': {
        const acorn = scene.add.container(x, y);
        const nut = scene.add.circle(0, 7, 16, 0x8b5a2b);
        const cap = scene.add.rectangle(0, -9, 32, 12, def.color);
        const stem = scene.add.rectangle(0, -17, 4, 6, 0x5a3d1c);
        acorn.add([nut, cap, stem]);
        return acorn;
      }
      case 'flower': {
        const flower = scene.add.container(x, y);
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          const px = Math.cos(a) * 12;
          const py = Math.sin(a) * 12;
          const petal = scene.add.circle(px, py, 9, def.color);
          flower.add(petal);
        }
        const center = scene.add
          .circle(0, 0, 9, 0xffd166)
          .setStrokeStyle(1.5, 0xffffff);
        flower.add(center);
        return flower;
      }
      case 'crystal': {
        const crystal = scene.add
          .polygon(x, y, [0, -24, 18, 0, 0, 24, -18, 0], def.color)
          .setStrokeStyle(2.5, 0xffffff);
        return crystal;
      }
    }
  }
}

export const patternPathActivity = new PatternPathActivity();
export default patternPathActivity;
