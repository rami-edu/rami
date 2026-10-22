import type { KnowledgeTagId } from '../objects/ActivityKnowledgeTags';

export interface ParentPedagogicalGuide {
  pedagogicalGoals: string;
  parentRecommendation: string;
}

export interface MinigameDescriptor {
  id: string;
  title: string;
  shortTitle?: string;
  pillar: string;
  description: string;
  backgroundKey: string;
  backgroundUrl: string;
  knowledgeTags?: readonly KnowledgeTagId[];
  parentGuide?: ParentPedagogicalGuide;
  animalInstructor?: string;
}

export const MAX_ACTIVITY_STARS = 5;

export const STANDARD_STAR_THRESHOLDS: readonly [
  number,
  number,
  number,
  number,
  number
] = [1, 10, 100, 1000, 10000];

export interface StarLevelRequirement {
  /** Star level (1 to 5) */
  star: 1 | 2 | 3 | 4 | 5;
  /** Cumulative successful attempts required to earn this star */
  requiredSuccessfulAttempts: number;
  /** Difficulty level (1 to 5) active when working toward this star */
  difficultyTier: number;
  /** Short label describing the requirement or difficulty for this star */
  requirementLabel: string;
}

export interface StarProgressStatus {
  /** Current stars earned (0 to 5). Starts at 0 before any activity is solved. */
  starsEarned: number;
  /** Maximum stars per activity (5) */
  maxStars: number;
  /** Visual 5-star string, e.g. '★☆☆☆☆' */
  starsVisual: string;
  /** Total successful attempts completed by the user in this activity */
  successfulAttempts: number;
  /** Next star level (1..5), or null if all 5 stars are earned */
  nextStar: number | null;
  /** Total successful attempts required to reach nextStar */
  nextStarRequiredAttempts: number;
  /** Progress fraction (0.0 to 1.0) toward the next star for the progress bar */
  progressFraction: number;
  /** Active difficulty tier (1..5) for the current star stage */
  activeDifficultyTier: number;
  /** Active requirement description */
  activeRequirementLabel: string;
  /** Human-readable label for the activity progress bar */
  progressBarLabel: string;
}

export const DEFAULT_STAR_REQUIREMENTS: readonly StarLevelRequirement[] = [
  {
    star: 1,
    requiredSuccessfulAttempts: 1,
    difficultyTier: 1,
    requirementLabel: 'Solve 1 instance to earn Star 1'
  },
  {
    star: 2,
    requiredSuccessfulAttempts: 10,
    difficultyTier: 2,
    requirementLabel: 'Solve 10 instances to earn Star 2'
  },
  {
    star: 3,
    requiredSuccessfulAttempts: 100,
    difficultyTier: 3,
    requirementLabel: 'Solve 100 instances to earn Star 3'
  },
  {
    star: 4,
    requiredSuccessfulAttempts: 1000,
    difficultyTier: 4,
    requirementLabel: 'Solve 1,000 instances to earn Star 4'
  },
  {
    star: 5,
    requiredSuccessfulAttempts: 10000,
    difficultyTier: 5,
    requirementLabel: 'Solve 10,000 instances to earn Star 5'
  }
];

export function formatStarsVisual(
  starsEarned: number,
  maxStars = MAX_ACTIVITY_STARS
): string {
  const clamped = Math.max(0, Math.min(maxStars, Math.floor(starsEarned)));
  return '★'.repeat(clamped) + '☆'.repeat(maxStars - clamped);
}

export function evaluateStarProgress(
  successfulAttempts: number,
  requirements: readonly StarLevelRequirement[] = DEFAULT_STAR_REQUIREMENTS
): StarProgressStatus {
  const cleanAttempts = Math.max(0, Math.floor(successfulAttempts));
  let starsEarned = 0;

  for (const req of requirements) {
    if (cleanAttempts >= req.requiredSuccessfulAttempts) {
      starsEarned = req.star;
    } else {
      break;
    }
  }

  const maxStars = MAX_ACTIVITY_STARS;
  const starsVisual = formatStarsVisual(starsEarned, maxStars);

  if (starsEarned >= maxStars) {
    const finalReq = requirements[requirements.length - 1];
    return {
      starsEarned: maxStars,
      maxStars,
      starsVisual,
      successfulAttempts: cleanAttempts,
      nextStar: null,
      nextStarRequiredAttempts: finalReq.requiredSuccessfulAttempts,
      progressFraction: 1,
      activeDifficultyTier: finalReq.difficultyTier,
      activeRequirementLabel: finalReq.requirementLabel,
      progressBarLabel: `All 5 Stars Earned! (${cleanAttempts.toLocaleString()} successful attempts)`
    };
  }

  const nextReq = requirements[starsEarned];
  const targetAttempts = Math.max(1, nextReq.requiredSuccessfulAttempts);
  const progressFraction = Math.max(
    0,
    Math.min(1, cleanAttempts / targetAttempts)
  );

  return {
    starsEarned,
    maxStars,
    starsVisual,
    successfulAttempts: cleanAttempts,
    nextStar: nextReq.star,
    nextStarRequiredAttempts: targetAttempts,
    progressFraction,
    activeDifficultyTier: nextReq.difficultyTier,
    activeRequirementLabel: nextReq.requirementLabel,
    progressBarLabel: `Next: ★ Star ${nextReq.star} — ${cleanAttempts.toLocaleString()} / ${targetAttempts.toLocaleString()} successful attempts`
  };
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
  knowledgeTags?: readonly KnowledgeTagId[];
  parentGuide?: ParentPedagogicalGuide;
  /** Stars earned from 0 to 5 */
  starsEarned: number;
  /** Maximum stars (5) */
  maxStars: number;
  /** Visual stars representation, e.g. '★★☆☆☆' */
  starsVisual: string;
  /** Detailed star progress & next-star requirement status */
  starProgress: StarProgressStatus;
  /** Alias for starsEarned (0..5) for backward compatibility */
  highestLevel: number;
  /** Total successful attempts / instances solved */
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
  getStarRequirements: () => readonly StarLevelRequirement[];
  getStarProgress: (profileId?: string) => StarProgressStatus;
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
    'Shape Nest (Geometry)',
    'Color Bloom (Colors)',
    'Fruit Harvest (Numbers)',
    'Forest Symphony (Music)',
    'Phonics Pond (Language)',
    'Creature Ladder (Sizes)',
    'Pattern Path (Patterns)',
    'Shadow Match (Observation)',
    'Nature Sorting (Science)',
    'Symmetry Wings (Art)'
  ] as const;

  private registry: Record<string, () => Promise<{ default: MinigameModule }>> = {
    'Shape Nest (Geometry)': () => import('../minigames/GeometryShapesMinigame'),
    'Color Bloom (Colors)': () => import('../minigames/ColorBloomMinigame'),
    'Fruit Harvest (Numbers)': () => import('../minigames/FruitHarvestMinigame'),
    'Forest Symphony (Music)': () => import('../minigames/ForestSymphonyMinigame'),
    'Phonics Pond (Language)': () => import('../minigames/PhonicsPondMinigame'),
    'Creature Ladder (Sizes)': () => import('../minigames/CreatureLadderMinigame'),
    'Pattern Path (Patterns)': () => import('../minigames/PatternPathMinigame'),
    'Shadow Match (Observation)': () => import('../minigames/ShadowMatchMinigame'),
    'Nature Sorting (Science)': () => import('../minigames/NatureSortingMinigame'),
    'Symmetry Wings (Art)': () => import('../minigames/SymmetryWingsMinigame'),
    // Aliases & backward compatibility
    'Shape Shifter Geometry': () => import('../minigames/GeometryShapesMinigame'),
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
