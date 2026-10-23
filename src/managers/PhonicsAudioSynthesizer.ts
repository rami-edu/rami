/**
 * Phonics Audio Manager & Synthesizer:
 * Uses high-quality natural recorded sounds for each animal (duck, frog, bird, owl, bee)
 * with seamless procedural Web Audio synthesis fallback if offline or loading.
 */
export class PhonicsAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private naturalBuffers: Map<string, AudioBuffer> = new Map();
  private loadAttempted = false;
  private activeSourceNode: AudioBufferSourceNode | null = null;
  private currentLoopCancel: (() => void) | null = null;

  constructor() {
    this.preloadNaturalSounds();
  }

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          this.unlocked = true;
        })
        .catch(() => {});
    } else {
      this.unlocked = true;
    }
  }

  public isReady(): boolean {
    const ctx = this.getContext();
    return !!ctx && (ctx.state === 'running' || this.unlocked);
  }

  /**
   * Preloads natural recorded audio clips for all 5 animals.
   */
  public preloadNaturalSounds(): void {
    if (this.loadAttempted || typeof window === 'undefined' || typeof fetch === 'undefined') {
      return;
    }
    this.loadAttempted = true;

    const ctx = this.getContext();
    if (!ctx) return;

    const creatures = ['duck', 'frog', 'bird', 'owl', 'bee'];
    const canPlayOgg = typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs="vorbis"');
    const ext = canPlayOgg ? 'ogg' : 'mp3';

    for (const id of creatures) {
      const url = `./audio/phonics/${id}.${ext}`;
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          this.naturalBuffers.set(id, decoded);
        })
        .catch(() => {
          // Gracefully fallback to procedural Web Audio synthesis
        });
    }
  }

  /**
   * Plays a natural recorded creature sound with fallback to procedural synthesis.
   * @param creatureId - 'duck' | 'frog' | 'bird' | 'owl' | 'bee'
   * @param onEnded - Optional callback when playback completes
   * @returns Approximate duration in seconds
   */
  public playCreatureSound(creatureId: string, onEnded?: () => void): number {
    const ctx = this.getContext();
    if (!ctx) {
      onEnded?.();
      return 0;
    }
    this.unlock();

    // 1. Try playing natural recorded audio buffer
    const naturalBuffer = this.naturalBuffers.get(creatureId);
    if (naturalBuffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = naturalBuffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        this.activeSourceNode = source;

        source.onended = () => {
          if (this.activeSourceNode === source) {
            this.activeSourceNode = null;
          }
          onEnded?.();
        };

        return naturalBuffer.duration;
      } catch {
        // Fallback to procedural below
      }
    }

    // 2. Procedural synthesis fallback
    this.playSynthesizedSound(creatureId, ctx);
    const estimatedDur = creatureId === 'owl' ? 1.65 : creatureId === 'bird' ? 1.8 : 1.4;
    setTimeout(() => {
      onEnded?.();
    }, estimatedDur * 1000);
    return estimatedDur;
  }

  /**
   * Loops a creature's natural recorded sound for 10 times at the start of the round.
   * @param creatureId - Target creature id
   * @param totalLoops - Number of times to loop (default: 10)
   * @param onIteration - Callback receiving current iteration number (1..10)
   * @param onComplete - Callback when all 10 loops complete
   * @returns Cancellation function to stop loop immediately
   */
  public loopCreatureSound(
    creatureId: string,
    totalLoops = 10,
    onIteration?: (iteration: number) => void,
    onComplete?: () => void
  ): () => void {
    // Stop any existing loop first
    this.stopLoop();

    let cancelled = false;
    let currentIteration = 0;
    let timerId: any = null;

    const playNext = () => {
      if (cancelled) return;
      currentIteration++;
      onIteration?.(currentIteration);

      const duration = this.playCreatureSound(creatureId, () => {
        if (cancelled) return;
        if (currentIteration < totalLoops) {
          // Natural breathing pause between calls (400ms)
          timerId = setTimeout(() => {
            if (!cancelled) {
              playNext();
            }
          }, 400);
        } else {
          onComplete?.();
        }
      });

      // Safety timeout if onended fails or in mock test environment
      if (duration === 0) {
        timerId = setTimeout(() => {
          if (!cancelled && currentIteration < totalLoops) {
            playNext();
          } else if (!cancelled) {
            onComplete?.();
          }
        }, 1200);
      }
    };

    playNext();

    const cancel = () => {
      cancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (this.activeSourceNode) {
        try {
          this.activeSourceNode.stop();
        } catch {}
        this.activeSourceNode = null;
      }
      if (this.currentLoopCancel === cancel) {
        this.currentLoopCancel = null;
      }
    };

    this.currentLoopCancel = cancel;
    return cancel;
  }

  public stopLoop(): void {
    if (this.currentLoopCancel) {
      this.currentLoopCancel();
      this.currentLoopCancel = null;
    }
  }

  private playSynthesizedSound(creatureId: string, ctx: AudioContext): void {
    switch (creatureId) {
      case 'duck':
        this.playDuckQuack(ctx);
        break;
      case 'frog':
        this.playFrogRibbit(ctx);
        break;
      case 'bird':
        this.playBirdTweet(ctx);
        break;
      case 'owl':
        this.playOwlHoot(ctx);
        break;
      case 'bee':
        this.playBeeBzz(ctx);
        break;
    }
  }

  private playDuckQuack(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const burst = (t: number, fStart: number, fEnd: number, dur: number) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(fStart, t);
      osc.frequency.exponentialRampToValueAtTime(fEnd, t + dur);

      filter.type = 'bandpass';
      filter.Q.setValueAtTime(5.2, t);
      filter.frequency.setValueAtTime(1350, t);
      filter.frequency.exponentialRampToValueAtTime(700, t + dur);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.36, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + dur + 0.04);
    };

    burst(now + 0.02, 350, 215, 0.22);
    burst(now + 0.28, 305, 195, 0.19);
  }

  private playFrogRibbit(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const croakPulse = (
      t: number,
      fStart: number,
      fEnd: number,
      dur: number
    ) => {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      lfo.frequency.setValueAtTime(45, t);
      lfoGain.gain.setValueAtTime(28, t);
      lfo.connect(osc.frequency);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(fStart, t);
      osc.frequency.linearRampToValueAtTime(fEnd, t + dur);

      filter.type = 'bandpass';
      filter.Q.setValueAtTime(6.0, t);
      filter.frequency.setValueAtTime(460, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(t);
      osc.start(t);
      lfo.stop(t + dur + 0.05);
      osc.stop(t + dur + 0.05);
    };

    croakPulse(now + 0.02, 110, 140, 0.13);
    croakPulse(now + 0.17, 135, 85, 0.19);
    croakPulse(now + 0.42, 105, 135, 0.13);
    croakPulse(now + 0.57, 130, 80, 0.19);
  }

  private playBirdTweet(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const chirp = (
      t: number,
      fStart: number,
      fPeak: number,
      fEnd: number,
      dur: number
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fStart, t);
      osc.frequency.linearRampToValueAtTime(fPeak, t + dur * 0.45);
      osc.frequency.exponentialRampToValueAtTime(fEnd, t + dur);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + dur + 0.03);
    };

    chirp(now + 0.02, 2300, 3200, 2500, 0.11);
    chirp(now + 0.16, 2700, 3500, 2400, 0.13);
    chirp(now + 0.33, 2200, 3700, 3100, 0.12);
  }

  private playOwlHoot(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const hoot = (
      t: number,
      fStart: number,
      fMid: number,
      fEnd: number,
      dur: number
    ) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      const subGain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(fStart, t);
      osc1.frequency.linearRampToValueAtTime(fMid, t + dur * 0.4);
      osc1.frequency.exponentialRampToValueAtTime(fEnd, t + dur);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(fStart * 2, t);
      osc2.frequency.linearRampToValueAtTime(fMid * 2, t + dur * 0.4);
      osc2.frequency.exponentialRampToValueAtTime(fEnd * 2, t + dur);
      subGain.gain.setValueAtTime(0.18, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.06);
      gain.gain.setValueAtTime(0.28, t + dur * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc1.connect(filter);
      osc2.connect(subGain);
      subGain.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + dur + 0.05);
      osc2.stop(t + dur + 0.05);
    };

    hoot(now + 0.02, 285, 295, 260, 0.28);
    hoot(now + 0.42, 275, 310, 245, 0.52);
  }

  private playBeeBzz(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    lfo.frequency.setValueAtTime(42, now);
    lfoGain.gain.setValueAtTime(32, now);
    lfo.connect(osc.frequency);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(205, now);
    osc.frequency.linearRampToValueAtTime(245, now + 0.35);
    osc.frequency.linearRampToValueAtTime(195, now + 0.75);

    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.5, now);
    filter.frequency.setValueAtTime(1150, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.08);
    gain.gain.setValueAtTime(0.26, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.8);
    osc.stop(now + 0.8);
  }
}
