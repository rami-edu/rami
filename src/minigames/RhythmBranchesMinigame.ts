import type Phaser from 'phaser';
import {
  DEFAULT_STAR_REQUIREMENTS,
  evaluateStarProgress,
  MAX_ACTIVITY_STARS,
  type ActivityActionEntry,
  type ActivityChildDetails,
  type MinigameDescriptor,
  type MinigameModule,
  type StarLevelRequirement,
  type StarProgressStatus
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
  [0, 1, 2],          // Difficulty 1: Do -> Re -> Mi
  [0, 2, 3, 4],       // Difficulty 2: Do -> Mi -> Sol -> La
  [4, 3, 2, 1, 0],    // Difficulty 3: La -> Sol -> Mi -> Re -> Do
  [0, 3, 1, 4, 2],    // Difficulty 4: 5-note forest arpeggio
  [2, 1, 0, 2, 3, 4]  // Difficulty 5: 6-note canopy symphony
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
    backgroundUrl: './rhythm-background.jpg',
    knowledgeTags: ['music', 'logic', 'motor_skills'],
    parentGuide: {
      pedagogicalGoals:
        'Sharpens auditory discrimination, working memory for short sound sequences, and rhythmic finger tapping.',
      parentRecommendation:
        'Hum or sing the notes along with your child. Let them listen to the glowing bell sequence first, then clap their hands as they tap each leaf.'
    }
  };

  /**
   * Standard exponential star progression (1, 10, 100, 1,000, 10,000 successful melodies),
   * or custom star requirements if overridden via `setStarRequirements()`.
   */
  private starRequirements: readonly StarLevelRequirement[] =
    DEFAULT_STAR_REQUIREMENTS;

  private recordsByProfile: Record<string, RhythmProfileLog> = {};

  constructor(customStarRequirements?: readonly StarLevelRequirement[]) {
    if (customStarRequirements && customStarRequirements.length === MAX_ACTIVITY_STARS) {
      this.starRequirements = customStarRequirements;
    }
    this.loadFromStorage();
  }

  public getStarRequirements(): readonly StarLevelRequirement[] {
    return this.starRequirements;
  }

  public setStarRequirements(
    requirements: readonly StarLevelRequirement[]
  ): void {
    if (requirements.length === MAX_ACTIVITY_STARS) {
      this.starRequirements = requirements;
    }
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
      const fallbackCompleted =
        profileManager.getActiveProfile()?.id === profileId
          ? profileManager.getActiveProfile()?.progress['Rhythm in the Branches']
              ?.completedCount ?? 0
          : 0;
      const initialStars = evaluateStarProgress(
        fallbackCompleted,
        this.starRequirements
      ).starsEarned;
      this.recordsByProfile[profileId] = {
        highestLevel: initialStars,
        levelsCompleted: fallbackCompleted,
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

  public getStarProgress(profileId?: string): StarProgressStatus {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    const profileProgress = profileManager
      .getAllProfiles()
      .find((p) => p.id === pid)?.progress['Rhythm in the Branches'];
    const totalSolved = Math.max(
      rec.levelsCompleted,
      profileProgress?.completedCount ?? 0
    );
    return evaluateStarProgress(totalSolved, this.starRequirements);
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
  ): StarProgressStatus {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    rec.levelsCompleted += 1;
    const starStatus = evaluateStarProgress(
      rec.levelsCompleted,
      this.starRequirements
    );
    rec.highestLevel = starStatus.starsEarned;
    rec.lastPlayedAt = Date.now();
    rec.actionHistory.unshift({
      timestamp: rec.lastPlayedAt,
      level: starStatus.starsEarned,
      description: `Composed Level ${level} melody: ${melodyNotes.join(' → ')} (${starStatus.starsVisual} • ${rec.levelsCompleted} solved)`,
      outcome: 'completed'
    });
    if (rec.actionHistory.length > 25) {
      rec.actionHistory.length = 25;
    }
    this.saveToStorage();
    return starStatus;
  }

  public getActivityDetails(profileId?: string): ActivityChildDetails {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    const profileProgress = profileManager
      .getAllProfiles()
      .find((p) => p.id === pid)?.progress['Rhythm in the Branches'];
    const starProgress = this.getStarProgress(pid);
    const levelsCompleted = starProgress.successfulAttempts;
    const starsEarned = starProgress.starsEarned;
    const totalActions = rec.notesTappedCorrect + rec.wrongNoteResets;

    const summaryText =
      levelsCompleted > 0 || totalActions > 0
        ? `Stars: ${starProgress.starsVisual} (${starsEarned}/${MAX_ACTIVITY_STARS}) • Melodies Composed: ${levelsCompleted} • ${starProgress.progressBarLabel} • Notes Played: ${rec.notesTappedCorrect} • Resets: ${rec.wrongNoteResets}`
        : `Stars: ${starProgress.starsVisual} (0/${MAX_ACTIVITY_STARS}) • ${starProgress.progressBarLabel} — No melodies composed yet.`;

    return {
      activityKey: 'Rhythm in the Branches',
      activityTitle: this.descriptor.title,
      pillar: this.descriptor.pillar,
      description: this.descriptor.description,
      knowledgeTags: this.descriptor.knowledgeTags,
      parentGuide: this.descriptor.parentGuide,
      starsEarned,
      maxStars: MAX_ACTIVITY_STARS,
      starsVisual: starProgress.starsVisual,
      starProgress,
      highestLevel: starsEarned,
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

    const computeScale = (w: number, h: number, curDpr: number): number => {
      const fitScaleW = (w - 56 * curDpr) / 760;
      const fitScaleH = (h - 36 * curDpr) / 490;
      return Math.min(fitScaleW, fitScaleH);
    };

    const container = scene.add
      .container(width / 2, height / 2)
      .setDepth(100)
      .setScale(computeScale(width, height, dpr));

    const onResize = (gameSize: Phaser.Structs.Size) => {
      if (container.active) {
        const curDpr = Math.min(window.devicePixelRatio || 1, 3);
        container
          .setPosition(gameSize.width / 2, gameSize.height / 2)
          .setScale(computeScale(gameSize.width, gameSize.height, curDpr));
      }
    };
    scene.scale.on('resize', onResize);

    let stepIndex = 0;
    let transitioning = false;

    const bg = scene.add.rectangle(0, 0, 760, 490, 0x162418, 0.9);
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
      .image(-255, -198, topicLogoKey)
      .setDisplaySize(50, 50);

    const headerPillarIcon = scene.add
      .image(255, -198, pillarLogoKey)
      .setDisplaySize(44, 44);

    const title = scene.add
      .text(0, -206, 'Rhythm in the Branches', {
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const starsRowText = scene.add
      .text(0, -172, '', {
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const BAR_WIDTH = 460;
    const BAR_HEIGHT = 16;
    const starBarBg = scene.add
      .rectangle(0, -142, BAR_WIDTH, BAR_HEIGHT, 0x0f1c11, 0.95)
      .setStrokeStyle(2, 0x52b788);

    const starBarFill = scene.add
      .rectangle(-BAR_WIDTH / 2 + 2, -142, 0, BAR_HEIGHT - 4, 0x80ed99, 1)
      .setOrigin(0, 0.5);

    const starBarLabel = scene.add
      .text(0, -120, '', {
        fontFamily: UI_FONT,
        fontSize: '14px',
        color: '#b7e4c7',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(0, -90, '', {
        fontFamily: UI_FONT,
        fontSize: '17px',
        color: '#d8f3dc',
        align: 'center'
      })
      .setOrigin(0.5);

    const scoreDisplay = scene.add
      .text(0, 92, 'Tap the first note in the target melody!', {
        fontFamily: UI_FONT,
        fontSize: '20px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    // Star / Instance Completion Notification Banner
    const toastContainer = scene.add
      .container(0, -15)
      .setDepth(120)
      .setVisible(false)
      .setScale(0.5);

    const toastBg = scene.add
      .rectangle(0, 0, 540, 118, 0x1b4332, 0.98)
      .setStrokeStyle(4, 0xffd166);

    const toastText = scene.add
      .text(0, 0, '', {
        fontFamily: UI_FONT,
        fontSize: '21px',
        color: '#fff3b0',
        fontStyle: 'bold',
        align: 'center'
      })
      .setOrigin(0.5);

    toastContainer.add([toastBg, toastText]);

    const getCurrentPattern = (): number[] => {
      const starStatus = this.getStarProgress();
      const idx =
        (starStatus.activeDifficultyTier - 1 + starStatus.successfulAttempts) %
        MELODY_LEVELS.length;
      return MELODY_LEVELS[idx];
    };

    const syncStarHeaderUi = (status: StarProgressStatus) => {
      const spacedStars = status.starsVisual.split('').join(' ');
      starsRowText.setText(
        `${spacedStars}   (${status.starsEarned} / ${status.maxStars} Stars)`
      );
      const targetFillW = Math.round(
        (BAR_WIDTH - 4) * status.progressFraction
      );
      starBarFill.width = targetFillW;
      starBarLabel.setText(status.progressBarLabel);
    };

    const updateLevelHeader = () => {
      const starStatus = this.getStarProgress();
      syncStarHeaderUi(starStatus);
      const pattern = getCurrentPattern();
      const targetNames = pattern.map((idx) => LEAF_DEFS[idx].label).join(' → ');
      title.setText(
        `Rhythm in the Branches — Star Level ${starStatus.starsEarned}/${starStatus.maxStars}`
      );
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
      starsRowText,
      starBarBg,
      starBarFill,
      starBarLabel,
      subtitle,
      scoreDisplay
    ]);

    LEAF_DEFS.forEach((leaf, idx) => {
      const circle = scene.add
        .circle(leaf.x, -5, 38, leaf.color)
        .setStrokeStyle(3, 0xd8f3dc)
        .setInteractive({ useHandCursor: true });

      const label = scene.add
        .text(leaf.x, -5, leaf.label, {
          fontFamily: UI_FONT,
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

        const starStatus = this.getStarProgress();
        const pattern = getCurrentPattern();
        const displayLevel = starStatus.activeDifficultyTier;
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
            const prevStars = starStatus.starsEarned;
            const melodyNotes = pattern.map((i) => LEAF_DEFS[i].label);
            const newStatus = this.recordMelodyCompleted(
              displayLevel,
              melodyNotes
            );
            profileManager.recordMinigameCompletion(
              'Rhythm in the Branches',
              undefined,
              newStatus.starsEarned
            );
            window.dispatchEvent(new CustomEvent('rami:profile-changed'));
            syncStarHeaderUi(newStatus);

            stepIndex = 0;
            const earnedNewStar = newStatus.starsEarned > prevStars;

            toastText.setText(
              earnedNewStar
                ? `🌟 Star ${newStatus.starsEarned} Earned! (${newStatus.starsVisual})\n${newStatus.progressBarLabel}`
                : `🎶 Melody Complete!\n${newStatus.progressBarLabel}`
            );
            toastContainer.setVisible(true).setScale(0.5);

            scene.tweens.add({
              targets: toastContainer,
              scale: 1,
              duration: 260,
              ease: 'Back.easeOut'
            });

            scene.time.delayedCall(earnedNewStar ? 1500 : 1050, () => {
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
