import Phaser from 'phaser';
import type { MinigameModule } from '../managers/MinigameLoader';
import { profileManager } from '../managers/ProfileManager';
import { ActivityLogoLibrary } from '../objects/ActivityLogoLibrary';

const LEAF_DEFS = [
  { label: '🍃 Do', x: -200, color: 0x52b788 },
  { label: '🌿 Re', x: -100, color: 0x74c69d },
  { label: '🍀 Mi', x: 0, color: 0x95d5b2 },
  { label: '🌱 Sol', x: 100, color: 0x40916c },
  { label: '🍂 La', x: 200, color: 0x2d6a4f }
];

const MELODY_LEVELS: number[][] = [
  [0, 1, 2],          // Level 1: Do -> Re -> Mi
  [0, 2, 3, 4],       // Level 2: Do -> Mi -> Sol -> La
  [4, 3, 2, 1, 0],    // Level 3: La -> Sol -> Mi -> Re -> Do
  [0, 3, 1, 4, 2],    // Level 4: 5-note forest arpeggio
  [2, 1, 0, 2, 3, 4]  // Level 5: 6-note canopy symphony
];

const RhythmBranchesMinigame: MinigameModule = {
  descriptor: {
    id: '06',
    title: 'Rhythm in the Branches',
    pillar: 'Creative (Music)',
    description:
      'Tap glowing leaves in sequence to compose a forest melody!',
    backgroundKey: 'bg_rhythm_branches',
    backgroundUrl: './rhythm-background.jpg'
  },
  launch(scene: Phaser.Scene, _onComplete: () => void) {
    const { width, height } = scene.scale;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const container = scene.add
      .container(width / 2, height / 2)
      .setDepth(100)
      .setScale(
        Math.min(dpr, (width - 24 * dpr) / 760, (height - 40 * dpr) / 460)
      );

    const onResize = (gameSize: Phaser.Structs.Size) => {
      if (container.active) {
        const curDpr = Math.min(window.devicePixelRatio || 1, 3);
        container
          .setPosition(gameSize.width / 2, gameSize.height / 2)
          .setScale(
            Math.min(
              curDpr,
              (gameSize.width - 24 * curDpr) / 760,
              (gameSize.height - 40 * curDpr) / 460
            )
          );
      }
    };
    scene.scale.on('resize', onResize);

    const savedLevel =
      profileManager.getActiveProfile()?.progress['Rhythm in the Branches']
        ?.highestLevel ?? 0;
    let levelIndex = savedLevel;
    let stepIndex = 0;
    let transitioning = false;

    const bg = scene.add.rectangle(0, 0, 760, 460, 0x162418, 0.86);
    bg.setStrokeStyle(4, 0x52b788);

    const topicLogoKey = ActivityLogoLibrary.getTopicLogoTexture(
      scene,
      'rhythm_melody'
    );
    const pillarLogoKey = ActivityLogoLibrary.getPillarLogoTexture(
      scene,
      'creativity'
    );

    const headerTopicIcon = scene.add
      .image(-255, -188, topicLogoKey)
      .setDisplaySize(52, 52);

    const headerPillarIcon = scene.add
      .image(255, -188, pillarLogoKey)
      .setDisplaySize(44, 44);

    const title = scene.add
      .text(0, -190, 'Rhythm in the Branches — Level 1', {
        fontSize: '24px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(0, -142, '', {
        fontSize: '17px',
        color: '#d8f3dc',
        align: 'center'
      })
      .setOrigin(0.5);

    const scoreDisplay = scene.add
      .text(0, 48, 'Tap the first note in the target melody!', {
        fontSize: '21px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    // Level Completion Notification Banner
    const toastContainer = scene.add
      .container(0, -35)
      .setDepth(120)
      .setVisible(false)
      .setScale(0.5);

    const toastBg = scene.add
      .rectangle(0, 0, 520, 110, 0x1b4332, 0.98)
      .setStrokeStyle(4, 0xffd166);

    const toastText = scene.add
      .text(0, 0, '', {
        fontSize: '22px',
        color: '#fff3b0',
        fontStyle: 'bold',
        align: 'center'
      })
      .setOrigin(0.5);

    toastContainer.add([toastBg, toastText]);

    const getCurrentPattern = (): number[] => {
      return MELODY_LEVELS[levelIndex % MELODY_LEVELS.length];
    };

    const updateLevelHeader = () => {
      const displayLevel = levelIndex + 1;
      const pattern = getCurrentPattern();
      const targetNames = pattern.map((idx) => LEAF_DEFS[idx].label).join(' → ');
      title.setText(`Rhythm in the Branches — Level ${displayLevel}`);
      subtitle.setText(`Play this melody: ${targetNames}`);
      scoreDisplay
        .setText(`Progress: ${stepIndex} / ${pattern.length} notes`)
        .setColor('#ffd166');
    };

    updateLevelHeader();

    container.add([
      bg,
      headerTopicIcon,
      headerPillarIcon,
      title,
      subtitle,
      scoreDisplay
    ]);

    LEAF_DEFS.forEach((leaf, idx) => {
      const circle = scene.add
        .circle(leaf.x, -35, 38, leaf.color)
        .setStrokeStyle(3, 0xd8f3dc)
        .setInteractive({ useHandCursor: true });

      const label = scene.add
        .text(leaf.x, -35, leaf.label, {
          fontSize: '16px',
          color: '#081c15',
          fontStyle: 'bold'
        })
        .setOrigin(0.5);

      circle.on('pointerdown', () => {
        if (transitioning) return;

        scene.tweens.add({
          targets: circle,
          scale: 1.25,
          duration: 100,
          yoyo: true
        });

        const pattern = getCurrentPattern();
        if (idx === pattern[stepIndex]) {
          stepIndex += 1;
          if (stepIndex >= pattern.length) {
            transitioning = true;
            const completedLvl = levelIndex + 1;
            profileManager.recordMinigameCompletion(
              'Rhythm in the Branches',
              undefined,
              completedLvl
            );

            levelIndex += 1;
            stepIndex = 0;

            toastText.setText(
              `🎉 Level ${completedLvl} Melody Complete!\nAdvancing to Level ${levelIndex + 1}...`
            );
            toastContainer.setVisible(true).setScale(0.5);

            scene.tweens.add({
              targets: toastContainer,
              scale: 1,
              duration: 280,
              ease: 'Back.easeOut'
            });

            scene.time.delayedCall(1500, () => {
              if (!container.active) return;
              toastContainer.setVisible(false);
              transitioning = false;
              updateLevelHeader();
            });
          } else {
            scoreDisplay
              .setText(`🎶 Great! ${stepIndex} / ${pattern.length} notes`)
              .setColor('#80ed99');
          }
        } else {
          stepIndex = 0;
          scoreDisplay
            .setText('Oops! Wrong note — start the melody from the first leaf!')
            .setColor('#ffadad');
        }
      });

      container.add([circle, label]);
    });

    container.add([toastContainer]);
  }
};

export default RhythmBranchesMinigame;
