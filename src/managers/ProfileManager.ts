import { UserManager } from './UserManager';

export interface MinigameStats {
  completedCount: number;
  highestLevel: number;
  lastPlayedAt: number;
}

export type AnimalAvatarId = 'dino' | 'raccoon' | 'owl' | 'fox' | 'bear' | 'otter';

export interface AnimalAvatarDescriptor {
  id: AnimalAvatarId;
  name: string;
  emoji: string;
  spritePath: string;
  textureKey: string;
}

export interface PlayerProfile {
  id: string;
  nickname: string;
  explorerName: string; // COPPA-safe auto-generated name (e.g. "Quartz Dinosaur")
  avatarEmoji: string;
  avatarId: AnimalAvatarId;
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

  public static readonly ANIMAL_AVATARS: readonly AnimalAvatarDescriptor[] = [
    {
      id: 'dino',
      name: 'Dinosaur',
      emoji: '🦕',
      spritePath: './avatars/dino.png',
      textureKey: 'avatar_dino'
    },
    {
      id: 'raccoon',
      name: 'Raccoon',
      emoji: '🦝',
      spritePath: './avatars/raccoon.png',
      textureKey: 'avatar_raccoon'
    },
    {
      id: 'owl',
      name: 'Owl',
      emoji: '🦉',
      spritePath: './avatars/owl.png',
      textureKey: 'avatar_owl'
    },
    {
      id: 'fox',
      name: 'Fox',
      emoji: '🦊',
      spritePath: './avatars/fox.png',
      textureKey: 'avatar_fox'
    },
    {
      id: 'bear',
      name: 'Bear',
      emoji: '🐻',
      spritePath: './avatars/bear.png',
      textureKey: 'avatar_bear'
    },
    {
      id: 'otter',
      name: 'Otter',
      emoji: '🦦',
      spritePath: './avatars/otter.png',
      textureKey: 'avatar_otter'
    }
  ] as const;

  public static getAvatarDescriptor(
    idOrEmoji?: string
  ): AnimalAvatarDescriptor {
    const found = ProfileManager.ANIMAL_AVATARS.find(
      (a) => a.id === idOrEmoji || a.emoji === idOrEmoji
    );
    return found ?? ProfileManager.ANIMAL_AVATARS[0];
  }

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
            // Ensure backwards compatibility for profiles saved before avatarId
            for (const p of Object.values(this.state.profiles)) {
              if (!p.avatarId) {
                const desc = ProfileManager.getAvatarDescriptor(p.avatarEmoji);
                p.avatarId = desc.id;
                p.avatarEmoji = desc.emoji;
              }
            }
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

  // --- On-Device Guardian Math Gate (2-digit arithmetic < 100 required each entry) ---

  public generateGuardianChallenge(): GuardianMathChallenge {
    const isAddition = Math.random() < 0.5;
    let a: number;
    let b: number;

    if (isAddition) {
      // Both operands are 2-digit (>= 10) and their sum is strictly < 100 (<= 99)
      a = Math.floor(Math.random() * 79) + 10; // 10..88
      const maxB = 99 - a;
      b = Math.floor(Math.random() * (maxB - 10 + 1)) + 10; // 10..maxB
    } else {
      // Both operands are 2-digit (>= 10) and difference is positive and < 100
      a = Math.floor(Math.random() * 80) + 20; // 20..99
      b = Math.floor(Math.random() * (a - 10)) + 10; // 10..(a-1)
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
    avatarIdOrEmoji: string = 'dino',
    customExplorerName?: string
  ): PlayerProfile {
    const id = `profile_${this.nextId++}`;
    const userGen = new UserManager();
    const explorerName = customExplorerName ?? userGen.generateUsername();
    const desc = ProfileManager.getAvatarDescriptor(avatarIdOrEmoji);

    const profile: PlayerProfile = {
      id,
      nickname: nickname.trim() || 'Explorer',
      explorerName,
      avatarEmoji: desc.emoji,
      avatarId: desc.id,
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

  public setProfileAvatar(
    avatarId: AnimalAvatarId,
    profileId?: string
  ): PlayerProfile | null {
    const targetId = profileId ?? this.state.activeProfileId;
    if (!targetId || !this.state.profiles[targetId]) {
      return null;
    }
    const desc = ProfileManager.getAvatarDescriptor(avatarId);
    const profile = this.state.profiles[targetId];
    profile.avatarId = desc.id;
    profile.avatarEmoji = desc.emoji;
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
    profileId?: string,
    levelCompleted?: number
  ): MinigameStats | null {
    const targetId = profileId ?? this.state.activeProfileId;
    if (!targetId || !this.state.profiles[targetId]) {
      return null;
    }

    const profile = this.state.profiles[targetId];
    const existing = profile.progress[minigameId] ?? {
      completedCount: 0,
      highestLevel: 1,
      lastPlayedAt: 0
    };

    existing.completedCount += 1;
    if (levelCompleted !== undefined) {
      existing.highestLevel = Math.max(
        existing.highestLevel ?? 1,
        levelCompleted
      );
    } else {
      existing.highestLevel = (existing.highestLevel ?? 1) + 1;
    }
    existing.lastPlayedAt = Date.now();
    profile.progress[minigameId] = existing;
    this.save();
    return existing;
  }

  public getMinigameLevel(minigameId: string, profileId?: string): number {
    const targetId = profileId ?? this.state.activeProfileId;
    if (!targetId || !this.state.profiles[targetId]) {
      return 1;
    }
    const stats = this.state.profiles[targetId].progress[minigameId];
    return stats?.highestLevel ?? 1;
  }
}

export const profileManager = new ProfileManager();
