import Phaser from 'phaser';
import type { MinigameModule } from '../managers/MinigameLoader';
import { profileManager } from '../managers/ProfileManager';

interface AcornLevel {
  level: number;
  targetWeight: number;
  hint: string;
}

const LEVELS: AcornLevel[] = [
  { level: 1, targetWeight: 3, hint: 'Warm-up! Add 3 acorns to balance the pebble.' },
  { level: 2, targetWeight: 5, hint: 'Level 2: Match the forest stone of weight 5!' },
  { level: 3, targetWeight: 7, hint: 'Level 3: Balance the heavy river boulder of weight 7!' },
  { level: 4, targetWeight: 9, hint: 'Level 4: Match the ancient root stone of weight 9!' },
  { level: 5, targetWeight: 12, hint: 'Master Level 5: Balance the golden boulder of weight 12!' }
];

const AcornScaleMinigame: MinigameModule = {
  descriptor: {
    id: '07',
    title: 'Acorn Scale',
    pillar: 'Solving (Math)',
    description:
      'Visual equations: Place the exact number of acorns on the scale to match the rock weight!',
    backgroundKey: 'bg_acorn_scale',
    backgroundUrl: './minigame-background.jpg'
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
      profileManager.getActiveProfile()?.progress['Acorn Scale']
        ?.highestLevel ?? 0;
    let levelIndex = savedLevel;
    let currentAcorns = 0;
    let transitioning = false;

    const bg = scene.add.rectangle(0, 0, 760, 460, 0x162418, 0.86);
    bg.setStrokeStyle(4, 0x52b788);

    const title = scene.add
      .text(0, -190, '⚖️ Acorn Scale — Level 1 / 5', {
        fontSize: '26px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(0, -145, '', {
        fontSize: '18px',
        color: '#d8f3dc'
      })
      .setOrigin(0.5);

    const statusText = scene.add
      .text(0, 20, '', {
        fontSize: '28px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const beam = scene.add.rectangle(0, -40, 380, 12, 0x74c69d);
    const pivot = scene.add.triangle(0, -10, 0, -25, -20, 15, 20, 15, 0x52b788);

    // Level Completion Notification Banner
    const toastContainer = scene.add
      .container(0, -40)
      .setDepth(120)
      .setVisible(false)
      .setScale(0.5);

    const toastBg = scene.add
      .rectangle(0, 0, 520, 110, 0x1b4332, 0.98)
      .setStrokeStyle(4, 0xffd166);

    const toastText = scene.add
      .text(0, 0, '🎉 Level Complete! Moving to next level...', {
        fontSize: '22px',
        color: '#fff3b0',
        fontStyle: 'bold',
        align: 'center'
      })
      .setOrigin(0.5);

    toastContainer.add([toastBg, toastText]);

    const showLevelCompleteToast = (completedLvl: number, nextLvl: number) => {
      transitioning = true;
      profileManager.recordMinigameCompletion(
        'Acorn Scale',
        undefined,
        completedLvl
      );

      toastText.setText(
        `🎉 Level ${completedLvl} Complete!\nAdvancing to Level ${nextLvl}...`
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
        currentAcorns = 0;
        transitioning = false;
        updateScale();
      });
    };

    const updateScale = () => {
      const currentDef = LEVELS[levelIndex % LEVELS.length];
      const displayLevel = levelIndex + 1;
      const targetWeight = currentDef.targetWeight + Math.floor(levelIndex / LEVELS.length) * 2;

      title.setText(`⚖️ Acorn Scale — Level ${displayLevel}`);
      subtitle.setText(
        `Match the rock of weight [${targetWeight}] with acorns!`
      );
      statusText.setText(
        `🪨 Rock: ${targetWeight}    vs   🌰 Acorns: ${currentAcorns}`
      );

      const diff = Phaser.Math.Clamp(currentAcorns - targetWeight, -5, 5);
      beam.setAngle(diff * 4);

      if (currentAcorns === targetWeight && !transitioning) {
        statusText.setText(`✨ Balanced! ${targetWeight} = ${currentAcorns} ✨`);
        statusText.setColor('#80ed99');
        const finishedLevel = displayLevel;
        levelIndex += 1;
        showLevelCompleteToast(finishedLevel, levelIndex + 1);
      } else {
        statusText.setColor('#ffd166');
      }
    };

    updateScale();

    const addBtn = scene.add
      .text(-95, 85, '➕ Add Acorn', {
        fontSize: '20px',
        backgroundColor: '#2d6a4f',
        color: '#ffffff',
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (transitioning) return;
        if (currentAcorns < 25) {
          currentAcorns++;
          updateScale();
        }
      });

    const removeBtn = scene.add
      .text(95, 85, '➖ Remove', {
        fontSize: '20px',
        backgroundColor: '#3a5a40',
        color: '#ffffff',
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (transitioning) return;
        if (currentAcorns > 0) {
          currentAcorns--;
          updateScale();
        }
      });

    container.add([
      bg,
      title,
      subtitle,
      beam,
      pivot,
      statusText,
      addBtn,
      removeBtn,
      toastContainer
    ]);
  }
};

export default AcornScaleMinigame;
