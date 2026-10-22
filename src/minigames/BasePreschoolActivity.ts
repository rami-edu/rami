import type Phaser from 'phaser';
import {
  DEFAULT_STAR_REQUIREMENTS,
  evaluateStarProgress,
  MAX_ACTIVITY_STARS,
  type ActivityActionEntry,
  type ActivityChildDetails,
  type MinigameDescriptor,
  type MinigameModule,
  type ParentPedagogicalGuide,
  type StarLevelRequirement,
  type StarProgressStatus
} from '../managers/MinigameLoader';
import { profileManager, type AnimalAvatarId } from '../managers/ProfileManager';
import { ActivityBadgeLibrary, type KnowledgeTagId } from '../objects/ActivityKnowledgeTags';
import { ActivityLogoLibrary } from '../objects/ActivityLogoLibrary';
import { ActivityThemedBackgroundBuilder } from '../objects/ActivityThemedBackgroundBuilder';

export interface PreschoolActivityConfig {
  id: string;
  title: string;
  shortTitle: string;
  pillar: string;
  knowledgeTags: KnowledgeTagId[];
  description: string;
  parentGuide: ParentPedagogicalGuide;
  animalInstructor: AnimalAvatarId;
  backgroundKey: string;
  backgroundUrl: string;
  starRequirements?: readonly StarLevelRequirement[];
}

export interface ActivityProfileLog {
  highestLevel: number;
  levelsCompleted: number;
  totalActions: number;
  mistakesCount: number;
  lastPlayedAt: number | null;
  actionHistory: ActivityActionEntry[];
}

const UI_FONT =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/**
 * BasePreschoolActivity provides:
 * 1. Zero-reading visual UX for children ages 3-5.
 * 2. 5-Star scaffolded progression (0 to 5 stars, exponential or difficulty-based).
 * 3. Expressive animal instructor providing real-time visual encouragement.
 * 4. High-resolution activity logo and circular knowledge area badges.
 * 5. Full client-only persistence & detailed reporting for the Parent Dashboard.
 */
export abstract class BasePreschoolActivity implements MinigameModule {
  public readonly descriptor: MinigameDescriptor;
  protected starRequirements: readonly StarLevelRequirement[];
  protected recordsByProfile: Record<string, ActivityProfileLog> = {};
  private readonly storageKey: string;

  constructor(public readonly config: PreschoolActivityConfig) {
    this.descriptor = {
      id: config.id,
      title: config.title,
      shortTitle: config.shortTitle,
      pillar: config.pillar,
      knowledgeTags: config.knowledgeTags,
      description: config.description,
      parentGuide: config.parentGuide,
      animalInstructor: config.animalInstructor,
      backgroundKey: config.backgroundKey,
      backgroundUrl: config.backgroundUrl
    };
    this.starRequirements = config.starRequirements ?? DEFAULT_STAR_REQUIREMENTS;
    this.storageKey = `rami_preschool_activity_${config.id}_v1`;
    this.loadFromStorage();
  }

  public getStarRequirements(): readonly StarLevelRequirement[] {
    return this.starRequirements;
  }

  public setStarRequirements(requirements: readonly StarLevelRequirement[]): void {
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
      const raw = storage.getItem(this.storageKey);
      if (raw) {
        this.recordsByProfile = JSON.parse(raw);
      }
    } catch {
      this.recordsByProfile = {};
    }
  }

  protected saveToStorage(): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      storage.setItem(this.storageKey, JSON.stringify(this.recordsByProfile));
    } catch {
      // Ignore quota errors
    }
  }

  protected resolveProfileId(profileId?: string): string {
    return profileId ?? profileManager.getActiveProfile()?.id ?? 'default';
  }

  protected ensureRecord(profileId: string): ActivityProfileLog {
    if (!this.recordsByProfile[profileId]) {
      const fallbackCompleted =
        profileManager.getActiveProfile()?.id === profileId
          ? profileManager.getActiveProfile()?.progress[this.descriptor.title]
              ?.completedCount ?? 0
          : 0;
      const initialStars = evaluateStarProgress(
        fallbackCompleted,
        this.starRequirements
      ).starsEarned;

      this.recordsByProfile[profileId] = {
        highestLevel: initialStars,
        levelsCompleted: fallbackCompleted,
        totalActions: 0,
        mistakesCount: 0,
        lastPlayedAt: null,
        actionHistory: []
      };
    }
    return this.recordsByProfile[profileId];
  }

  public getStarProgress(profileId?: string): StarProgressStatus {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    const profileProgress = profileManager
      .getAllProfiles()
      .find((p) => p.id === pid)?.progress[this.descriptor.title];
    const totalSolved = Math.max(
      rec.levelsCompleted,
      profileProgress?.completedCount ?? 0
    );
    return evaluateStarProgress(totalSolved, this.starRequirements);
  }

  public recordAction(
    description: string,
    outcome: 'progress' | 'completed' | 'mistake',
    profileId?: string
  ): void {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    rec.totalActions += 1;
    if (outcome === 'mistake') rec.mistakesCount += 1;
    rec.lastPlayedAt = Date.now();

    rec.actionHistory.unshift({
      timestamp: rec.lastPlayedAt,
      level: rec.highestLevel,
      description,
      outcome
    });
    if (rec.actionHistory.length > 25) {
      rec.actionHistory.length = 25;
    }
    this.saveToStorage();
  }

  public recordSolvedInstance(
    description: string,
    profileId?: string
  ): StarProgressStatus {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    rec.levelsCompleted += 1;
    rec.totalActions += 1;
    rec.lastPlayedAt = Date.now();

    const starStatus = evaluateStarProgress(
      rec.levelsCompleted,
      this.starRequirements
    );
    rec.highestLevel = starStatus.starsEarned;

    rec.actionHistory.unshift({
      timestamp: rec.lastPlayedAt,
      level: starStatus.starsEarned,
      description: `${description} (${starStatus.starsVisual} • ${rec.levelsCompleted} solved)`,
      outcome: 'completed'
    });
    if (rec.actionHistory.length > 25) {
      rec.actionHistory.length = 25;
    }
    this.saveToStorage();

    profileManager.recordMinigameCompletion(
      this.descriptor.title,
      pid,
      starStatus.starsEarned
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rami:profile-changed'));
    }

    return starStatus;
  }

  public getActivityDetails(profileId?: string): ActivityChildDetails {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    const profileProgress = profileManager
      .getAllProfiles()
      .find((p) => p.id === pid)?.progress[this.descriptor.title];
    const starProgress = this.getStarProgress(pid);
    const levelsCompleted = starProgress.successfulAttempts;
    const starsEarned = starProgress.starsEarned;

    const summaryText =
      levelsCompleted > 0 || rec.totalActions > 0
        ? `Stars: ${starProgress.starsVisual} (${starsEarned}/${MAX_ACTIVITY_STARS}) • Solved: ${levelsCompleted} instances • ${starProgress.progressBarLabel}`
        : `Stars: ${starProgress.starsVisual} (0/${MAX_ACTIVITY_STARS}) • ${starProgress.progressBarLabel} — Ready to play!`;

    return {
      activityKey: this.descriptor.title,
      activityTitle: this.descriptor.title,
      pillar: this.descriptor.pillar,
      knowledgeTags: this.descriptor.knowledgeTags,
      parentGuide: this.descriptor.parentGuide,
      description: this.descriptor.description,
      starsEarned,
      maxStars: MAX_ACTIVITY_STARS,
      starsVisual: starProgress.starsVisual,
      starProgress,
      highestLevel: starsEarned,
      levelsCompleted,
      totalActions: rec.totalActions,
      mistakesCount: rec.mistakesCount,
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

  /**
   * Launch implementation: builds standardized UI frame (logo, badges, stars,
   * progress bar, animal instructor, return button) and delegates gameplay to `setupGameplay`.
   */
  public launch(scene: Phaser.Scene, _onComplete: () => void): void {
    const { width, height } = scene.scale;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    const computeScale = (w: number, h: number, curDpr: number): number => {
      // Scale up so the foreground activity fills the screen generously (92-96% fill),
      // commanding the foreground rather than floating as a tiny card on the background.
      const fitScaleW = (w - 56 * curDpr) / 780;
      const fitScaleH = (h - 36 * curDpr) / 510;
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

    // Frame backdrop
    const bg = scene.add.rectangle(0, 0, 780, 500, 0x142217, 0.94);
    bg.setStrokeStyle(4, 0x52b788);

    // Activity Logo (256x256 vector procedural canvas)
    const logoKey = ActivityLogoLibrary.getActivityLogoTexture(
      scene,
      this.config.id
    );
    const logoImg = scene.add.image(-270, -196, logoKey).setDisplaySize(62, 62);

    // Title
    const titleText = scene.add
      .text(0, -208, this.descriptor.shortTitle || this.descriptor.title, {
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    // Knowledge Badges (circular iconic badges)
    const badgesContainer = scene.add.container(260, -196);
    (this.descriptor.knowledgeTags || []).forEach((tagId, idx) => {
      const badgeKey = ActivityBadgeLibrary.getKnowledgeTagBadgeTexture(
        scene,
        tagId
      );
      const badgeImg = scene.add
        .image(-idx * 40, 0, badgeKey)
        .setDisplaySize(36, 36)
        .setInteractive({ useHandCursor: true });
      badgesContainer.add(badgeImg);
    });

    // 5 Stars Display
    const starsRowText = scene.add
      .text(0, -172, '', {
        fontFamily: UI_FONT,
        fontSize: '26px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    // Progress Bar toward next star
    const BAR_WIDTH = 440;
    const BAR_HEIGHT = 15;
    const starBarBg = scene.add
      .rectangle(0, -142, BAR_WIDTH, BAR_HEIGHT, 0x0a160d, 0.96)
      .setStrokeStyle(2, 0x52b788);

    const starBarFill = scene.add
      .rectangle(-BAR_WIDTH / 2 + 2, -142, 0, BAR_HEIGHT - 4, 0x80ed99, 1)
      .setOrigin(0, 0.5);

    // Animal Instructor (Top corner visual companion) with dedicated Scholar Instructor Hat
    const instructorContainer = scene.add.container(-310, 20);
    const instructorGlow = scene.add
      .circle(0, 0, 42, 0xffd166, 0.2)
      .setStrokeStyle(2, 0xffd166, 0.6);
    const instructorImg = scene.add
      .image(0, 0, `avatar_${this.descriptor.animalInstructor}`)
      .setDisplaySize(68, 68);
    const instructorFeedbackBubble = scene.add
      .text(0, 52, '✨', { fontSize: '24px' })
      .setOrigin(0.5)
      .setAlpha(0);

    const hat = this.buildInstructorHat(
      scene,
      this.descriptor.animalInstructor ?? 'owl'
    );

    instructorContainer.add([
      instructorGlow,
      instructorImg,
      hat.hatContainer,
      instructorFeedbackBubble
    ]);

    // Instructor calm, subtle breathing animation (barely perceptible scale, slow cycle)
    scene.tweens.add({
      targets: instructorImg,
      scaleY: 1.015,
      scaleX: 0.99,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const triggerInstructorCheer = (isBigCelebration = false) => {
      hat.cheerHat(isBigCelebration);

      // Gentle, subtle nod (only 3-4px gentle lift, no large scaling or harsh bounces)
      scene.tweens.add({
        targets: instructorContainer,
        y: 16,
        scale: isBigCelebration ? 1.03 : 1.015,
        duration: 280,
        yoyo: true,
        repeat: 0,
        ease: 'Sine.easeInOut'
      });

      scene.tweens.add({
        targets: instructorGlow,
        alpha: 0.45,
        duration: 280,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });

      instructorFeedbackBubble.setText(isBigCelebration ? '🌟' : '✨');
      instructorFeedbackBubble.setPosition(0, 50).setAlpha(0.85).setScale(0.9);
      scene.tweens.add({
        targets: instructorFeedbackBubble,
        y: 44,
        alpha: 0,
        duration: 1100,
        ease: 'Sine.easeOut'
      });
    };

    // Star / Level Completion Toast Notification
    const toastContainer = scene.add
      .container(0, -10)
      .setDepth(130)
      .setVisible(false)
      .setScale(0.5);

    const toastBg = scene.add
      .rectangle(0, 0, 520, 110, 0x1b4332, 0.98)
      .setStrokeStyle(4, 0xffd166);

    const toastText = scene.add
      .text(0, 0, '', {
        fontFamily: UI_FONT,
        fontSize: '20px',
        color: '#fff3b0',
        fontStyle: 'bold',
        align: 'center'
      })
      .setOrigin(0.5);

    toastContainer.add([toastBg, toastText]);

    const syncStarHeaderUi = (status: StarProgressStatus) => {
      const spacedStars = status.starsVisual.split('').join(' ');
      starsRowText.setText(spacedStars);
      const targetFillW = Math.round(
        (BAR_WIDTH - 4) * status.progressFraction
      );
      starBarFill.width = targetFillW;
    };

    syncStarHeaderUi(this.getStarProgress());

    container.add(bg);

    // Build dedicated themed house design & interior decorations (e.g. geometric trusses,
    // honeycomb tiles, diamond windows, mandala carvings for Geometry Nest)
    ActivityThemedBackgroundBuilder.buildActivityHouseDecorations(
      scene,
      container,
      this.config.id
    );

    container.add([
      logoImg,
      titleText,
      badgesContainer,
      starsRowText,
      starBarBg,
      starBarFill,
      instructorContainer,
      toastContainer
    ]);

    const playAreaContainer = scene.add.container(0, 45);
    container.add(playAreaContainer);

    // Delegate to subclass/instance to build the intuitive preschool puzzle area
    this.setupGameplay({
      scene,
      container,
      playArea: playAreaContainer,
      onInstanceSolved: (desc: string) => {
        const prevStars = this.getStarProgress().starsEarned;
        const newStatus = this.recordSolvedInstance(desc);
        syncStarHeaderUi(newStatus);

        const earnedNewStar = newStatus.starsEarned > prevStars;
        triggerInstructorCheer(earnedNewStar);

        toastText.setText(
          earnedNewStar
            ? `🌟 Star ${newStatus.starsEarned} Earned! (${newStatus.starsVisual})\n${newStatus.progressBarLabel}`
            : `🎉 Great job!\n${newStatus.progressBarLabel}`
        );
        toastContainer.setVisible(true).setScale(0.5);
        scene.tweens.add({
          targets: toastContainer,
          scale: 1,
          duration: 250,
          ease: 'Back.easeOut'
        });

        scene.time.delayedCall(earnedNewStar ? 1400 : 950, () => {
          if (!container.active) return;
          toastContainer.setVisible(false);
          this.advanceNextInstance();
        });
      },
      onWrongAttempt: (desc: string) => {
        this.recordAction(desc, 'mistake');
        scene.tweens.add({
          targets: instructorImg,
          rotation: 0.04,
          duration: 160,
          yoyo: true,
          repeat: 0,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  /**
   * Constructs the scholar mortarboard instructor hat to indicate the animal's
   * teacher/instructor condition, complete with academic cap, 3D bevel, center button,
   * golden dangling tassel, and golden instructor star crest.
   */
  private buildInstructorHat(
    scene: Phaser.Scene,
    animalId: string
  ): {
    hatContainer: Phaser.GameObjects.Container;
    cheerHat: (isBig: boolean) => void;
  } {
    const INSTRUCTOR_HAT_CONFIG: Record<
      string,
      { x: number; y: number; angle: number; scale: number }
    > = {
      dino: { x: -3, y: -33, angle: -6, scale: 0.95 },
      owl: { x: 0, y: -34, angle: 0, scale: 1.0 },
      fox: { x: 0, y: -32, angle: 2, scale: 0.95 },
      raccoon: { x: 0, y: -32, angle: -2, scale: 0.95 },
      bear: { x: 0, y: -33, angle: 0, scale: 1.0 },
      otter: { x: 0, y: -30, angle: 3, scale: 0.95 }
    };

    const config = INSTRUCTOR_HAT_CONFIG[animalId] ?? {
      x: 0,
      y: -32,
      angle: 0,
      scale: 1.0
    };

    const hatContainer = scene.add
      .container(config.x, config.y)
      .setScale(config.scale)
      .setAngle(config.angle)
      .setDepth(15);

    // 1. Hat Base (Fitted skull cap sitting on animal crown)
    const skullCap = scene.add
      .ellipse(0, 5, 30, 11, 0x141f2e, 1)
      .setStrokeStyle(1.5, 0xffd166);

    // 2. Mortarboard 3D bevel / underside shadow rim
    const bevel = scene.add.polygon(
      0,
      0,
      [-27, -2, 0, 8, 27, -2, 27, 2, 0, 12, -27, 2],
      0x0c141d,
      1
    );

    // 3. Mortarboard Diamond Top (academic square scholar cap viewed in isometric perspective)
    const board = scene.add
      .polygon(0, 0, [0, -12, 27, -2, 0, 8, -27, -2], 0x1b2838, 1)
      .setStrokeStyle(2, 0xffd166);

    // 4. Center Golden Button / Stud
    const button = scene.add
      .circle(0, -2, 3.5, 0xffd166)
      .setStrokeStyle(1, 0xffffff);

    // 5. Dangling Golden Tassel (draped from center over the right corner)
    const tasselContainer = scene.add.container(0, -2);

    const tasselCord = scene.add.graphics();
    tasselCord.lineStyle(2, 0xffd166, 1);
    tasselCord.beginPath();
    tasselCord.moveTo(0, 0);
    tasselCord.lineTo(16, 4);
    tasselCord.lineTo(19, 14);
    tasselCord.strokePath();

    const tasselBead = scene.add.circle(19, 14, 2, 0xffe66d);

    // Tassel fringe / bell
    const tasselFringe = scene.add
      .polygon(19, 19, [0, -4, 4.5, 6, -4.5, 6], 0xffb703)
      .setStrokeStyle(1, 0xffd166);

    tasselContainer.add([tasselCord, tasselBead, tasselFringe]);

    // 6. Instructor Condition Star Crest on the front of the cap
    const crestStar = scene.add
      .text(0, 4, '★', {
        fontFamily: UI_FONT,
        fontSize: '11px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    hatContainer.add([
      skullCap,
      bevel,
      board,
      button,
      tasselContainer,
      crestStar
    ]);

    // Idle tassel sway
    scene.tweens.add({
      targets: tasselContainer,
      angle: { from: -5, to: 5 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const cheerHat = (isBig: boolean) => {
      // Celebratory hat tip and cheerful bounce
      scene.tweens.add({
        targets: hatContainer,
        y: config.y - (isBig ? 7 : 4),
        angle: config.angle + (isBig ? -14 : -8),
        duration: 220,
        yoyo: true,
        ease: 'Back.easeOut'
      });

      scene.tweens.add({
        targets: tasselContainer,
        angle: isBig ? 24 : 14,
        duration: 240,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });

      scene.tweens.add({
        targets: crestStar,
        scale: 1.35,
        duration: 220,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    };

    return { hatContainer, cheerHat };
  }

  /**
   * Abstract hook for each activity to construct its non-verbal preschool puzzle pieces & slots.
   */
  protected abstract setupGameplay(context: {
    scene: Phaser.Scene;
    container: Phaser.GameObjects.Container;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  }): void;

  /**
   * Hook called when an instance is finished to refresh the puzzle pieces/targets.
   */
  protected abstract advanceNextInstance(): void;
}
