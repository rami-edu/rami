import Phaser from 'phaser';
import type { MinigameModule } from '../managers/MinigameLoader';

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
  launch(scene: Phaser.Scene, onComplete: () => void) {
    const targetWeight = Phaser.Math.Between(3, 8);
    let currentAcorns = 0;

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

    const bg = scene.add.rectangle(0, 0, 760, 460, 0x162418, 0.86);
    bg.setStrokeStyle(4, 0x52b788);

    const title = scene.add
      .text(0, -185, '⚖️ Acorn Scale — Solving (Math)', {
        fontSize: '26px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(
        0,
        -140,
        `Balance the scale! Match the rock of weight [${targetWeight}] with acorns.`,
        {
          fontSize: '18px',
          color: '#d8f3dc'
        }
      )
      .setOrigin(0.5);

    const statusText = scene.add
      .text(0, 15, `🪨 Rock: ${targetWeight}    vs   🌰 Acorns: ${currentAcorns}`, {
        fontSize: '28px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    // Scale beam visual
    const beam = scene.add.rectangle(0, -40, 380, 12, 0x74c69d);
    const pivot = scene.add.triangle(0, -10, 0, -25, -20, 15, 20, 15, 0x52b788);

    const updateScale = () => {
      statusText.setText(
        `🪨 Rock: ${targetWeight}    vs   🌰 Acorns: ${currentAcorns}`
      );
      const diff = Phaser.Math.Clamp(currentAcorns - targetWeight, -5, 5);
      beam.setAngle(diff * 4);

      if (currentAcorns === targetWeight) {
        statusText.setText(`✨ Balanced! ${targetWeight} = ${currentAcorns} ✨`);
        statusText.setColor('#80ed99');
      } else {
        statusText.setColor('#ffd166');
      }
    };

    updateScale();

    const addBtn = scene.add
      .text(-130, 95, '➕ Add Acorn', {
        fontSize: '20px',
        backgroundColor: '#2d6a4f',
        color: '#ffffff',
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (currentAcorns < 12) {
          currentAcorns++;
          updateScale();
        }
      });

    const removeBtn = scene.add
      .text(20, 95, '➖ Remove', {
        fontSize: '20px',
        backgroundColor: '#3a5a40',
        color: '#ffffff',
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (currentAcorns > 0) {
          currentAcorns--;
          updateScale();
        }
      });

    const exitBtn = scene.add
      .text(170, 95, '🚪 Back to Tree', {
        fontSize: '20px',
        backgroundColor: '#1b4332',
        color: '#d8f3dc',
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        scene.scale.off('resize', onResize);
        container.destroy();
        onComplete();
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
      exitBtn
    ]);
  }
};

export default AcornScaleMinigame;
