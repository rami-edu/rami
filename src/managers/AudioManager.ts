/**
 * Audio Manager for Rami.
 * Manages subtle, sweet background piano lullaby music across the app.
 * Adheres to browser autoplay policies by starting on first user gesture.
 * Persists user mute preferences across sessions.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;
  private audio: HTMLAudioElement | null = null;
  private isInitialized = false;
  private isUserInteracted = false;
  private baseVolume = 0.12; // "very subtle piano only tune, sweet and low"
  private muted = false;
  private fadeInterval: number | null = null;
  private wasPlayingBeforeHidden = false;

  private static readonly STORAGE_KEY = 'rami_music_muted_v1';

  private constructor() {
    this.muted = this.loadMutedState();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private loadMutedState(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(AudioManager.STORAGE_KEY) === 'true';
      }
    } catch {
      // Ignore localStorage access restrictions
    }
    return false;
  }

  private saveMutedState(isMuted: boolean): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AudioManager.STORAGE_KEY, String(isMuted));
      }
    } catch {
      // Ignore quota errors
    }
  }

  /**
   * Initializes audio element and attaches user gesture unlock listeners.
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    try {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = 'auto';

      if (this.audio.canPlayType('audio/mpeg')) {
        this.audio.src = './audio/sweet-piano.mp3';
      } else {
        this.audio.src = './audio/sweet-piano.ogg';
      }

      this.audio.volume = 0;
    } catch (err) {
      console.warn('Audio element initialization failed:', err);
    }

    const startOnInteraction = () => {
      this.isUserInteracted = true;
      if (!this.muted) {
        this.playMusic();
      }
      window.removeEventListener('pointerdown', startOnInteraction);
      window.removeEventListener('keydown', startOnInteraction);
      window.removeEventListener('touchstart', startOnInteraction);
    };

    window.addEventListener('pointerdown', startOnInteraction, { passive: true });
    window.addEventListener('keydown', startOnInteraction, { passive: true });
    window.addEventListener('touchstart', startOnInteraction, { passive: true });

    // Handle tab visibility changes to pause and resume gracefully
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.audio && !this.audio.paused) {
          this.wasPlayingBeforeHidden = true;
          this.audio.pause();
        }
      } else {
        if (this.wasPlayingBeforeHidden && !this.muted) {
          this.wasPlayingBeforeHidden = false;
          this.playMusic();
        }
      }
    });

    this.updateToggleButtonUi();
  }

  /**
   * Plays the background music with a gentle fade in.
   */
  public playMusic(): void {
    if (!this.audio || this.muted) return;

    const promise = this.audio.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          this.fadeIn(1800);
          this.updateToggleButtonUi();
        })
        .catch(() => {
          // Autoplay blocked until gesture
        });
    }
  }

  /**
   * Pauses the music.
   */
  public pauseMusic(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.updateToggleButtonUi();
  }

  /**
   * Toggles mute on/off.
   */
  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.saveMutedState(this.muted);

    if (this.muted) {
      this.fadeOut(400, () => {
        if (this.audio) this.audio.pause();
      });
    } else {
      if (this.audio) {
        const promise = this.audio.play();
        if (promise !== undefined) {
          promise.then(() => this.fadeIn(1000)).catch(() => {});
        }
      }
    }

    this.updateToggleButtonUi();
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public hasUserInteracted(): boolean {
    return this.isUserInteracted;
  }

  public isPlaying(): boolean {
    return Boolean(this.audio && !this.audio.paused && !this.muted);
  }

  /**
   * Allows temporary volume ducking during voice/listening activities (e.g. Phonics Pond).
   */
  public duckVolume(isDucked: boolean): void {
    const targetVol = isDucked ? this.baseVolume * 0.45 : this.baseVolume;
    this.rampVolume(targetVol, 600);
  }

  private fadeIn(durationMs = 1500): void {
    this.rampVolume(this.baseVolume, durationMs);
  }

  private fadeOut(durationMs = 500, onComplete?: () => void): void {
    this.rampVolume(0, durationMs, onComplete);
  }

  private rampVolume(
    targetVolume: number,
    durationMs: number,
    onComplete?: () => void
  ): void {
    if (!this.audio) {
      onComplete?.();
      return;
    }

    if (this.fadeInterval !== null) {
      window.clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const startVolume = this.audio.volume;
    const steps = 25;
    const stepInterval = Math.max(16, Math.floor(durationMs / steps));
    let currentStep = 0;

    this.fadeInterval = window.setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      if (this.audio) {
        this.audio.volume = Math.max(
          0,
          Math.min(1, startVolume + (targetVolume - startVolume) * progress)
        );
      }

      if (currentStep >= steps) {
        if (this.fadeInterval !== null) {
          window.clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        if (this.audio) {
          this.audio.volume = Math.max(0, Math.min(1, targetVolume));
        }
        onComplete?.();
      }
    }, stepInterval);
  }

  public updateToggleButtonUi(): void {
    if (typeof document === 'undefined') return;

    const icon = document.getElementById('btn-music-icon');
    if (icon) {
      icon.textContent = this.muted ? '🔇' : '🎵';
    }

    const btn = document.getElementById('btn-music-toggle');
    if (btn) {
      btn.setAttribute(
        'title',
        this.muted ? 'Unmute Piano Music' : 'Mute Piano Music'
      );
      btn.setAttribute(
        'aria-label',
        this.muted ? 'Unmute Piano Music' : 'Mute Piano Music'
      );
    }
  }
}

export const audioManager = AudioManager.getInstance();
