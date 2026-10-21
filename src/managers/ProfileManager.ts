import { UserManager } from './UserManager';

export interface MinigameStats {
  completedCount: number;
  lastPlayedAt: number;
}

export interface PlayerProfile {
  id: string;
  nickname: string;
  explorerName: string; // COPPA-safe auto-generated name (e.g. "Quartz Dinosaur")
  avatarEmoji: string;
  createdAt: number;
  progress: Record<string, MinigameStats>;
}

export interface LocalStoreData {
  activeProfileId: string | null;
  profiles: Record<string, PlayerProfile>;
}

export interface GuardianMathChallenge {
  a: number;
  b: number;
  operator: '+' | '-';
  question: string;
  expectedAnswer: number;
}

/**
 * Pure Client-Only / Local-First Profile & Progress Manager.
 * Zero servers, zero network authentication, zero external data transmission.
 * All state lives strictly on-device in localStorage / browser storage.
 */
export class ProfileManager {
  private static readonly STORAGE_KEY = 'rami_local_state_v1';

  public static readonly AVATARS = ['🦕', '🦝', '🦉', '🦊', '🐻', '🦦'] as const;

  private state: LocalStoreData = {
    activeProfileId: null,
    profiles: {}
  };

  private nextId = 1;
  private activeChallenge: GuardianMathChallenge | null = null;

  constructor() {
    this.load();
  }

  public resetAll(): void {
    this.state = {
      activeProfileId: null,
      profiles: {}
    };
    this.nextId = 1;
    this.activeChallenge = null;
    this.save();
  }

  public save(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          ProfileManager.STORAGE_KEY,
          JSON.stringify({ state: this.state, nextId: this.nextId })
        );
      }
    } catch {
      // Ignore storage quota / restricted context errors
    }
  }

  public load(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(ProfileManager.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.state) {
            this.state = parsed.state;
          }
          if (typeof parsed.nextId === 'number') {
            this.nextId = parsed.nextId;
          }
        }
      }
    } catch {
      // Ignore corrupt local data
    }
  }

  // --- On-Device Guardian Math Gate (2-digit arithmetic required each entry) ---

  public generateGuardianChallenge(): GuardianMathChallenge {
    const isAddition = Math.random() < 0.5;
    let a = Math.floor(Math.random() * 80) + 12; // 12..91
    let b = Math.floor(Math.random() * 80) + 12; // 12..91

    if (!isAddition && a < b) {
      const tmp = a;
      a = b;
      b = tmp;
    }

    const operator: '+' | '-' = isAddition ? '+' : '-';
    const expectedAnswer = isAddition ? a + b : a - b;

    this.activeChallenge = {
      a,
      b,
      operator,
      question: `${a} ${operator} ${b}`,
      expectedAnswer
    };

    return this.activeChallenge;
  }

  public verifyGuardianChallenge(input: string | number): boolean {
    if (!this.activeChallenge) {
      return false;
    }
    const parsed = typeof input === 'number' ? input : parseInt(input.trim(), 10);
    if (Number.isNaN(parsed)) {
      return false;
    }
    return parsed === this.activeChallenge.expectedAnswer;
  }

  // --- Local Child Profiles & Progress ---

  public createProfile(
    nickname: string,
    avatarEmoji: string = ProfileManager.AVATARS[0],
    customExplorerName?: string
  ): PlayerProfile {
    const id = `profile_${this.nextId++}`;
    const userGen = new UserManager();
    const explorerName = customExplorerName ?? userGen.generateUsername();

    const profile: PlayerProfile = {
      id,
      nickname: nickname.trim() || 'Explorer',
      explorerName,
      avatarEmoji,
      createdAt: Date.now(),
      progress: {}
    };

    this.state.profiles[id] = profile;
    if (!this.state.activeProfileId) {
      this.state.activeProfileId = id;
    }
    this.save();
    return profile;
  }

  public deleteProfile(profileId: string): boolean {
    if (!this.state.profiles[profileId]) {
      return false;
    }
    delete this.state.profiles[profileId];
    if (this.state.activeProfileId === profileId) {
      const remainingIds = Object.keys(this.state.profiles);
      this.state.activeProfileId = remainingIds[0] ?? null;
    }
    this.save();
    return true;
  }

  public setActiveProfile(profileId: string): PlayerProfile | null {
    const profile = this.state.profiles[profileId];
    if (!profile) {
      return null;
    }
    this.state.activeProfileId = profileId;
    this.save();
    return profile;
  }

  public getActiveProfile(): PlayerProfile | null {
    if (!this.state.activeProfileId) {
      return null;
    }
    return this.state.profiles[this.state.activeProfileId] ?? null;
  }

  public getAllProfiles(): PlayerProfile[] {
    return Object.values(this.state.profiles);
  }

  public recordMinigameCompletion(
    minigameId: string,
    profileId?: string
  ): MinigameStats | null {
    const targetId = profileId ?? this.state.activeProfileId;
    if (!targetId || !this.state.profiles[targetId]) {
      return null;
    }

    const profile = this.state.profiles[targetId];
    const existing = profile.progress[minigameId] ?? {
      completedCount: 0,
      lastPlayedAt: 0
    };

    existing.completedCount += 1;
    existing.lastPlayedAt = Date.now();
    profile.progress[minigameId] = existing;
    this.save();
    return existing;
  }
}

export const profileManager = new ProfileManager();
