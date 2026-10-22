import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

interface ShapeDef {
  type: 'circle' | 'square' | 'triangle' | 'star' | 'diamond' | 'hexagon';
  color: number;
  label: string;
}

export class GeometryShapesActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'geom_shapes',
      title: 'Shape Nest (Geometry)',
      shortTitle: 'Shape Nest',
      pillar: 'Solving',
      knowledgeTags: ['mathematics', 'motor_skills'],
      description:
        'Fit colorful geometric shapes into matching carved tree hollow slots without any text.',
      parentGuide: {
        pedagogicalGoals:
          'Builds 2D shape identification, spatial reasoning, figure-ground perception, and motor coordination through progressive drag-and-drop and rotational alignment.',
        parentRecommendation:
          'Celebrate each successful placement! Point out real-world shapes around the room (clocks as circles, windows as squares) to connect screen play with the physical environment.'
      },
      animalInstructor: 'owl',
      backgroundKey: 'bg_geom_shapes',
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
    const starLevel = starProgress.starsEarned; // 0 to 4 (representing Star 1 to Star 5)
    // 0: Level 1 (Single shape & slot)
    // 1: Level 2 (Multiple shapes with color matching)
    // 2: Level 3 (Uniform neutral colors)
    // 3: Level 4 (Irregular / complex shapes)
    // 4+: Level 5 (Rotation + translation required)

    let shapeDefs: ShapeDef[];
    let uniformColor = false;
    let requireRotation = false;

    if (starLevel === 0) {
      // Level 1: 1 single shape and 1 single slot
      shapeDefs = [{ type: 'circle', color: 0xffbe0b, label: 'Circle' }];
    } else if (starLevel === 1) {
      // Level 2: More shapes, with color helping recognition
      shapeDefs = [
        { type: 'circle', color: 0xffbe0b, label: 'Yellow Circle' },
        { type: 'square', color: 0x4cc9f0, label: 'Blue Square' },
        { type: 'triangle', color: 0xe63946, label: 'Red Triangle' }
      ];
    } else if (starLevel === 2) {
      // Level 3: Colors become uniform so only the shape identifies slot
      uniformColor = true;
      shapeDefs = [
        { type: 'circle', color: 0x52b788, label: 'Circle' },
        { type: 'square', color: 0x52b788, label: 'Square' },
        { type: 'triangle', color: 0x52b788, label: 'Triangle' }
      ];
    } else if (starLevel === 3) {
      // Level 4: Irregular shapes added
      shapeDefs = [
        { type: 'star', color: 0xffd166, label: 'Golden Star' },
        { type: 'diamond', color: 0x90e0ef, label: 'Diamond' },
        { type: 'hexagon', color: 0x80ed99, label: 'Hexagon' },
        { type: 'triangle', color: 0xf4a261, label: 'Triangle' }
      ];
    } else {
      // Level 5: Shape must be rotated as well as translated
      requireRotation = true;
      shapeDefs = [
        { type: 'triangle', color: 0xe63946, label: 'Triangle' },
        { type: 'square', color: 0x4cc9f0, label: 'Square' },
        { type: 'diamond', color: 0xffbe0b, label: 'Diamond' }
      ];
    }

    const count = shapeDefs.length;
    const spacing = Math.min(140, 520 / (count + 1));
    const startX = -((count - 1) * spacing) / 2;

    let placedCount = 0;

    // Build Slots (Upper Row)
    const slots: Array<{
      x: number;
      y: number;
      def: ShapeDef;
      targetAngle: number;
      slotObj: Phaser.GameObjects.GameObject;
    }> = [];

    const slotY = -35;
    const pieceY = 110;

    // Background shelf for pieces
    const shelf = scene.add
      .rectangle(0, pieceY, 560, 80, 0x0f1c11, 0.8)
      .setStrokeStyle(2, 0x2d6a4f);
    playArea.add(shelf);

    shapeDefs.forEach((def, i) => {
      const sx = startX + i * spacing;
      const slotColor = uniformColor ? 0x243828 : def.color;

      // Draw slot outline
      const slotObj = this.drawShapeGameObject(
        scene,
        sx,
        slotY,
        def.type,
        0x0a160d,
        slotColor,
        0
      );
      playArea.add(slotObj);

      slots.push({
        x: sx,
        y: slotY,
        def,
        targetAngle: 0,
        slotObj
      });
    });

    // Shuffle piece spawn order so pieces aren't strictly aligned beneath their slot
    const shuffledDefs = [...shapeDefs].sort(() => Math.random() - 0.5);

    shuffledDefs.forEach((def, i) => {
      const px = startX + i * spacing;
      const initialAngle = requireRotation
        ? (Math.floor(Math.random() * 3) + 1) * 90
        : 0;
      let currentAngle = initialAngle;

      const pieceObj = this.drawShapeGameObject(
        scene,
        px,
        pieceY,
        def.type,
        def.color,
        0xffffff,
        currentAngle
      );
      pieceObj.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(pieceObj);

      // Tap to rotate if rotation is enabled
      if (requireRotation) {
        let dragDistance = 0;
        pieceObj.on('pointerdown', () => {
          dragDistance = 0;
        });
        pieceObj.on('drag', () => {
          dragDistance++;
        });
        pieceObj.on('pointerup', () => {
          if (dragDistance < 5) {
            currentAngle = (currentAngle + 90) % 360;
            scene.tweens.add({
              targets: pieceObj,
              angle: currentAngle,
              duration: 160,
              ease: 'Back.easeOut'
            });
          }
        });
      }

      scene.input.setDraggable(pieceObj);

      pieceObj.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          pieceObj.setPosition(dragX, dragY);
        }
      );

      pieceObj.on('dragend', () => {
        const matchingSlot = slots.find(
          (s) => s.def.type === def.type && (uniformColor || s.def.color === def.color)
        );

        if (matchingSlot) {
          const dist = Math.hypot(
            pieceObj.x - matchingSlot.x,
            pieceObj.y - matchingSlot.y
          );

          const isAngleCorrect =
            !requireRotation || Math.abs(currentAngle % 360) === 0;

          if (dist < 65 && isAngleCorrect) {
            // Magnetic snap to slot!
            scene.tweens.add({
              targets: pieceObj,
              x: matchingSlot.x,
              y: matchingSlot.y,
              scale: 1.15,
              duration: 180,
              yoyo: true,
              ease: 'Back.easeOut'
            });

            pieceObj.disableInteractive();
            placedCount++;

            // Visual sparkle
            const sparkle = scene.add
              .circle(matchingSlot.x, matchingSlot.y, 28, 0xffd166, 0.4)
              .setStrokeStyle(2, 0xffffff);
            playArea.add(sparkle);
            scene.tweens.add({
              targets: sparkle,
              scale: 1.6,
              alpha: 0,
              duration: 400,
              onComplete: () => sparkle.destroy()
            });

            if (placedCount >= count) {
              onInstanceSolved(
                `Placed ${count} geometric figures into their slots (Star Level ${starLevel + 1})`
              );
            }
            return;
          }
        }

        // Snap back on miss or incorrect rotation
        onWrongAttempt(`Attempted to place ${def.label} outside correct slot`);
        scene.tweens.add({
          targets: pieceObj,
          x: px,
          y: pieceY,
          duration: 250,
          ease: 'Cubic.easeOut'
        });
      });
    });
  }

  private drawShapeGameObject(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: ShapeDef['type'],
    fillColor: number,
    strokeColor: number,
    angle: number
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y).setAngle(angle);

    switch (type) {
      case 'circle': {
        const c = scene.add.circle(0, 0, 28, fillColor);
        c.setStrokeStyle(3, strokeColor);
        container.add(c);
        break;
      }
      case 'square': {
        const s = scene.add.rectangle(0, 0, 52, 52, fillColor);
        s.setStrokeStyle(3, strokeColor);
        container.add(s);
        break;
      }
      case 'triangle': {
        const t = scene.add.triangle(0, 0, 0, -28, 28, 24, -28, 24, fillColor);
        t.setStrokeStyle(3, strokeColor);
        container.add(t);
        break;
      }
      case 'star': {
        const points = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 30 : 14;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          points.push(Math.cos(a) * r, Math.sin(a) * r);
        }
        const st = scene.add.polygon(0, 0, points, fillColor);
        st.setStrokeStyle(3, strokeColor);
        container.add(st);
        break;
      }
      case 'diamond': {
        const d = scene.add.polygon(
          0,
          0,
          [0, -32, 24, 0, 0, 32, -24, 0],
          fillColor
        );
        d.setStrokeStyle(3, strokeColor);
        container.add(d);
        break;
      }
      case 'hexagon': {
        const points = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          points.push(Math.cos(a) * 28, Math.sin(a) * 28);
        }
        const hex = scene.add.polygon(0, 0, points, fillColor);
        hex.setStrokeStyle(3, strokeColor);
        container.add(hex);
        break;
      }
    }

    container.setSize(60, 60);
    return container;
  }
}

export const geometryShapesActivity = new GeometryShapesActivity();
export default geometryShapesActivity;
