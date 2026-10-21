/**
 * Auto-Namer for minor accounts (COPPA Compliant).
 * Generates immutable, safe nature/mineral + animal combinations.
 */
export class UserManager {
  public static readonly PREFIXES = [
    'Quartz',
    'Basalt',
    'Agate',
    'Emerald',
    'Ruby',
    'Sapphire',
    'Granite',
    'Moss',
    'Fern',
    'Oak'
  ] as const;

  public static readonly SUFFIXES = [
    'Dinosaur',
    'Raccoon',
    'Owl',
    'Fox',
    'Bear',
    'Wolf',
    'Hawk',
    'Badger',
    'Otter',
    'Squirrel'
  ] as const;

  private static readonly STORAGE_KEY = 'rami_local_username';
  private localUsername: string = '';

  constructor() {
    const saved = this.readStorage();
    if (saved) {
      this.localUsername = saved;
    } else {
      this.generateUsername();
    }
  }

  public generateUsername(): string {
    const prefix =
      UserManager.PREFIXES[Math.floor(Math.random() * UserManager.PREFIXES.length)];
    const suffix =
      UserManager.SUFFIXES[Math.floor(Math.random() * UserManager.SUFFIXES.length)];
    this.localUsername = `${prefix} ${suffix}`;
    this.writeStorage(this.localUsername);
    return this.localUsername;
  }

  public getUsername(): string {
    return this.localUsername;
  }

  private readStorage(): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(UserManager.STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors in restricted contexts
    }
    return null;
  }

  private writeStorage(value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(UserManager.STORAGE_KEY, value);
      }
    } catch {
      // Ignore storage access errors
    }
  }
}

export const userManager = new UserManager();
