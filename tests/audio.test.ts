import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../src/managers/AudioManager';

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

    (globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
    (globalThis as unknown as { window: { localStorage: typeof localStorageMock } }).window = {
      localStorage: localStorageMock
    };

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
});
