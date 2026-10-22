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

interface AcornLevel {
  level: number;
  targetWeight: number;
  hint: string;
}

interface AcornProfileLog {
  highestLevel: number;
  levelsCompleted: number;
  acornsAddedCount: number;
  acornsRemovedCount: number;
  lastPlayedAt: number | null;
  actionHistory: ActivityActionEntry[];
}

const UI_FONT =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const LEVELS: AcornLevel[] = [
  { level: 1, targetWeight: 3, hint: 'Warm-up! Add 3 acorns to balance the pebble.' },
  { level: 2, targetWeight: 5, hint: 'Match the forest stone of weight 5!' },
  { level: 3, targetWeight: 7, hint: 'Balance the heavy river boulder of weight 7!' },
  { level: 4, targetWeight: 9, hint: 'Match the ancient root stone of weight 9!' },
  { level: 5, targetWeight: 12, hint: 'Balance the golden boulder of weight 12!' }
];

export class AcornScaleActivity implements MinigameModule {
  private static readonly STORAGE_KEY = 'rami_activity_details_acorn_scale_v1';

  public readonly descriptor: MinigameDescriptor = {
    id: '07',
    title: 'Acorn Scale',
    pillar: 'Solving (Math)',
    description:
      'Visual equations: Place the exact number of acorns on the scale to match the rock weight!',
    backgroundKey: 'bg_acorn_scale',
    backgroundUrl: './bg-acorn-scale.jpg',
    knowledgeTags: ['mathematics', 'motor_skills', 'science'],
    parentGuide: {
      pedagogicalGoals:
        'Cultivates early intuitive equality, one-to-one counting, and mass conservation without requiring written numerals or equation signs.',
      parentRecommendation:
        'Encourage your preschooler to watch how the balance beam responds with every acorn added. Ask them: "Which side is heavier right now?" and celebrate when the beam settles horizontal.'
    },
    animalInstructor: 'bear'
  };

  /**
   * Standard exponential star requirements (1, 10, 100, 1,000, 10,000 successful attempts).
   * Can be redefined via `setStarRequirements()` or subclass override.
   */
  private starRequirements: readonly StarLevelRequirement[] =
    DEFAULT_STAR_REQUIREMENTS;

  private recordsByProfile: Record<string, AcornProfileLog> = {};

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
      const raw = storage.getItem(AcornScaleActivity.STORAGE_KEY);
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
        AcornScaleActivity.STORAGE_KEY,
        JSON.stringify(this.recordsByProfile)
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  private ensureRecord(profileId: string): AcornProfileLog {
    if (!this.recordsByProfile[profileId]) {
      const fallbackCompleted =
        profileManager.getActiveProfile()?.id === profileId
          ? profileManager.getActiveProfile()?.progress['Acorn Scale']
              ?.completedCount ?? 0
          : 0;
      const initialStars = evaluateStarProgress(
        fallbackCompleted,
        this.starRequirements
      ).starsEarned;
      this.recordsByProfile[profileId] = {
        highestLevel: initialStars,
        levelsCompleted: fallbackCompleted,
        acornsAddedCount: 0,
        acornsRemovedCount: 0,
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
      .find((p) => p.id === pid)?.progress['Acorn Scale'];
    const totalSolved = Math.max(
      rec.levelsCompleted,
      profileProgress?.completedCount ?? 0
    );
    return evaluateStarProgress(totalSolved, this.starRequirements);
  }

  public recordAcornAdded(
    level: number,
    currentAcorns: number,
    targetWeight: number,
    profileId?: string
  ): void {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    rec.acornsAddedCount += 1;
    rec.lastPlayedAt = Date.now();
    const isOverweight = currentAcorns > targetWeight;
    rec.actionHistory.unshift({
      timestamp: rec.lastPlayedAt,
      level,
      description: isOverweight
        ? `Added acorn #${currentAcorns} (over target weight ${targetWeight})`
        : `Placed acorn #${currentAcorns} toward rock weight ${targetWeight}`,
      outcome: isOverweight ? 'mistake' : 'progress'
    });
    if (rec.actionHistory.length > 25) {
      rec.actionHistory.length = 25;
    }
    this.saveToStorage();
  }

  public recordAcornRemoved(
    level: number,
    remainingAcorns: number,
    targetWeight: number,
    profileId?: string
  ): void {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    rec.acornsRemovedCount += 1;
    rec.lastPlayedAt = Date.now();
    rec.actionHistory.unshift({
      timestamp: rec.lastPlayedAt,
      level,
      description: `Removed 1 acorn (adjusted scale to ${remainingAcorns} vs rock weight ${targetWeight})`,
      outcome: 'mistake'
    });
    if (rec.actionHistory.length > 25) {
      rec.actionHistory.length = 25;
    }
    this.saveToStorage();
  }

  public recordLevelBalanced(
    level: number,
    targetWeight: number,
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
      description: `Balanced rock of weight ${targetWeight} with ${targetWeight} acorns (Tier ${level} • ${starStatus.starsVisual} • ${rec.levelsCompleted} solved)`,
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
      .find((p) => p.id === pid)?.progress['Acorn Scale'];
    const starProgress = this.getStarProgress(pid);
    const levelsCompleted = starProgress.successfulAttempts;
    const starsEarned = starProgress.starsEarned;
    const totalActions = rec.acornsAddedCount + rec.acornsRemovedCount;

    const summaryText =
      levelsCompleted > 0 || totalActions > 0
        ? `Stars: ${starProgress.starsVisual} (${starsEarned}/${MAX_ACTIVITY_STARS}) • Equations Balanced: ${levelsCompleted} • ${starProgress.progressBarLabel} • Acorns Placed: ${rec.acornsAddedCount} • Adjustments: ${rec.acornsRemovedCount}`
        : `Stars: ${starProgress.starsVisual} (0/${MAX_ACTIVITY_STARS}) • ${starProgress.progressBarLabel} — No equations solved yet.`;

    return {
      activityKey: 'Acorn Scale',
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
      mistakesCount: rec.acornsRemovedCount,
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

    let currentAcorns = 0;
    let transitioning = false;

    const bg = scene.add.rectangle(0, 0, 760, 490, 0x162418, 0.9);
    bg.setStrokeStyle(4, 0x52b788);

    const topicLogoKey = ActivityLogoLibrary.getTopicLogoTexture(
      scene,
      'balance_equations'
    );
    const pillarLogoKey = ActivityLogoLibrary.getPillarLogoTexture(
      scene,
      'solving'
    );

    const headerTopicIcon = scene.add
      .image(-235, -198, topicLogoKey)
      .setDisplaySize(50, 50);

    const headerPillarIcon = scene.add
      .image(235, -198, pillarLogoKey)
      .setDisplaySize(44, 44);

    const title = scene.add
      .text(0, -206, 'Acorn Scale', {
        fontFamily: UI_FONT,
        fontSize: '25px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const starsRowText = scene.add
      .text(0, -172, '', {
        fontFamily: UI_FONT,
        fontSize: '26px',
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

    const subtitle = scene.add
      .text(0, -92, '', {
        fontFamily: UI_FONT,
        fontSize: '19px',
        color: '#d8f3dc'
      })
      .setOrigin(0.5);

    const statusText = scene.add
      .text(0, 46, '', {
        fontFamily: UI_FONT,
        fontSize: '32px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const beam = scene.add.rectangle(0, -18, 480, 20, 0x74c69d);
    const pivot = scene.add.triangle(0, 18, 0, -35, -30, 24, 30, 24, 0x52b788);

    // Star / Instance Completion Notification Banner
    const toastContainer = scene.add
      .container(0, -20)
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

    const getTargetWeightForSolvedCount = (solvedCount: number): number => {
      const currentDef = LEVELS[solvedCount % LEVELS.length];
      return (
        currentDef.targetWeight +
        Math.floor((solvedCount % 15) / LEVELS.length) * 2
      );
    };

    const syncStarHeaderUi = (status: StarProgressStatus) => {
      const spacedStars = status.starsVisual.split('').join(' ');
      starsRowText.setText(spacedStars);
      const targetFillW = Math.round(
        (BAR_WIDTH - 4) * status.progressFraction
      );
      starBarFill.width = targetFillW;
    };

    const showCompletionToast = (
      targetWeight: number,
      prevStars: number,
      newStatus: StarProgressStatus
    ) => {
      transitioning = true;
      profileManager.recordMinigameCompletion(
        'Acorn Scale',
        undefined,
        newStatus.starsEarned
      );
      window.dispatchEvent(new CustomEvent('rami:profile-changed'));
      syncStarHeaderUi(newStatus);

      const earnedNewStar = newStatus.starsEarned > prevStars;
      if (earnedNewStar) {
        toastText.setText(
          `🌟 Star ${newStatus.starsEarned} Earned! (${newStatus.starsVisual})\n${newStatus.progressBarLabel}`
        );
      } else {
        toastText.setText(
          `✨ Balanced ${targetWeight} = ${targetWeight}!\n${newStatus.progressBarLabel}`
        );
      }

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
        currentAcorns = 0;
        transitioning = false;
        updateScale();
      });
    };

    const updateScale = () => {
      const starStatus = this.getStarProgress();
      syncStarHeaderUi(starStatus);

      const solvedCount = starStatus.successfulAttempts;
      const targetWeight = getTargetWeightForSolvedCount(solvedCount);

      title.setText('Acorn Scale');
      subtitle.setText(
        `Match the rock of weight [${targetWeight}] with acorns!`
      );
      statusText.setText(
        `🪨 Rock: ${targetWeight}    vs   🌰 Acorns: ${currentAcorns}`
      );

      const diff = Math.max(-5, Math.min(5, currentAcorns - targetWeight));
      beam.setAngle(diff * 4);

      if (currentAcorns === targetWeight && !transitioning) {
        statusText.setText(`✨ Balanced! ${targetWeight} = ${currentAcorns} ✨`);
        statusText.setColor('#80ed99');
        const prevStars = starStatus.starsEarned;
        const nextStatus = this.recordLevelBalanced(
          starStatus.activeDifficultyTier,
          targetWeight
        );
        showCompletionToast(targetWeight, prevStars, nextStatus);
      } else {
        statusText.setColor('#ffd166');
      }
    };

    updateScale();

    const addBtn = scene.add
      .text(-120, 118, '➕ Add Acorn', {
        fontFamily: UI_FONT,
        fontSize: '24px',
        backgroundColor: '#2d6a4f',
        color: '#ffffff',
        padding: { x: 22, y: 12 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (transitioning) return;
        if (currentAcorns < 25) {
          currentAcorns++;
          const starStatus = this.getStarProgress();
          const targetWeight = getTargetWeightForSolvedCount(
            starStatus.successfulAttempts
          );
          this.recordAcornAdded(
            starStatus.activeDifficultyTier,
            currentAcorns,
            targetWeight
          );
          updateScale();
        }
      });

    const removeBtn = scene.add
      .text(120, 118, '➖ Remove', {
        fontFamily: UI_FONT,
        fontSize: '24px',
        backgroundColor: '#3a5a40',
        color: '#ffffff',
        padding: { x: 22, y: 12 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (transitioning) return;
        if (currentAcorns > 0) {
          currentAcorns--;
          const starStatus = this.getStarProgress();
          const targetWeight = getTargetWeightForSolvedCount(
            starStatus.successfulAttempts
          );
          this.recordAcornRemoved(
            starStatus.activeDifficultyTier,
            currentAcorns,
            targetWeight
          );
          updateScale();
        }
      });

    container.add([
      bg,
      headerTopicIcon,
      headerPillarIcon,
      title,
      starsRowText,
      starBarBg,
      starBarFill,
      subtitle,
      beam,
      pivot,
      statusText,
      addBtn,
      removeBtn,
      toastContainer
    ]);
  }
}

export const acornScaleActivity = new AcornScaleActivity();
export default acornScaleActivity;
