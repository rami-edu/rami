import type Phaser from 'phaser';
import {
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

const CRYSTALS = [
  { idx: 0, name: 'Emerald (1)', shortName: 'Emerald', x: -160, color: 0x52b788 },
  { idx: 1, name: 'Ruby (2)', shortName: 'Ruby', x: 0, color: 0xe63946 },
  { idx: 2, name: 'Sapphire (3)', shortName: 'Sapphire', x: 160, color: 0x4cc9f0 }
];

const ECHO_LEVELS: number[][] = [
  [0, 2, 1],             // Difficulty 1 (Star 1): 3 crystals
  [1, 0, 2, 0],          // Difficulty 2 (Star 2): 4 crystals
  [2, 1, 2, 0, 1],       // Difficulty 3 (Star 3): 5 crystals
  [0, 1, 2, 1, 0, 2],    // Difficulty 4 (Star 4): 6 crystals
  [2, 0, 1, 1, 2, 0, 1]  // Difficulty 5 (Star 5): 7 crystals
];

/**
 * Custom Star Requirements for Cave Echoes:
 * Redefines the standard exponential attempt requirements so that each Star
 * increases sequence difficulty (from 3-crystal echoes up to 7-crystal echoes)
 * rather than requiring exponentially more repetitions.
 */
export const CAVE_ECHOES_STAR_REQUIREMENTS: readonly StarLevelRequirement[] = [
  {
    star: 1,
    requiredSuccessfulAttempts: 1,
    difficultyTier: 1,
    requirementLabel: 'Difficulty 1 (3-Crystal Echo) — 1 solve for Star 1'
  },
  {
    star: 2,
    requiredSuccessfulAttempts: 2,
    difficultyTier: 2,
    requirementLabel: 'Difficulty 2 (4-Crystal Echo) — 2 solves for Star 2'
  },
  {
    star: 3,
    requiredSuccessfulAttempts: 3,
    difficultyTier: 3,
    requirementLabel: 'Difficulty 3 (5-Crystal Echo) — 3 solves for Star 3'
  },
  {
    star: 4,
    requiredSuccessfulAttempts: 4,
    difficultyTier: 4,
    requirementLabel: 'Difficulty 4 (6-Crystal Echo) — 4 solves for Star 4'
  },
  {
    star: 5,
    requiredSuccessfulAttempts: 5,
    difficultyTier: 5,
    requirementLabel: 'Difficulty 5 (7-Crystal Echo) — 5 solves for Star 5'
  }
];

interface CaveEchoesProfileLog {
  highestLevel: number;
  levelsCompleted: number;
  crystalsTappedCorrect: number;
  sequenceResets: number;
  lastPlayedAt: number | null;
  actionHistory: ActivityActionEntry[];
}

export class CaveEchoesActivity implements MinigameModule {
  private static readonly STORAGE_KEY = 'rami_activity_details_cave_echoes_v1';

  public readonly descriptor: MinigameDescriptor = {
    id: '01',
    title: 'Cave Echoes (The Clockwork Tower)',
    pillar: 'Logic (Memory)',
    description:
      'Memorize and repeat the glowing sequence on the ancient stalactites!',
    backgroundKey: 'bg_cave_echoes',
    backgroundUrl: './cave-echoes-background.jpg',
    knowledgeTags: ['logic', 'motor_skills', 'science'],
    parentGuide: {
      pedagogicalGoals:
        'Strengthens working memory capacity, visual attention, and sequential pattern reproduction without reading.',
      parentRecommendation:
        'Watch the glowing lights together with your child. Whisper the color or point to each crystal as it lights up to scaffold their memory.'
    }
  };

  private starRequirements: readonly StarLevelRequirement[] =
    CAVE_ECHOES_STAR_REQUIREMENTS;

  private recordsByProfile: Record<string, CaveEchoesProfileLog> = {};

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
      const raw = storage.getItem(CaveEchoesActivity.STORAGE_KEY);
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
        CaveEchoesActivity.STORAGE_KEY,
        JSON.stringify(this.recordsByProfile)
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  private ensureRecord(profileId: string): CaveEchoesProfileLog {
    if (!this.recordsByProfile[profileId]) {
      const fallbackCompleted =
        profileManager.getActiveProfile()?.id === profileId
          ? profileManager.getActiveProfile()?.progress['The Clockwork Tower']
              ?.completedCount ?? 0
          : 0;
      const initialStars = evaluateStarProgress(
        fallbackCompleted,
        this.starRequirements
      ).starsEarned;
      this.recordsByProfile[profileId] = {
        highestLevel: initialStars,
        levelsCompleted: fallbackCompleted,
        crystalsTappedCorrect: 0,
        sequenceResets: 0,
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
      .find((p) => p.id === pid)?.progress['The Clockwork Tower'];
    const totalSolved = Math.max(
      rec.levelsCompleted,
      profileProgress?.completedCount ?? 0
    );
    return evaluateStarProgress(totalSolved, this.starRequirements);
  }

  public recordCrystalTapped(
    level: number,
    tappedCrystal: string,
    expectedCrystal: string,
    isCorrect: boolean,
    stepNumber: number,
    totalSteps: number,
    profileId?: string
  ): void {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    rec.lastPlayedAt = Date.now();
    if (isCorrect) {
      rec.crystalsTappedCorrect += 1;
      rec.actionHistory.unshift({
        timestamp: rec.lastPlayedAt,
        level,
        description: `Tapped ${tappedCrystal} crystal (step ${stepNumber}/${totalSteps} on Difficulty ${level})`,
        outcome: 'progress'
      });
    } else {
      rec.sequenceResets += 1;
      rec.actionHistory.unshift({
        timestamp: rec.lastPlayedAt,
        level,
        description: `Tapped ${tappedCrystal} instead of ${expectedCrystal} (sequence reset on Difficulty ${level})`,
        outcome: 'mistake'
      });
    }
    if (rec.actionHistory.length > 25) {
      rec.actionHistory.length = 25;
    }
    this.saveToStorage();
  }

  public recordSequenceCompleted(
    level: number,
    crystalSequence: string[],
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
      description: `Recalled Level ${level} crystal sequence: ${crystalSequence.join(' → ')} (${starStatus.starsVisual} • ${rec.levelsCompleted} solved)`,
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
      .find((p) => p.id === pid)?.progress['The Clockwork Tower'];
    const starProgress = this.getStarProgress(pid);
    const levelsCompleted = starProgress.successfulAttempts;
    const starsEarned = starProgress.starsEarned;
    const totalActions = rec.crystalsTappedCorrect + rec.sequenceResets;

    const summaryText =
      levelsCompleted > 0 || totalActions > 0
        ? `Stars: ${starProgress.starsVisual} (${starsEarned}/${MAX_ACTIVITY_STARS}) • Echoes Recalled: ${levelsCompleted} • ${starProgress.progressBarLabel} • Crystals Tapped: ${rec.crystalsTappedCorrect} • Resets: ${rec.sequenceResets}`
        : `Stars: ${starProgress.starsVisual} (0/${MAX_ACTIVITY_STARS}) • ${starProgress.progressBarLabel} — No crystal sequences recalled yet.`;

    return {
      activityKey: 'The Clockwork Tower',
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
      mistakesCount: rec.sequenceResets,
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
        Math.min(dpr, (width - 24 * dpr) / 760, (height - 40 * dpr) / 500)
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
              (gameSize.height - 40 * curDpr) / 500
            )
          );
      }
    };
    scene.scale.on('resize', onResize);

    let step = 0;
    let transitioning = false;

    const bg = scene.add.rectangle(0, 0, 760, 490, 0x162418, 0.9);
    bg.setStrokeStyle(4, 0x52b788);

    const topicLogoKey = ActivityLogoLibrary.getTopicLogoTexture(
      scene,
      'memory_echoes'
    );
    const pillarLogoKey = ActivityLogoLibrary.getPillarLogoTexture(
      scene,
      'logic'
    );

    const headerTopicIcon = scene.add
      .image(-235, -198, topicLogoKey)
      .setDisplaySize(50, 50);

    const headerPillarIcon = scene.add
      .image(235, -198, pillarLogoKey)
      .setDisplaySize(44, 44);

    const title = scene.add
      .text(0, -206, 'Cave Echoes', {
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

    const status = scene.add
      .text(0, -88, '', {
        fontFamily: UI_FONT,
        fontSize: '16.5px',
        color: '#d8f3dc',
        align: 'center',
        wordWrap: { width: 700 }
      })
      .setOrigin(0.5);

    const feedback = scene.add
      .text(0, 102, '', {
        fontFamily: UI_FONT,
        fontSize: '21px',
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
      const idx = Math.max(
        0,
        Math.min(ECHO_LEVELS.length - 1, starStatus.activeDifficultyTier - 1)
      );
      return ECHO_LEVELS[idx];
    };

    const syncStarHeaderUi = (starStatus: StarProgressStatus) => {
      const spacedStars = starStatus.starsVisual.split('').join(' ');
      starsRowText.setText(
        `${spacedStars}   (${starStatus.starsEarned} / ${starStatus.maxStars} Stars)`
      );
      const targetFillW = Math.round(
        (BAR_WIDTH - 4) * starStatus.progressFraction
      );
      starBarFill.width = targetFillW;
      starBarLabel.setText(
        `${starStatus.progressBarLabel} • Difficulty ${starStatus.activeDifficultyTier}`
      );
    };

    const updateLevelHeader = () => {
      const starStatus = this.getStarProgress();
      syncStarHeaderUi(starStatus);
      const pattern = getCurrentPattern();
      const seqNames = pattern.map((idx) => CRYSTALS[idx].shortName).join(' → ');
      title.setText(
        `Cave Echoes — Star Level ${starStatus.starsEarned}/${starStatus.maxStars} (Difficulty ${starStatus.activeDifficultyTier})`
      );
      status.setText(`Repeat the ${pattern.length}-crystal sequence: ${seqNames}`);
      feedback
        .setText(`Progress: ${step} / ${pattern.length}`)
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
      status,
      feedback
    ]);

    for (const c of CRYSTALS) {
      const gem = scene.add
        .polygon(c.x, 0, [0, -45, 35, 0, 0, 45, -35, 0], c.color)
        .setStrokeStyle(3, 0xffffff)
        .setInteractive({ useHandCursor: true });

      const lbl = scene.add
        .text(c.x, 58, c.name, {
          fontFamily: UI_FONT,
          fontSize: '15px',
          color: '#ffffff',
          fontStyle: 'bold'
        })
        .setOrigin(0.5);

      gem.on('pointerdown', () => {
        if (transitioning) return;

        scene.tweens.add({
          targets: gem,
          scale: 1.2,
          duration: 100,
          yoyo: true
        });

        const starStatus = this.getStarProgress();
        const pattern = getCurrentPattern();
        const displayLevel = starStatus.activeDifficultyTier;
        const expectedCrystal = CRYSTALS[pattern[step]];

        if (c.idx === pattern[step]) {
          step++;
          this.recordCrystalTapped(
            displayLevel,
            c.shortName,
            expectedCrystal.shortName,
            true,
            step,
            pattern.length
          );

          if (step === pattern.length) {
            transitioning = true;
            const prevStars = starStatus.starsEarned;
            const crystalNames = pattern.map((i) => CRYSTALS[i].shortName);
            const newStatus = this.recordSequenceCompleted(
              displayLevel,
              crystalNames
            );
            profileManager.recordMinigameCompletion(
              'The Clockwork Tower',
              undefined,
              newStatus.starsEarned
            );
            window.dispatchEvent(new CustomEvent('rami:profile-changed'));
            syncStarHeaderUi(newStatus);

            step = 0;
            const earnedNewStar = newStatus.starsEarned > prevStars;

            toastText.setText(
              earnedNewStar
                ? `🌟 Star ${newStatus.starsEarned} Earned! (${newStatus.starsVisual})\n${newStatus.progressBarLabel}`
                : `🔮 Echo Complete!\n${newStatus.progressBarLabel}`
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
            feedback.setText(`Progress: ${step} / ${pattern.length}`);
            feedback.setColor('#80ed99');
          }
        } else {
          this.recordCrystalTapped(
            displayLevel,
            c.shortName,
            expectedCrystal.shortName,
            false,
            step + 1,
            pattern.length
          );
          step = 0;
          feedback.setText('Oops! Sequence reset — try again from the first crystal!');
          feedback.setColor('#ffadad');
        }
      });

      container.add([gem, lbl]);
    }

    container.add([toastContainer]);
  }
}

export const caveEchoesActivity = new CaveEchoesActivity();
export default caveEchoesActivity;
