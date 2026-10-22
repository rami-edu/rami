import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

interface ChimeBell {
  id: number;
  color: number;
  frequencyHz: number;
  label: string;
}

const CHIMES: ChimeBell[] = [
  { id: 0, color: 0xe63946, frequencyHz: 261.63, label: 'Do (Red)' },
  { id: 1, color: 0xf4a261, frequencyHz: 293.66, label: 'Re (Orange)' },
  { id: 2, color: 0xffd166, frequencyHz: 329.63, label: 'Mi (Yellow)' },
  { id: 3, color: 0x52b788, frequencyHz: 349.23, label: 'Fa (Green)' },
  { id: 4, color: 0x4cc9f0, frequencyHz: 392.0, label: 'Sol (Blue)' }
];

export class ForestSymphonyActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };

  constructor() {
    super({
      id: 'forest_symphony',
      title: 'Forest Symphony (Music)',
      shortTitle: 'Forest Symphony',
      pillar: 'Creativity',
      knowledgeTags: ['music', 'logic'],
      description:
        'Listen to glowing woodland bells and echo melodies through visual sound ripples.',
      parentGuide: {
        pedagogicalGoals:
          'Builds auditory discrimination, melodic memory, pattern tracking, and rhythm synchronization.',
        parentRecommendation:
          'Hum or sing simple 2- or 3-note melodies together (like "do-re-mi" or favorite lullaby fragments) and have your child repeat them back like an echo.'
      },
      animalInstructor: 'otter',
      backgroundKey: 'bg_forest_symphony',
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

    // Pattern length:
    // Star 1 (Level 1): 1 bell
    // Star 2 (Level 2): 2 bells
    // Star 3 (Level 3): 3 bells
    // Star 4 (Level 4): 4 bells
    // Star 5 (Level 5): 5 bells
    const targetLength = Math.min(5, starLevel + 1);
    const activeChimes = CHIMES.slice(0, Math.max(2, targetLength));

    // Generate random melodic pattern
    const pattern: number[] = [];
    for (let i = 0; i < targetLength; i++) {
      pattern.push(Math.floor(Math.random() * activeChimes.length));
    }

    let stepIndex = 0;
    let isPlayingDemo = true;

    // Visual ripple pond
    const pond = scene.add
      .ellipse(0, 10, 480, 110, 0x0f2b24, 0.7)
      .setStrokeStyle(2, 0x52b788);
    playArea.add(pond);

    // Chime bells hanging across the tree bough
    const bough = scene.add
      .rectangle(0, -70, 520, 16, 0x3d2614)
      .setStrokeStyle(2, 0x74c69d);
    playArea.add(bough);

    const spacing = 420 / (activeChimes.length + 1);
    const startX = -((activeChimes.length - 1) * spacing) / 2;

    const bellContainers: Phaser.GameObjects.Container[] = [];

    activeChimes.forEach((bell, i) => {
      const bx = startX + i * spacing;
      const by = 10;

      // Hanging string
      const str = scene.add.line(0, 0, bx, -70, bx, by - 26, 0xd4a373);
      str.setLineWidth(2);
      playArea.add(str);

      const bellContainer = scene.add.container(bx, by);

      const bellBody = scene.add
        .circle(0, 0, 26, bell.color)
        .setStrokeStyle(3, 0xffffff);
      const bellCap = scene.add.triangle(0, -18, 0, -12, 14, 6, -14, 6, 0xffd166);
      const clapper = scene.add.circle(0, 24, 6, 0xffd166);

      // Acoustic ripple ring (activates when played)
      const ripple = scene.add
        .circle(0, 0, 42, bell.color, 0)
        .setStrokeStyle(2.5, bell.color);

      bellContainer.add([ripple, bellBody, bellCap, clapper]);
      bellContainer.setSize(56, 68);
      bellContainer.setInteractive({ useHandCursor: true });
      playArea.add(bellContainer);

      bellContainers.push(bellContainer);

      const ringBell = (isDemo = false) => {
        // Visual bell chime animation
        scene.tweens.add({
          targets: bellContainer,
          scale: 1.25,
          duration: 120,
          yoyo: true
        });

        // Pulsing sound ripple
        ripple.setScale(0.8).setAlpha(0.9);
        scene.tweens.add({
          targets: ripple,
          scale: 1.8,
          alpha: 0,
          duration: 400
        });

        if (isDemo) return;
        if (isPlayingDemo) return;

        if (bell.id === activeChimes[pattern[stepIndex]].id) {
          stepIndex++;
          if (stepIndex >= pattern.length) {
            onInstanceSolved(
              `Echoed ${pattern.length}-bell forest symphony (Star Level ${starLevel + 1})`
            );
          }
        } else {
          onWrongAttempt('Wrong bell tapped in the melody');
          stepIndex = 0;
          // Re-demonstrate after short pause
          scene.time.delayedCall(600, () => playDemoSequence());
        }
      };

      bellContainer.on('pointerdown', () => ringBell(false));
    });

    const playDemoSequence = () => {
      isPlayingDemo = true;
      stepIndex = 0;

      pattern.forEach((chimeIdx, idx) => {
        scene.time.delayedCall(400 + idx * 550, () => {
          if (!playArea.active) return;
          const targetBell = bellContainers[chimeIdx];
          if (targetBell) {
            scene.tweens.add({
              targets: targetBell,
              scale: 1.3,
              duration: 150,
              yoyo: true
            });
          }
        });
      });

      scene.time.delayedCall(400 + pattern.length * 550 + 200, () => {
        if (!playArea.active) return;
        isPlayingDemo = false;
      });
    };

    // Play demo melody after short delay
    scene.time.delayedCall(300, () => playDemoSequence());
  }
}

export const forestSymphonyActivity = new ForestSymphonyActivity();
export default forestSymphonyActivity;
