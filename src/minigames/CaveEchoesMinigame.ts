import Phaser from 'phaser';
import type { MinigameModule } from '../managers/MinigameLoader';

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
  launch(scene: Phaser.Scene, onComplete: () => void) {
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
      .text(0, -185, '🔮 Cave Echoes — Solving (Memory)', {
        fontSize: '24px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const pattern = [0, 2, 1];
    let step = 0;

    const status = scene.add
      .text(
        0,
        -135,
        'Repeat the echo sequence: Emerald (1) → Sapphire (3) → Ruby (2)',
        {
          fontSize: '18px',
          color: '#d8f3dc'
        }
      )
      .setOrigin(0.5);

    const feedback = scene.add
      .text(0, 55, 'Progress: 0 / 3', {
        fontSize: '22px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const crystals = [
      { idx: 0, name: '1: Emerald', x: -160, color: 0x52b788 },
      { idx: 1, name: '2: Ruby', x: 0, color: 0xe63946 },
      { idx: 2, name: '3: Sapphire', x: 160, color: 0x4cc9f0 }
    ];

    container.add([bg, title, status, feedback]);

    for (const c of crystals) {
      const gem = scene.add
        .polygon(c.x, -30, [0, -45, 35, 0, 0, 45, -35, 0], c.color)
        .setStrokeStyle(3, 0xffffff)
        .setInteractive({ useHandCursor: true });

      const lbl = scene.add
        .text(c.x, 30, c.name, { fontSize: '15px', color: '#ffffff' })
        .setOrigin(0.5);

      gem.on('pointerdown', () => {
        scene.tweens.add({
          targets: gem,
          scale: 1.2,
          duration: 100,
          yoyo: true
        });
        if (c.idx === pattern[step]) {
          step++;
          if (step === pattern.length) {
            feedback.setText('✨ Echo Sequence Complete! Great Memory! ✨');
            feedback.setColor('#80ed99');
            step = 0;
          } else {
            feedback.setText(`Progress: ${step} / ${pattern.length}`);
            feedback.setColor('#ffd166');
          }
        } else {
          step = 0;
          feedback.setText('Try again from the start! (Emerald → Sapphire → Ruby)');
          feedback.setColor('#ffadad');
        }
      });

      container.add([gem, lbl]);
    }

    const exitBtn = scene.add
      .text(0, 140, '🚪 Return to The Wonder Tree', {
        fontSize: '20px',
        backgroundColor: '#1b4332',
        color: '#d8f3dc',
        padding: { x: 18, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        scene.scale.off('resize', onResize);
        container.destroy();
        onComplete();
      });

    container.add(exitBtn);
  }
};

export default CaveEchoesMinigame;
