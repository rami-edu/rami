import Phaser from 'phaser';
import type { MinigameModule } from '../managers/MinigameLoader';

const RhythmBranchesMinigame: MinigameModule = {
  descriptor: {
    id: '06',
    title: 'Rhythm in the Branches',
    pillar: 'Creative (Music)',
    description:
      'Tap glowing leaves in sequence to compose a forest melody!'
  },
  launch(scene: Phaser.Scene, onComplete: () => void) {
    const container = scene.add.container(640, 360).setDepth(100);

    const bg = scene.add.rectangle(0, 0, 760, 460, 0x162418, 0.96);
    bg.setStrokeStyle(4, 0x52b788);

    const title = scene.add
      .text(0, -185, '🎵 Rhythm in the Branches — Creative (Music)', {
        fontSize: '24px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(0, -140, 'Tap the musical leaves to play notes and build a 5-note melody!', {
        fontSize: '18px',
        color: '#d8f3dc'
      })
      .setOrigin(0.5);

    const notesPlayed: string[] = [];
    const scoreDisplay = scene.add
      .text(0, 40, 'Melody: (tap leaves above)', {
        fontSize: '22px',
        color: '#ffd166'
      })
      .setOrigin(0.5);

    const leafDefs = [
      { label: '🍃 Do', x: -200, color: 0x52b788 },
      { label: '🌿 Re', x: -100, color: 0x74c69d },
      { label: '🍀 Mi', x: 0, color: 0x95d5b2 },
      { label: '🌱 Sol', x: 100, color: 0x40916c },
      { label: '🍂 La', x: 200, color: 0x2d6a4f }
    ];

    container.add([bg, title, subtitle, scoreDisplay]);

    for (const leaf of leafDefs) {
      const circle = scene.add
        .circle(leaf.x, -40, 36, leaf.color)
        .setStrokeStyle(3, 0xd8f3dc)
        .setInteractive({ useHandCursor: true });

      const label = scene.add
        .text(leaf.x, -40, leaf.label, {
          fontSize: '16px',
          color: '#081c15',
          fontStyle: 'bold'
        })
        .setOrigin(0.5);

      circle.on('pointerdown', () => {
        scene.tweens.add({
          targets: circle,
          scale: 1.25,
          duration: 100,
          yoyo: true
        });
        notesPlayed.push(leaf.label);
        if (notesPlayed.length > 6) {
          notesPlayed.shift();
        }
        scoreDisplay.setText(`🎶 Melody: ${notesPlayed.join(' → ')}`);
      });

      container.add([circle, label]);
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
        container.destroy();
        onComplete();
      });

    container.add(exitBtn);
  }
};

export default RhythmBranchesMinigame;
