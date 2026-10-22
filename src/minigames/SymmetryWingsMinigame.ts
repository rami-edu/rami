import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

interface WingGem {
  id: number;
  type: 'circle' | 'diamond' | 'star';
  color: number;
  relX: number; // offset from center spine
  relY: number;
}

export class SymmetryWingsActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'symmetry_wings',
      title: 'Symmetry Wings (Art)',
      shortTitle: 'Symmetry Wings',
      pillar: 'Creativity',
      knowledgeTags: ['painting', 'mathematics'],
      description:
        'Mirror glowing wing crystals across the butterfly spine to balance magical wings.',
      parentGuide: {
        pedagogicalGoals:
          'Builds bilateral symmetry awareness, spatial orientation, reflectional coordinate mapping, and aesthetic balance.',
        parentRecommendation:
          'Fold a piece of paper in half, place a small drop of paint inside, press together, and unfold it to show how identical wings appear on both sides!'
      },
      animalInstructor: 'otter',
      backgroundKey: 'bg_symmetry_wings',
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

    // Number of mirrored gems:
    // Star 1 (Level 1): 1 gem
    // Star 2 (Level 2): 2 gems
    // Star 3 (Level 3): 3 gems
    // Star 4 (Level 4): 4 gems
    // Star 5 (Level 5): 5 gems
    const gemCount = Math.min(5, starLevel + 1);

    const ALL_GEMS: readonly WingGem[] = [
      { id: 0, type: 'circle', color: 0xffbe0b, relX: 65, relY: -35 },
      { id: 1, type: 'diamond', color: 0x4cc9f0, relX: 110, relY: -15 },
      { id: 2, type: 'star', color: 0xff99c8, relX: 75, relY: 30 },
      { id: 3, type: 'circle', color: 0x52b788, relX: 120, relY: 25 },
      { id: 4, type: 'diamond', color: 0xf4a261, relX: 50, relY: 5 }
    ];
    const availableGems = ALL_GEMS.slice(0, gemCount);

    const butterflyY = -25;
    const butterflyContainer = scene.add.container(0, butterflyY);

    // Butterfly Wings Base
    // Left Wing (Fixed Reference with gems already in place)
    const leftUpperWing = scene.add
      .ellipse(-85, -20, 110, 80, 0x1b4332, 0.9)
      .setAngle(-15)
      .setStrokeStyle(3, 0x52b788);
    const leftLowerWing = scene.add
      .ellipse(-75, 45, 85, 65, 0x143527, 0.9)
      .setAngle(15)
      .setStrokeStyle(3, 0x52b788);

    // Right Wing (Target Wing where player must mirror gems)
    const rightUpperWing = scene.add
      .ellipse(85, -20, 110, 80, 0x1b4332, 0.9)
      .setAngle(15)
      .setStrokeStyle(3, 0x52b788);
    const rightLowerWing = scene.add
      .ellipse(75, 45, 85, 65, 0x143527, 0.9)
      .setAngle(-15)
      .setStrokeStyle(3, 0x52b788);

    // Golden butterfly spine / body
    const spine = scene.add
      .rectangle(0, 10, 14, 110, 0xffd166)
      .setStrokeStyle(2, 0xffffff);
    const head = scene.add
      .circle(0, -48, 14, 0xffd166)
      .setStrokeStyle(2, 0xffffff);

    butterflyContainer.add([
      leftUpperWing,
      leftLowerWing,
      rightUpperWing,
      rightLowerWing,
      spine,
      head
    ]);
    playArea.add(butterflyContainer);

    // Place reference gems on LEFT wing (-relX)
    availableGems.forEach((gem) => {
      const leftGem = this.drawGem(
        scene,
        -gem.relX,
        butterflyY + gem.relY,
        gem.type,
        gem.color
      );
      playArea.add(leftGem);
    });

    // Target empty slots on RIGHT wing (+relX)
    const slots: Array<{
      gem: WingGem;
      x: number;
      y: number;
    }> = [];

    availableGems.forEach((gem) => {
      const rx = gem.relX;
      const ry = butterflyY + gem.relY;

      const slotOutline = scene.add
        .circle(rx, ry, 18, 0x0a160d, 0.9)
        .setStrokeStyle(2, 0xffd166, 0.7);
      playArea.add(slotOutline);

      slots.push({ gem, x: rx, y: ry });
    });

    // Shelf of gems to place at bottom
    const shelfY = 110;
    const shelf = scene.add
      .rectangle(0, shelfY, 520, 75, 0x0f1c11, 0.8)
      .setStrokeStyle(2, 0x2d6a4f);
    playArea.add(shelf);

    let placedCount = 0;
    const spacing = 440 / (availableGems.length + 1);
    const startX = -((availableGems.length - 1) * spacing) / 2;

    const shuffled = [...availableGems].sort(() => Math.random() - 0.5);

    shuffled.forEach((gem, idx) => {
      const gx = startX + idx * spacing;
      const gemContainer = scene.add.container(gx, shelfY);

      const plate = scene.add
        .circle(0, 0, 24, 0x1e3321, 0.95)
        .setStrokeStyle(2, 0xffffff);
      const piece = this.drawGem(scene, 0, 0, gem.type, gem.color);

      gemContainer.add([plate, piece]);
      gemContainer.setSize(48, 48);
      gemContainer.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(gemContainer);

      scene.input.setDraggable(gemContainer);

      gemContainer.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          gemContainer.setPosition(dragX, dragY);
        }
      );

      gemContainer.on('dragend', () => {
        const targetSlot = slots.find((s) => s.gem.id === gem.id);

        if (targetSlot) {
          const dist = Math.hypot(
            gemContainer.x - targetSlot.x,
            gemContainer.y - targetSlot.y
          );

          if (dist < 55) {
            // Correct mirrored slot!
            gemContainer.disableInteractive();
            placedCount++;

            scene.tweens.add({
              targets: gemContainer,
              x: targetSlot.x,
              y: targetSlot.y,
              scale: 1.15,
              duration: 160,
              yoyo: true,
              ease: 'Back.easeOut'
            });

            if (placedCount >= gemCount) {
              // Celebrate symmetry completion
              scene.tweens.add({
                targets: butterflyContainer,
                scale: 1.1,
                duration: 250,
                yoyo: true
              });

              onInstanceSolved(
                `Mirrored ${gemCount} gems onto butterfly wings (Star Level ${starLevel + 1})`
              );
            }
            return;
          }
        }

        onWrongAttempt('Gem placed in wrong wing position');
        scene.tweens.add({
          targets: gemContainer,
          x: gx,
          y: shelfY,
          duration: 220,
          ease: 'Cubic.easeOut'
        });
      });
    });
  }

  private drawGem(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: WingGem['type'],
    color: number
  ): Phaser.GameObjects.GameObject {
    switch (type) {
      case 'circle': {
        const c = scene.add.circle(x, y, 13, color);
        c.setStrokeStyle(2, 0xffffff);
        return c;
      }
      case 'diamond': {
        const d = scene.add.polygon(
          x,
          y,
          [0, -16, 12, 0, 0, 16, -12, 0],
          color
        );
        d.setStrokeStyle(2, 0xffffff);
        return d;
      }
      case 'star': {
        const points = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 15 : 7;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          points.push(Math.cos(a) * r, Math.sin(a) * r);
        }
        const st = scene.add.polygon(x, y, points, color);
        st.setStrokeStyle(2, 0xffffff);
        return st;
      }
    }
  }
}

export const symmetryWingsActivity = new SymmetryWingsActivity();
export default symmetryWingsActivity;
