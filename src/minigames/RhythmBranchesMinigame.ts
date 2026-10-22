import type Phaser from 'phaser';
import type {
  ActivityActionEntry,
  ActivityChildDetails,
  MinigameDescriptor,
  MinigameModule
} from '../managers/MinigameLoader';
import { profileManager } from '../managers/ProfileManager';
import { ActivityLogoLibrary } from '../objects/ActivityLogoLibrary';

const UI_FONT =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

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

interface RhythmProfileLog {
  highestLevel: number;
  levelsCompleted: number;
  notesTappedCorrect: number;
  wrongNoteResets: number;
  lastPlayedAt: number | null;
  actionHistory: ActivityActionEntry[];
}

export class RhythmBranchesActivity implements MinigameModule {
  private static readonly STORAGE_KEY = 'rami_activity_details_rhythm_branches_v1';

  public readonly descriptor: MinigameDescriptor = {
    id: '06',
    title: 'Rhythm in the Branches',
    pillar: 'Creative (Music)',
    description:
      'Tap glowing leaves in sequence to compose a forest melody!',
    backgroundKey: 'bg_rhythm_branches',
    backgroundUrl: './rhythm-background.jpg'
  };

  private recordsByProfile: Record<string, RhythmProfileLog> = {};

  constructor() {
    this.loadFromStorage();
  }

  private getStorage(): Storage | null {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;
    } catch {
      return null;
    }
  }

  private loadFromStorage(): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      const raw = storage.getItem(RhythmBranchesActivity.STORAGE_KEY);
      if (raw) {
        this.recordsByProfile = JSON.parse(raw);
      }
    } catch {
      this.recordsByProfile = {};
    }
  }

  private saveToStorage(): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      storage.setItem(
        RhythmBranchesActivity.STORAGE_KEY,
        JSON.stringify(this.recordsByProfile)
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  private ensureRecord(profileId: string): RhythmProfileLog {
    if (!this.recordsByProfile[profileId]) {
      const fallbackHigh =
        profileManager.getActiveProfile()?.id === profileId
          ? profileManager.getActiveProfile()?.progress['Rhythm in the Branches']
              ?.highestLevel ?? 0
          : 0;
      this.recordsByProfile[profileId] = {
        highestLevel: fallbackHigh,
        levelsCompleted: fallbackHigh,
        notesTappedCorrect: 0,
        wrongNoteResets: 0,
        lastPlayedAt: null,
        actionHistory: []
      };
    }
    return this.recordsByProfile[profileId];
  }

  private resolveProfileId(profileId?: string): string {
    return profileId ?? profileManager.getActiveProfile()?.id ?? 'default';
  }

  public recordNotePlayed(
    level: number,
    tappedNoteLabel: string,
    expectedNoteLabel: string,
    isCorrect: boolean,
    stepNumber: number,
    totalNotes: number,
    profileId?: string
  ): void {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    rec.lastPlayedAt = Date.now();
    if (isCorrect) {
      rec.notesTappedCorrect += 1;
      rec.actionHistory.unshift({
        timestamp: rec.lastPlayedAt,
        level,
        description: `Played musical leaf ${tappedNoteLabel} (note ${stepNumber}/${totalNotes} on Level ${level})`,
        outcome: 'progress'
      });
    } else {
      rec.wrongNoteResets += 1;
      rec.actionHistory.unshift({
        timestamp: rec.lastPlayedAt,
        level,
        description: `Tapped ${tappedNoteLabel} instead of ${expectedNoteLabel} (melody reset on Level ${level})`,
        outcome: 'mistake'
      });
    }
    if (rec.actionHistory.length > 25) {
      rec.actionHistory.length = 25;
    }
    this.saveToStorage();
  }

  public recordMelodyCompleted(
    level: number,
    melodyNotes: string[],
    profileId?: string
  ): void {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    rec.levelsCompleted += 1;
    rec.highestLevel = Math.max(rec.highestLevel, level);
    rec.lastPlayedAt = Date.now();
    rec.actionHistory.unshift({
      timestamp: rec.lastPlayedAt,
      level,
      description: `Composed Level ${level} melody: ${melodyNotes.join(' → ')}`,
      outcome: 'completed'
    });
    if (rec.actionHistory.length > 25) {
      rec.actionHistory.length = 25;
    }
    this.saveToStorage();
  }

  public getActivityDetails(profileId?: string): ActivityChildDetails {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    const profileProgress = profileManager
      .getAllProfiles()
      .find((p) => p.id === pid)?.progress['Rhythm in the Branches'];
    const highestLevel = Math.max(
      rec.highestLevel,
      profileProgress?.highestLevel ?? 0
    );
    const levelsCompleted = Math.max(
      rec.levelsCompleted,
      profileProgress?.completedCount ?? 0
    );
    const totalActions = rec.notesTappedCorrect + rec.wrongNoteResets;

    const summaryText =
      levelsCompleted > 0 || totalActions > 0
        ? `Highest Level: ${highestLevel} • Melodies Composed: ${levelsCompleted} • Notes Played: ${rec.notesTappedCorrect} • Wrong-Note Resets: ${rec.wrongNoteResets}`
        : 'No activity recorded yet — child has not composed any melodies in Rhythm in the Branches.';

    return {
      activityKey: 'Rhythm in the Branches',
      activityTitle: this.descriptor.title,
      pillar: this.descriptor.pillar,
      description: this.descriptor.description,
      highestLevel,
      levelsCompleted,
      totalActions,
      mistakesCount: rec.wrongNoteResets,
      lastPlayedAt: rec.lastPlayedAt ?? profileProgress?.lastPlayedAt ?? null,
      summaryText,
      actionHistory: [...rec.actionHistory]
    };
  }

  public resetActivityDetails(profileId?: string): void {
    if (profileId) {
      delete this.recordsByProfile[profileId];
    } else {
      this.recordsByProfile = {};
    }
    this.saveToStorage();
  }

  public launch(scene: Phaser.Scene, _onComplete: () => void): void {
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
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(0, -142, '', {
        fontFamily: UI_FONT,
        fontSize: '17px',
        color: '#d8f3dc',
        align: 'center'
      })
      .setOrigin(0.5);

    const scoreDisplay = scene.add
      .text(0, 48, 'Tap the first note in the target melody!', {
        fontFamily: UI_FONT,
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
        const displayLevel = levelIndex + 1;
        const expectedLeaf = LEAF_DEFS[pattern[stepIndex]];

        if (idx === pattern[stepIndex]) {
          stepIndex += 1;
          this.recordNotePlayed(
            displayLevel,
            leaf.label,
            expectedLeaf.label,
            true,
            stepIndex,
            pattern.length
          );

          if (stepIndex >= pattern.length) {
            transitioning = true;
            const completedLvl = levelIndex + 1;
            const melodyNotes = pattern.map((i) => LEAF_DEFS[i].label);
            this.recordMelodyCompleted(completedLvl, melodyNotes);
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
          this.recordNotePlayed(
            displayLevel,
            leaf.label,
            expectedLeaf.label,
            false,
            stepIndex + 1,
            pattern.length
          );
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
}

export const rhythmBranchesActivity = new RhythmBranchesActivity();
export default rhythmBranchesActivity;
