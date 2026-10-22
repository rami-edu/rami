import { profileManager, type PlayerProfile } from './ProfileManager';
import { activityOverlayManager, type ActiveActivity } from './ActivityOverlayManager';

export interface ActivityMapping {
  title: string;
  slug: string;
  aliases: string[];
}

export const CANONICAL_ACTIVITIES: readonly ActivityMapping[] = [
  {
    title: 'Shape Nest (Geometry)',
    slug: 'shape-nest',
    aliases: ['shapes', 'geometry', 'shape_nest', 'geom_shapes', 'geometry_shapes', 'shape']
  },
  {
    title: 'Color Bloom (Colors)',
    slug: 'color-bloom',
    aliases: ['colors', 'color_bloom', 'bloom', 'color']
  },
  {
    title: 'Phonics Pond (Language)',
    slug: 'phonics-pond',
    aliases: ['phonics', 'pond', 'language', 'phonics_pond']
  },
  {
    title: 'Creature Ladder (Sizes)',
    slug: 'creature-ladder',
    aliases: ['ladder', 'sizes', 'size', 'creature_ladder', 'creatures']
  },
  {
    title: 'Pattern Path (Patterns)',
    slug: 'pattern-path',
    aliases: ['pattern', 'patterns', 'pattern_path', 'path']
  },
  {
    title: 'Shadow Match (Observation)',
    slug: 'shadow-match',
    aliases: ['shadow', 'shadows', 'observation', 'shadow_match']
  },
  {
    title: 'Nature Sorting (Science)',
    slug: 'nature-sorting',
    aliases: ['sorting', 'nature', 'science', 'nature_sorting']
  },
  {
    title: 'Symmetry Wings (Art)',
    slug: 'symmetry-wings',
    aliases: ['symmetry', 'wings', 'art', 'symmetry_wings', 'butterflies']
  },
  // Backward compatibility aliases
  {
    title: 'Acorn Scale',
    slug: 'acorn-scale',
    aliases: ['acorn', 'scale', 'acorn_scale']
  },
  {
    title: 'Rhythm in the Branches',
    slug: 'rhythm-branches',
    aliases: ['rhythm', 'branches', 'rhythm_branches', 'music']
  },
  {
    title: 'The Clockwork Tower',
    slug: 'clockwork-tower',
    aliases: ['clockwork', 'tower', 'cave_echoes', 'echoes']
  }
];

/**
 * Converts a string into a clean URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .replace(/[()[\]{}]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Resolves a canonical activity title from any slug, alias, or query string.
 */
export function resolveActivityTitle(query?: string | null): string | null {
  if (!query) return null;
  const clean = query.trim().toLowerCase();
  const normalized = clean.replace(/[^a-z0-9]/g, '');

  for (const act of CANONICAL_ACTIVITIES) {
    if (act.title.toLowerCase() === clean) return act.title;
    if (act.slug.toLowerCase() === clean) return act.title;
    if (act.slug.replace(/-/g, '') === normalized) return act.title;
    if (act.title.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) return act.title;

    for (const alias of act.aliases) {
      if (alias.toLowerCase() === clean) return act.title;
      if (alias.replace(/[^a-z0-9]/g, '') === normalized) return act.title;
    }
  }

  return null;
}

/**
 * Gets the URL slug for a given activity title.
 */
export function getActivitySlug(title: string): string {
  const match = CANONICAL_ACTIVITIES.find(
    (a) => a.title.toLowerCase() === title.toLowerCase()
  );
  if (match) return match.slug;
  return slugify(title).toLowerCase();
}

/**
 * Resolves an existing profile by ID, nickname, slugified nickname, or explorer name.
 */
export function resolveProfile(
  query: string,
  profiles: PlayerProfile[]
): PlayerProfile | null {
  const clean = query.trim().toLowerCase();
  const normalized = clean.replace(/[^a-z0-9]/g, '');

  // 1. Direct ID match
  const byId = profiles.find((p) => p.id.toLowerCase() === clean);
  if (byId) return byId;

  // 2. Exact nickname match
  const byNickname = profiles.find((p) => p.nickname.toLowerCase() === clean);
  if (byNickname) return byNickname;

  // 3. Slugified / normalized nickname match
  const bySlug = profiles.find(
    (p) =>
      slugify(p.nickname).toLowerCase() === clean ||
      p.nickname.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
  );
  if (bySlug) return bySlug;

  // 4. Explorer name match
  const byExplorer = profiles.find(
    (p) =>
      p.explorerName.toLowerCase() === clean ||
      p.explorerName.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
  );
  if (byExplorer) return byExplorer;

  return null;
}

export interface ParsedHashState {
  profileQuery: string | null;
  activityQuery: string | null;
}

/**
 * Parses URL hash strings supporting query format (#profile=Leo&activity=shapes),
 * path format (#/profile/Leo/activity/shapes), or direct shorthand (#shapes).
 */
export function parseHash(hashStr: string): ParsedHashState {
  const hash = (hashStr || '').replace(/^#\/?/, '').trim();
  if (!hash) {
    return { profileQuery: null, activityQuery: null };
  }

  let profileQuery: string | null = null;
  let activityQuery: string | null = null;

  if (hash.includes('=')) {
    // Standard query parameter style
    const cleanQuery = hash.replace(/^\/+/, '');
    const searchParams = new URLSearchParams(cleanQuery);
    profileQuery =
      searchParams.get('profile') || searchParams.get('p') || null;
    activityQuery =
      searchParams.get('activity') ||
      searchParams.get('a') ||
      searchParams.get('act') ||
      null;
  } else if (hash.includes('/')) {
    // Path-based style: e.g. profile/Leo/activity/shape-nest
    const parts = hash
      .split('/')
      .map((s) => decodeURIComponent(s.trim()))
      .filter(Boolean);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toLowerCase();
      if (
        (part === 'profile' || part === 'p' || part === 'profiles') &&
        i + 1 < parts.length
      ) {
        profileQuery = parts[i + 1];
        i++;
      } else if (
        (part === 'activity' || part === 'a' || part === 'activities') &&
        i + 1 < parts.length
      ) {
        activityQuery = parts[i + 1];
        i++;
      } else {
        const matchedAct = resolveActivityTitle(parts[i]);
        if (matchedAct) {
          activityQuery = parts[i];
        } else if (!profileQuery) {
          profileQuery = parts[i];
        }
      }
    }
  } else {
    // Single standalone token: e.g. #shape-nest or #Leo
    const decoded = decodeURIComponent(hash);
    const matchedAct = resolveActivityTitle(decoded);
    if (matchedAct) {
      activityQuery = decoded;
    } else {
      profileQuery = decoded;
    }
  }

  return { profileQuery, activityQuery };
}

/**
 * Builds canonical URL hash string with anchors (#profile=...&activity=...).
 */
export function buildHash(
  profileSlug?: string | null,
  activitySlug?: string | null
): string {
  const parts: string[] = [];
  if (profileSlug) {
    parts.push(`profile=${encodeURIComponent(profileSlug)}`);
  }
  if (activitySlug) {
    parts.push(`activity=${encodeURIComponent(activitySlug)}`);
  }
  return parts.length > 0 ? `#${parts.join('&')}` : '';
}

/**
 * NavigationManager — Central URL Hash Router & Deep Link Coordinator:
 * - Keeps URL hash synchronized with active profile (#profile=...) and activity (#activity=...).
 * - Handles deep links directly into specific child profiles or activities.
 * - Supports seamless browser Back / Forward history navigation.
 */
export class NavigationManager {
  private static instance: NavigationManager | null = null;
  private isInternalHashUpdate = false;
  private pendingActivityTitle: string | null = null;
  private isSceneReady = false;

  public static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  public init(): void {
    if (typeof window === 'undefined') return;

    // 1. Process initial hash on page load
    this.handleInitialHash();

    // 2. Listen to browser Back / Forward & hash edits
    window.addEventListener('hashchange', this.onHashChange);

    // 3. Listen to profile changes in application
    window.addEventListener('rami:profile-changed', this.onProfileChanged);

    // 4. Subscribe to React activity overlay lifecycle
    activityOverlayManager.subscribe((active) => {
      this.onActivityOverlayChanged(active);
    });
  }

  public hasPendingActivity(): boolean {
    return this.pendingActivityTitle !== null;
  }

  public getPendingActivityTitle(): string | null {
    return this.pendingActivityTitle;
  }

  /**
   * Called by WonderTreeScene once it has finished create() and is ready to launch activities.
   */
  public markSceneReady(): void {
    this.isSceneReady = true;
    if (this.pendingActivityTitle) {
      const act = this.pendingActivityTitle;
      this.pendingActivityTitle = null;
      window.dispatchEvent(
        new CustomEvent('rami:launch-activity', {
          detail: { activityTitle: act }
        })
      );
    }
  }

  /**
   * Syncs the current active profile & active activity state to URL hash.
   */
  public syncHash(replace = false): void {
    if (typeof window === 'undefined') return;
    const profile = profileManager.getActiveProfile();
    const currentActivity = activityOverlayManager.getCurrent();
    const profileSlug = profile ? slugify(profile.nickname || profile.id) : null;
    const activitySlug = currentActivity
      ? getActivitySlug(currentActivity.module.descriptor.title)
      : this.pendingActivityTitle
      ? getActivitySlug(this.pendingActivityTitle)
      : null;

    this.updateHash(profileSlug, activitySlug, replace);
  }

  private handleInitialHash(): void {
    if (typeof window === 'undefined') return;
    const { profileQuery, activityQuery } = parseHash(window.location.hash);

    // Resolve or create profile from URL anchor
    if (profileQuery) {
      const all = profileManager.getAllProfiles();
      let matched = resolveProfile(profileQuery, all);
      if (!matched) {
        matched = profileManager.createProfile(profileQuery);
      }
      profileManager.setActiveProfile(matched.id);
    }

    // Ensure at least one active profile
    if (!profileManager.getActiveProfile()) {
      if (profileManager.getAllProfiles().length === 0) {
        profileManager.createProfile('Player 1');
      } else {
        profileManager.setActiveProfile(profileManager.getAllProfiles()[0].id);
      }
    }

    // Resolve activity from URL anchor
    if (activityQuery) {
      const activityTitle = resolveActivityTitle(activityQuery);
      if (activityTitle) {
        this.pendingActivityTitle = activityTitle;
      }
    }

    // Write initial canonical hash without creating extra history back-step
    this.syncHash(true);
  }

  private updateHash(
    profileSlug: string | null,
    activitySlug: string | null,
    replace = false
  ): void {
    if (typeof window === 'undefined') return;

    const targetHash = buildHash(profileSlug, activitySlug);
    const currentHash = window.location.hash;

    if (currentHash === targetHash) return;

    this.isInternalHashUpdate = true;
    if (replace && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.hash = targetHash;
      window.history.replaceState(null, '', url.toString());
    } else {
      window.location.hash = targetHash;
    }

    setTimeout(() => {
      this.isInternalHashUpdate = false;
    }, 50);
  }

  private onProfileChanged = (): void => {
    this.syncHash(false);
  };

  private onActivityOverlayChanged = (active: ActiveActivity | null): void => {
    const profile = profileManager.getActiveProfile();
    const profileSlug = profile ? slugify(profile.nickname || profile.id) : null;
    const activitySlug = active
      ? getActivitySlug(active.module.descriptor.title)
      : null;

    this.updateHash(profileSlug, activitySlug, false);
  };

  private onHashChange = (): void => {
    if (this.isInternalHashUpdate) {
      this.isInternalHashUpdate = false;
      return;
    }

    const { profileQuery, activityQuery } = parseHash(window.location.hash);

    // 1. Synchronize Profile
    if (profileQuery) {
      const all = profileManager.getAllProfiles();
      let matched = resolveProfile(profileQuery, all);
      if (!matched) {
        matched = profileManager.createProfile(profileQuery);
      }
      const active = profileManager.getActiveProfile();
      if (active?.id !== matched.id) {
        profileManager.setActiveProfile(matched.id);
        window.dispatchEvent(new CustomEvent('rami:profile-changed'));
      }
    }

    // 2. Synchronize Activity
    const current = activityOverlayManager.getCurrent();
    const currentTitle = current?.module.descriptor.title ?? null;
    const targetTitle = activityQuery ? resolveActivityTitle(activityQuery) : null;

    if (!targetTitle) {
      // User navigated back to tree or cleared activity
      if (current) {
        activityOverlayManager.close();
      }
    } else if (currentTitle !== targetTitle) {
      if (current) {
        activityOverlayManager.close();
        setTimeout(() => {
          this.triggerLaunchActivity(targetTitle);
        }, 60);
      } else {
        this.triggerLaunchActivity(targetTitle);
      }
    }
  };

  private triggerLaunchActivity(title: string): void {
    if (this.isSceneReady) {
      window.dispatchEvent(
        new CustomEvent('rami:launch-activity', {
          detail: { activityTitle: title }
        })
      );
    } else {
      this.pendingActivityTitle = title;
    }
  }
}

export const navigationManager = NavigationManager.getInstance();
