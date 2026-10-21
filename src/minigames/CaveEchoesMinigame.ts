import Phaser from 'phaser';
import type { MinigameModule } from '../managers/MinigameLoader';
import { profileManager } from '../managers/ProfileManager';

const CRYSTALS = [
  { idx: 0, name: 'Emerald (1)', shortName: 'Emerald', x: -160, color: 0x52b788 },
  { idx: 1, name: 'Ruby (2)', shortName: 'Ruby', x: 0, color: 0xe63946 },
  { idx: 2, name: 'Sapphire (3)', shortName: 'Sapphire', x: 160, color: 0x4cc9f0 }
];

const ECHO_LEVELS: number[][] = [
  [0, 2, 1],             // Level 1: 3 crystals
  [1, 0, 2, 0],          // Level 2: 4 crystals
  [2, 1, 2, 0, 1],       // Level 3: 5 crystals
  [0, 1, 2, 1, 0, 2],    // Level 4: 6 crystals
  [2, 0, 1, 1, 2, 0, 1]  // Level 5: 7 crystals
];

const CaveEchoesMinigame: MinigameModule = {
  descriptor: {
    id: '01',
    title: 'Cave Echoes (The Clockwork Tower)',
    pillar: 'Solving (Memory)',
    description:
      'Memorize and repeat the glowing sequence on the ancient stalactites!',
    backgroundKey: 'bg_cave_echoes',
    backgroundUrl: './cave-echoes-background.jpg'
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

    let levelIndex = 0;
    let step = 0;
    let transitioning = false;

    const bg = scene.add.rectangle(0, 0, 760, 460, 0x162418, 0.86);
    bg.setStrokeStyle(4, 0x52b788);

    const title = scene.add
      .text(0, -190, '🔮 Cave Echoes — Level 1', {
        fontSize: '24px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const status = scene.add
      .text(0, -140, '', {
        fontSize: '17px',
        color: '#d8f3dc',
        align: 'center',
        wordWrap: { width: 700 }
      })
      .setOrigin(0.5);

    const feedback = scene.add
      .text(0, 62, '', {
        fontSize: '22px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    // Level Completion Notification Banner
    const toastContainer = scene.add
      .container(0, -30)
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
      return ECHO_LEVELS[levelIndex % ECHO_LEVELS.length];
    };

    const updateLevelHeader = () => {
      const displayLevel = levelIndex + 1;
      const pattern = getCurrentPattern();
      const seqNames = pattern.map((idx) => CRYSTALS[idx].shortName).join(' → ');
      title.setText(`🔮 Cave Echoes — Level ${displayLevel}`);
      status.setText(`Repeat the crystal sequence: ${seqNames}`);
      feedback
        .setText(`Progress: ${step} / ${pattern.length}`)
        .setColor('#ffd166');
    };

    updateLevelHeader();

    container.add([bg, title, status, feedback]);

    for (const c of CRYSTALS) {
      const gem = scene.add
        .polygon(c.x, -30, [0, -45, 35, 0, 0, 45, -35, 0], c.color)
        .setStrokeStyle(3, 0xffffff)
        .setInteractive({ useHandCursor: true });

      const lbl = scene.add
        .text(c.x, 30, c.name, { fontSize: '15px', color: '#ffffff' })
        .setOrigin(0.5);

      gem.on('pointerdown', () => {
        if (transitioning) return;

        scene.tweens.add({
          targets: gem,
          scale: 1.2,
          duration: 100,
          yoyo: true
        });

        const pattern = getCurrentPattern();
        if (c.idx === pattern[step]) {
          step++;
          if (step === pattern.length) {
            transitioning = true;
            const completedLvl = levelIndex + 1;
            profileManager.recordMinigameCompletion(
              'The Clockwork Tower',
              undefined,
              completedLvl
            );

            levelIndex += 1;
            step = 0;

            toastText.setText(
              `🎉 Level ${completedLvl} Echo Complete!\nAdvancing to Level ${levelIndex + 1}...`
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
            feedback.setText(`Progress: ${step} / ${pattern.length}`);
            feedback.setColor('#80ed99');
          }
        } else {
          step = 0;
          feedback.setText('Oops! Sequence reset — try again from the first crystal!');
          feedback.setColor('#ffadad');
        }
      });

      container.add([gem, lbl]);
    }

    container.add([toastContainer]);
  }
};

export default CaveEchoesMinigame;
