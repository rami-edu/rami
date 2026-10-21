export interface MinigameDescriptor {
  id: string;
  title: string;
  pillar: string;
  description: string;
}

export interface MinigameModule {
  descriptor: MinigameDescriptor;
  launch: (scene: Phaser.Scene, onComplete: () => void) => void;
}

/**
 * On-demand Minigame Loader (replaces Godot's PCK ResourceLoader).
 * Uses Vite dynamic import() chunks so each minigame is downloaded only when
 * the player enters its portal, then cached in memory / browser cache.
 */
export class MinigameLoader {
  private cache = new Map<string, MinigameModule>();

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
}

export const minigameLoader = new MinigameLoader();
