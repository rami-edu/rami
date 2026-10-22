import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

interface SoundCreature {
  id: string;
  emoji: string;
  color: number;
  soundName: string;
}

const CREATURES: SoundCreature[] = [
  { id: 'duck', emoji: '🦆', color: 0x52b788, soundName: 'Quack' },
  { id: 'frog', emoji: '🐸', color: 0x40916c, soundName: 'Ribbit' },
  { id: 'bird', emoji: '🐦', color: 0x4cc9f0, soundName: 'Tweet' },
  { id: 'owl', emoji: '🦉', color: 0xf4a261, soundName: 'Hoot' },
  { id: 'bee', emoji: '🐝', color: 0xffd166, soundName: 'Bzz' }
];

export class PhonicsPondActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'phonics_pond',
      title: 'Phonics Pond (Language)',
      shortTitle: 'Phonics Pond',
      pillar: 'Creativity',
      knowledgeTags: ['language', 'science'],
      description:
        'Listen to iconic woodland calls and match friendly animal cards to the singing pond.',
      parentGuide: {
        pedagogicalGoals:
          'Builds pre-reading phonological awareness, sound-symbol connection, active listening, and creature identification without requiring text.',
        parentRecommendation:
          'Make playful sounds together! Ask your child "Who says ribbit?" or "Can you make a sound like a quiet bee?" to reinforce auditory imitation.'
      },
      animalInstructor: 'raccoon',
      backgroundKey: 'bg_phonics_pond',
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

    // Number of animal choices:
    // Star 1 (Level 1): 1 creature (direct drag into pond)
    // Star 2 (Level 2): 2 creatures (choice between 2 calls)
    // Star 3 (Level 3): 3 creatures
    // Star 4 (Level 4): 4 creatures
    // Star 5 (Level 5): 5 creatures
    const choiceCount = Math.min(5, starLevel + 1);
    const activeCreatures = CREATURES.slice(0, choiceCount);

    // Pick 1 target creature to be the active sound
    const targetCreature =
      activeCreatures[Math.floor(Math.random() * activeCreatures.length)];

    // Center singing pond
    const pondY = -25;
    const pondContainer = scene.add.container(0, pondY);

    const pondWater = scene.add
      .ellipse(0, 0, 260, 110, 0x0f4c5c, 0.8)
      .setStrokeStyle(3, 0x48cae4);

    // Sound wave icon in center of pond
    const soundWaves = scene.add
      .circle(0, 0, 36, 0x1b4332, 0.9)
      .setStrokeStyle(2, 0x80ed99);

    const soundBubble = scene.add
      .text(0, -2, '📢', { fontSize: '28px' })
      .setOrigin(0.5);

    // Sound callout text for parents / visual hint
    const soundText = scene.add
      .text(0, 34, `"${targetCreature.soundName}!"`, {
        fontSize: '18px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    pondContainer.add([pondWater, soundWaves, soundBubble, soundText]);
    playArea.add(pondContainer);

    // Radiating sound wave animation
    scene.tweens.add({
      targets: soundWaves,
      scale: 1.15,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Animal cards shelf at bottom
    const shelfY = 110;
    const shelf = scene.add
      .rectangle(0, shelfY, 520, 75, 0x0f1c11, 0.8)
      .setStrokeStyle(2, 0x2d6a4f);
    playArea.add(shelf);

    const spacing = 460 / (choiceCount + 1);
    const startX = -((choiceCount - 1) * spacing) / 2;

    activeCreatures.forEach((creature, i) => {
      const cx = startX + i * spacing;
      const card = scene.add.container(cx, shelfY);

      const cardBg = scene.add
        .rectangle(0, 0, 68, 64, creature.color, 0.9)
        .setStrokeStyle(2.5, 0xffffff);

      const cardEmoji = scene.add
        .text(0, 0, creature.emoji, { fontSize: '34px' })
        .setOrigin(0.5);

      card.add([cardBg, cardEmoji]);
      card.setSize(68, 64);
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
        const dist = Math.hypot(card.x - 0, card.y - pondY);

        if (dist < 110) {
          if (creature.id === targetCreature.id) {
            // Correct creature matched to sound!
            card.disableInteractive();
            scene.tweens.add({
              targets: card,
              x: 0,
              y: pondY,
              scale: 1.25,
              duration: 220,
              ease: 'Back.easeOut'
            });

            onInstanceSolved(
              `Matched "${targetCreature.soundName}" to ${targetCreature.emoji} in the pond (Star Level ${starLevel + 1})`
            );
          } else {
            // Wrong creature
            onWrongAttempt(
              `Matched wrong animal ${creature.emoji} to "${targetCreature.soundName}"`
            );
            scene.tweens.add({
              targets: card,
              x: cx,
              y: shelfY,
              duration: 220,
              ease: 'Cubic.easeOut'
            });
          }
        } else {
          // Snap back
          scene.tweens.add({
            targets: card,
            x: cx,
            y: shelfY,
            duration: 200,
            ease: 'Cubic.easeOut'
          });
        }
      });
    });
  }
}

export const phonicsPondActivity = new PhonicsPondActivity();
export default phonicsPondActivity;
