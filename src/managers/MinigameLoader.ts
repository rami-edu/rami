export interface MinigameDescriptor {
  id: string;
  title: string;
  pillar: string;
  description: string;
  backgroundKey: string;
  backgroundUrl: string;
}

export interface ActivityActionEntry {
  timestamp: number;
  level: number;
  description: string;
  outcome: 'progress' | 'completed' | 'mistake';
}

export interface ActivityChildDetails {
  activityKey: string;
  activityTitle: string;
  pillar: string;
  description: string;
  highestLevel: number;
  levelsCompleted: number;
  totalActions: number;
  mistakesCount: number;
  lastPlayedAt: number | null;
  summaryText: string;
  actionHistory: ActivityActionEntry[];
}

export interface MinigameModule {
  descriptor: MinigameDescriptor;
  launch: (scene: Phaser.Scene, onComplete: () => void) => void;
  getActivityDetails: (profileId?: string) => ActivityChildDetails;
  resetActivityDetails?: (profileId?: string) => void;
}

/**
 * On-demand Minigame Loader (replaces Godot's PCK ResourceLoader).
 * Uses Vite dynamic import() chunks so each minigame is downloaded only when
 * the player enters its portal, then cached in memory / browser cache.
 */
export class MinigameLoader {
  private cache = new Map<string, MinigameModule>();

  public static readonly ACTIVITY_KEYS = [
    'Acorn Scale',
    'Rhythm in the Branches',
    'The Clockwork Tower'
  ] as const;

  private registry: Record<string, () => Promise<{ default: MinigameModule }>> = {
    'Acorn Scale': () => import('../minigames/AcornScaleMinigame'),
    'Rhythm in the Branches': () => import('../minigames/RhythmBranchesMinigame'),
    'The Clockwork Tower': () => import('../minigames/CaveEchoesMinigame')
  };

  public isCached(minigameName: string): boolean {
    return this.cache.has(minigameName);
  }

  public async loadMinigame(
    minigameName: string,
    onProgress?: (progress: number) => void
  ): Promise<MinigameModule> {
    if (this.cache.has(minigameName)) {
      onProgress?.(1.0);
      return this.cache.get(minigameName)!;
    }

    onProgress?.(0.25);
    const importer =
      this.registry[minigameName] ??
      (() => import('../minigames/AcornScaleMinigame'));

    const mod = await importer();
    onProgress?.(1.0);
    this.cache.set(minigameName, mod.default);
    return mod.default;
  }

  public async loadAllActivities(): Promise<MinigameModule[]> {
    const modules: MinigameModule[] = [];
    for (const key of MinigameLoader.ACTIVITY_KEYS) {
      const mod = await this.loadMinigame(key);
      modules.push(mod);
    }
    return modules;
  }
}

export const minigameLoader = new MinigameLoader();
