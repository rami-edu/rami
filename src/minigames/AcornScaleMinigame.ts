import type Phaser from 'phaser';
import type {
  ActivityActionEntry,
  ActivityChildDetails,
  MinigameDescriptor,
  MinigameModule
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
  { level: 2, targetWeight: 5, hint: 'Level 2: Match the forest stone of weight 5!' },
  { level: 3, targetWeight: 7, hint: 'Level 3: Balance the heavy river boulder of weight 7!' },
  { level: 4, targetWeight: 9, hint: 'Level 4: Match the ancient root stone of weight 9!' },
  { level: 5, targetWeight: 12, hint: 'Master Level 5: Balance the golden boulder of weight 12!' }
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
    backgroundUrl: './minigame-background.jpg'
  };

  private recordsByProfile: Record<string, AcornProfileLog> = {};

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
      const fallbackHigh =
        profileManager.getActiveProfile()?.id === profileId
          ? profileManager.getActiveProfile()?.progress['Acorn Scale']
              ?.highestLevel ?? 0
          : 0;
      this.recordsByProfile[profileId] = {
        highestLevel: fallbackHigh,
        levelsCompleted: fallbackHigh,
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
  ): void {
    const pid = this.resolveProfileId(profileId);
    const rec = this.ensureRecord(pid);
    rec.levelsCompleted += 1;
    rec.highestLevel = Math.max(rec.highestLevel, level);
    rec.lastPlayedAt = Date.now();
    rec.actionHistory.unshift({
      timestamp: rec.lastPlayedAt,
      level,
      description: `Balanced rock of weight ${targetWeight} with ${targetWeight} acorns (Level ${level} solved)`,
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
      .find((p) => p.id === pid)?.progress['Acorn Scale'];
    const highestLevel = Math.max(
      rec.highestLevel,
      profileProgress?.highestLevel ?? 0
    );
    const levelsCompleted = Math.max(
      rec.levelsCompleted,
      profileProgress?.completedCount ?? 0
    );
    const totalActions = rec.acornsAddedCount + rec.acornsRemovedCount;

    const summaryText =
      levelsCompleted > 0 || totalActions > 0
        ? `Highest Level: ${highestLevel} • Equations Balanced: ${levelsCompleted} • Acorns Placed: ${rec.acornsAddedCount} • Scale Adjustments: ${rec.acornsRemovedCount}`
        : 'No activity recorded yet — child has not balanced any rocks on the Acorn Scale.';

    return {
      activityKey: 'Acorn Scale',
      activityTitle: this.descriptor.title,
      pillar: this.descriptor.pillar,
      description: this.descriptor.description,
      highestLevel,
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

    const topicLogoKey = ActivityLogoLibrary.getTopicLogoTexture(
      scene,
      'balance_equations'
    );
    const pillarLogoKey = ActivityLogoLibrary.getPillarLogoTexture(
      scene,
      'solving'
    );

    const headerTopicIcon = scene.add
      .image(-215, -188, topicLogoKey)
      .setDisplaySize(52, 52);

    const headerPillarIcon = scene.add
      .image(215, -188, pillarLogoKey)
      .setDisplaySize(44, 44);

    const title = scene.add
      .text(0, -190, 'Acorn Scale — Level 1', {
        fontFamily: UI_FONT,
        fontSize: '26px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(0, -145, '', {
        fontFamily: UI_FONT,
        fontSize: '18px',
        color: '#d8f3dc'
      })
      .setOrigin(0.5);

    const statusText = scene.add
      .text(0, 20, '', {
        fontFamily: UI_FONT,
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

    const getTargetWeightForIndex = (idx: number): number => {
      const currentDef = LEVELS[idx % LEVELS.length];
      return currentDef.targetWeight + Math.floor(idx / LEVELS.length) * 2;
    };

    const showLevelCompleteToast = (
      completedLvl: number,
      targetWeight: number,
      nextLvl: number
    ) => {
      transitioning = true;
      this.recordLevelBalanced(completedLvl, targetWeight);
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
      const displayLevel = levelIndex + 1;
      const targetWeight = getTargetWeightForIndex(levelIndex);

      title.setText(`Acorn Scale — Level ${displayLevel}`);
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
        const finishedLevel = displayLevel;
        levelIndex += 1;
        showLevelCompleteToast(finishedLevel, targetWeight, levelIndex + 1);
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
          const displayLevel = levelIndex + 1;
          const targetWeight = getTargetWeightForIndex(levelIndex);
          this.recordAcornAdded(displayLevel, currentAcorns, targetWeight);
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
          const displayLevel = levelIndex + 1;
          const targetWeight = getTargetWeightForIndex(levelIndex);
          this.recordAcornRemoved(displayLevel, currentAcorns, targetWeight);
          updateScale();
        }
      });

    container.add([
      bg,
      headerTopicIcon,
      headerPillarIcon,
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
}

export const acornScaleActivity = new AcornScaleActivity();
export default acornScaleActivity;
