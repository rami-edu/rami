import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../src/managers/AudioManager';
import { profileManager } from '../src/managers/ProfileManager';

describe('AudioManager (Background Music & Portal/Movement SFX)', () => {
  let manager: AudioManager;
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }

    const localStorageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        for (const key in mockStorage) {
          delete mockStorage[key];
        }
      }
    };

    const windowMock = {
      localStorage: localStorageMock,
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    (globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
    (globalThis as unknown as { window: typeof windowMock }).window = windowMock;

    profileManager.resetAll();
    manager = AudioManager.getInstance();
  });

  afterEach(() => {
    // Clean up
  });

  it('provides a singleton instance', () => {
    const inst1 = AudioManager.getInstance();
    const inst2 = AudioManager.getInstance();
    expect(inst1).toBe(inst2);
  });

  it('toggles mute state and persists to storage', () => {
    const initialMute = manager.isMuted();
    const toggled = manager.toggleMute();
    expect(toggled).toBe(!initialMute);
    expect(manager.isMuted()).toBe(!initialMute);
    expect(mockStorage['rami_music_muted_v1']).toBe(String(!initialMute));

    // Toggle back
    manager.toggleMute();
    expect(manager.isMuted()).toBe(initialMute);
    expect(mockStorage['rami_music_muted_v1']).toBe(String(initialMute));
  });

  it('handles ducking and unducking volume safely without errors', () => {
    expect(() => {
      manager.duckVolume(true);
      manager.duckVolume(false);
    }).not.toThrow();
  });

  it('triggers movement step sound without error', () => {
    expect(() => {
      manager.playMoveStep();
      manager.playMoveStep();
      manager.playMoveStep();
    }).not.toThrow();
  });

  it('triggers portal entrance, exit, and return sound effects without error', () => {
    expect(() => {
      manager.playPortalEnter();
      manager.playPortalExit();
      manager.playPortalReturn();
    }).not.toThrow();
  });

  it('silently ignores SFX playback when muted', () => {
    if (!manager.isMuted()) {
      manager.toggleMute();
    }
    expect(manager.isMuted()).toBe(true);

    expect(() => {
      manager.playMoveStep();
      manager.playPortalEnter();
      manager.playPortalExit();
      manager.playPortalReturn();
    }).not.toThrow();
  });

  it('synchronizes audio mute settings with active profile and updates profile on toggle', () => {
    const p1 = profileManager.createProfile('Alice');
    const p2 = profileManager.createProfile('Bob');

    profileManager.setActiveProfile(p1.id);
    manager.syncWithActiveProfile();

    // Alice starts with musicEnabled: true (so manager is not muted)
    expect(manager.isMuted()).toBe(false);

    // Alice mutes music
    manager.toggleMute();
    expect(manager.isMuted()).toBe(true);
    expect(profileManager.getProfileSettings(p1.id).musicEnabled).toBe(false);

    // Switch to Bob (who has musicEnabled: true by default)
    profileManager.setActiveProfile(p2.id);
    manager.syncWithActiveProfile();
    expect(manager.isMuted()).toBe(false);

    // Switch back to Alice (who muted music)
    profileManager.setActiveProfile(p1.id);
    manager.syncWithActiveProfile();
    expect(manager.isMuted()).toBe(true);
  });

  it('safely handles unlockAudio() on user gesture', () => {
    expect(() => {
      manager.unlockAudio();
    }).not.toThrow();
    expect(manager.hasUserInteracted()).toBe(true);
  });

  it('resolves audio asset URLs reliably with getAudioSrc', () => {
    const src = manager.getAudioSrc('sweet-piano.mp3');
    expect(src).toContain('audio/sweet-piano.mp3');
  });
});
