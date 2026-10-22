import { profileManager } from './ProfileManager';

/**
 * Audio Manager for Rami.
 * Manages subtle, sweet background piano lullaby music across the app
 * and delightful preschool sound effects for movement and portal transitions.
 * Adheres to browser autoplay policies by starting on first user gesture.
 * Persists user audio settings per child profile across sessions.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private sfxGainNode: GainNode | null = null;
  private sfxBuffers: Map<string, AudioBuffer> = new Map();
  private currentStepIndex = 0;

  private isInitialized = false;
  private isUserInteracted = false;
  private baseVolume = 0.38; // Sweet, warm piano lullaby level
  private muted = false;
  private fadeInterval: number | null = null;
  private wasPlayingBeforeHidden = false;

  private static readonly STORAGE_KEY = 'rami_music_muted_v1';

  private constructor() {
    this.muted = this.resolveMutedState();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private resolveMutedState(): boolean {
    try {
      if (typeof profileManager !== 'undefined') {
        const active = profileManager.getActiveProfile();
        if (active && active.settings) {
          return !active.settings.musicEnabled;
        }
      }
    } catch {
      // Fallback if profileManager not initialized yet
    }
    return this.loadMutedState();
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

  public getAudioSrc(filename: string): string {
    if (typeof window === 'undefined') {
      return `./audio/${filename}`;
    }
    try {
      const base = document.baseURI || window.location.href;
      return new URL(`audio/${filename}`, base).href;
    } catch {
      return `./audio/${filename}`;
    }
  }

  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.audioCtx = new AudioCtxClass();
          this.sfxGainNode = this.audioCtx.createGain();
          this.sfxGainNode.gain.value = this.muted ? 0 : 0.55;
          this.sfxGainNode.connect(this.audioCtx.destination);
        } catch {
          this.audioCtx = null;
        }
      }
    }
    return this.audioCtx;
  }

  private preloadSfx(): void {
    const ctx = this.getAudioContext();
    if (!ctx || typeof fetch === 'undefined') return;

    const sfxNames = [
      'sfx-step-1',
      'sfx-step-2',
      'sfx-portal-enter',
      'sfx-portal-exit',
      'sfx-portal-return'
    ];

    for (const name of sfxNames) {
      const ext =
        this.audio && !this.audio.canPlayType('audio/mpeg') ? 'ogg' : 'mp3';
      const url = this.getAudioSrc(`${name}.${ext}`);

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          this.sfxBuffers.set(name, decoded);
        })
        .catch(() => {
          // Gracefully fallback to procedural Web Audio synthesis
        });
    }
  }

  /**
   * Initializes audio element and attaches user gesture unlock listeners.
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Apply active profile settings if available
    this.syncWithActiveProfile();

    try {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = 'auto';

      if (this.audio.canPlayType('audio/mpeg')) {
        this.audio.src = this.getAudioSrc('sweet-piano.mp3');
      } else {
        this.audio.src = this.getAudioSrc('sweet-piano.ogg');
      }

      this.audio.volume = this.baseVolume;
    } catch (err) {
      console.warn('Audio element initialization failed:', err);
    }

    // Attempt direct play if browser policy allows (e.g. cached user permission)
    if (!this.muted) {
      this.playMusic();
    }

    // Attach capture-phase gesture unlock listeners to reliably capture first interaction
    const gestureEvents = [
      'pointerdown',
      'mousedown',
      'touchstart',
      'touchend',
      'click',
      'keydown'
    ];

    const unlockHandler = () => {
      this.unlockAudio();
    };

    gestureEvents.forEach((evt) => {
      window.addEventListener(evt, unlockHandler, {
        capture: true,
        passive: true
      });
      document.addEventListener(evt, unlockHandler, {
        capture: true,
        passive: true
      });
    });

    // React to profile switches to update mute/volume preferences automatically
    window.addEventListener('rami:profile-changed', () => {
      this.syncWithActiveProfile();
    });
    window.addEventListener('rami:profile-settings-changed', () => {
      this.syncWithActiveProfile();
    });

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

    this.preloadSfx();
    this.updateToggleButtonUi();
  }

  /**
   * Unlocks audio context and starts music playback on user gesture.
   */
  public unlockAudio(): void {
    this.isUserInteracted = true;

    // Unlock Web Audio Context on first gesture
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!this.muted && this.audio && this.audio.paused) {
      this.playMusic();
    }
  }

  /**
   * Synchronizes audio state with the currently active child profile.
   */
  public syncWithActiveProfile(): void {
    if (typeof profileManager === 'undefined') return;
    const active = profileManager.getActiveProfile();
    if (!active) return;

    const settings = profileManager.getProfileSettings(active.id);
    const shouldBeMuted = !settings.musicEnabled;

    if (settings.volume !== undefined && settings.volume > 0) {
      this.baseVolume = settings.volume;
      if (this.audio && !this.muted) {
        this.audio.volume = this.baseVolume;
      }
    }

    if (this.muted !== shouldBeMuted) {
      this.muted = shouldBeMuted;
      this.saveMutedState(this.muted);

      if (this.sfxGainNode) {
        this.sfxGainNode.gain.value = this.muted ? 0 : 0.55;
      }

      if (this.muted) {
        this.fadeOut(300, () => {
          if (this.audio) this.audio.pause();
        });
      } else {
        if (this.audio) {
          this.playMusic();
        }
      }
      this.updateToggleButtonUi();
    } else if (
      !this.muted &&
      this.audio &&
      this.audio.paused &&
      this.isUserInteracted
    ) {
      this.playMusic();
    }
  }

  /**
   * Plays the background music with an audible sweet volume.
   */
  public playMusic(): void {
    if (!this.audio || this.muted) return;

    if (this.audio.volume <= 0.01) {
      this.audio.volume = this.baseVolume;
    }

    const promise = this.audio.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          this.isUserInteracted = true;
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
   * Toggles mute on/off and persists setting per profile and locally.
   */
  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.saveMutedState(this.muted);

    if (typeof profileManager !== 'undefined') {
      const active = profileManager.getActiveProfile();
      if (active) {
        profileManager.updateProfileSettings(
          { musicEnabled: !this.muted },
          active.id
        );
      }
    }

    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = this.muted ? 0 : 0.55;
    }

    if (this.muted) {
      this.fadeOut(400, () => {
        if (this.audio) this.audio.pause();
      });
    } else {
      if (this.audio) {
        if (this.audio.volume <= 0.01) {
          this.audio.volume = this.baseVolume;
        }
        const promise = this.audio.play();
        if (promise !== undefined) {
          promise.then(() => this.fadeIn(600)).catch(() => {});
        }
      }
    }

    this.updateToggleButtonUi();

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('rami:music-toggled', {
            detail: { muted: this.muted }
          })
        );
      } catch {
        // Ignore
      }
    }

    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isMusicEnabled(): boolean {
    return !this.muted;
  }

  public setMusicEnabled(enabled: boolean): void {
    if (this.muted === !enabled) return;
    this.toggleMute();
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

  /* -------------------------------------------------------------
   * Sound Effects (SFX) Subsystem
   * ------------------------------------------------------------- */

  private playBuffer(name: string, volumeScale = 1.0): boolean {
    if (this.muted) return true;
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const buffer = this.sfxBuffers.get(name);
    if (!buffer) return false;

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.value = volumeScale;
      source.connect(gain);

      if (this.sfxGainNode) {
        gain.connect(this.sfxGainNode);
      } else {
        gain.connect(ctx.destination);
      }

      source.start(0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Plays a soft, tactile mossy step sound when the avatar moves on the tree.
   * Alternates between left and right paws with subtle pitch variation.
   */
  public playMoveStep(): void {
    if (this.muted) return;
    this.currentStepIndex = (this.currentStepIndex + 1) % 2;
    const sfxName = this.currentStepIndex === 0 ? 'sfx-step-1' : 'sfx-step-2';

    if (this.playBuffer(sfxName, 0.35)) {
      return;
    }

    // Procedural Fallback
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      const freq = this.currentStepIndex === 0 ? 352 : 392;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      if (this.sfxGainNode) {
        gain.connect(this.sfxGainNode);
      } else {
        gain.connect(ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Plays the enchanted celestial vortex chime when entering an activity portal.
   */
  public playPortalEnter(): void {
    if (this.muted) return;

    if (this.playBuffer('sfx-portal-enter', 0.85)) {
      return;
    }

    // Procedural Fallback: Ascending celestial pentatonic chime arpeggio
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51];
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const noteStart = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.32);

        osc.connect(gain);
        if (this.sfxGainNode) {
          gain.connect(this.sfxGainNode);
        } else {
          gain.connect(ctx.destination);
        }

        osc.start(noteStart);
        osc.stop(noteStart + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Plays the playful avatar leap and magical starlight burst when leaving an activity.
   */
  public playPortalExit(): void {
    if (this.muted) return;

    if (this.playBuffer('sfx-portal-exit', 0.85)) {
      return;
    }

    // Procedural Fallback: Upward bouncy leap sweep + starlight chime
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.22);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      if (this.sfxGainNode) {
        gain.connect(this.sfxGainNode);
      } else {
        gain.connect(ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.32);

      // Star sparkle
      const sparkleOsc = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkleOsc.type = 'sine';
      sparkleOsc.frequency.setValueAtTime(1568, now + 0.18);
      sparkleGain.gain.setValueAtTime(0.15, now + 0.18);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      sparkleOsc.connect(sparkleGain);
      if (this.sfxGainNode) {
        sparkleGain.connect(this.sfxGainNode);
      } else {
        sparkleGain.connect(ctx.destination);
      }
      sparkleOsc.start(now + 0.18);
      sparkleOsc.stop(now + 0.46);
    } catch {
      // Ignore
    }
  }

  /**
   * Plays the warm arrival welcome chime and soft bounce when returning to the Wonder Tree.
   */
  public playPortalReturn(): void {
    if (this.muted) return;

    if (this.playBuffer('sfx-portal-return', 0.85)) {
      return;
    }

    // Procedural Fallback: G Major welcome chord + soft landing pop
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const chord = [392.0, 493.88, 587.33, 783.99];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.03;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.15, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.38);

        osc.connect(gain);
        if (this.sfxGainNode) {
          gain.connect(this.sfxGainNode);
        } else {
          gain.connect(ctx.destination);
        }

        osc.start(noteStart);
        osc.stop(noteStart + 0.4);
      });
    } catch {
      // Ignore
    }
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
