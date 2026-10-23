import type Phaser from 'phaser';
import { BasePreschoolActivity } from './BasePreschoolActivity';

export interface SoundCreature {
  id: string;
  emoji: string;
  color: number;
  soundName: string;
  accentColor: string;
}

export const CREATURES: SoundCreature[] = [
  { id: 'duck', emoji: '🦆', color: 0x52b788, soundName: 'Quack', accentColor: '#ffbe0b' },
  { id: 'frog', emoji: '🐸', color: 0x40916c, soundName: 'Ribbit', accentColor: '#74c69d' },
  { id: 'bird', emoji: '🐦', color: 0x4cc9f0, soundName: 'Tweet', accentColor: '#90e0ef' },
  { id: 'owl', emoji: '🦉', color: 0xf4a261, soundName: 'Hoot', accentColor: '#ffd166' },
  { id: 'bee', emoji: '🐝', color: 0xffd166, soundName: 'Bzz', accentColor: '#ffbe0b' }
];

/**
 * Procedural Web Audio Synthesizer:
 * Zero external audio files or CDNs needed. Guarantees authentic, charming,
 * audible animal calls and joyful tactile feedback 100% offline and local-first.
 */
export class PhonicsAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private unlocked = false;

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
      ctx.resume().then(() => {
        this.unlocked = true;
      }).catch(() => {});
    } else {
      this.unlocked = true;
    }
  }

  public isReady(): boolean {
    const ctx = this.getContext();
    return !!ctx && (ctx.state === 'running' || this.unlocked);
  }

  public playCreatureSound(creatureId: string): void {
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlock();

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

  /**
   * Duck: Resonant, bandpass-filtered harmonic quack sweep ("Quack ... quack!").
   */
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

  /**
   * Frog: Low, resonant guttural croak bursts with tremolo flutter ("Rib-bit!").
   */
  private playFrogRibbit(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const croakPulse = (t: number, fStart: number, fEnd: number, dur: number) => {
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

  /**
   * Bird: Sweet, bright ascending and warbling frequency chirps ("Tweet ... chirp!").
   */
  private playBirdTweet(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const chirp = (t: number, fStart: number, fPeak: number, fEnd: number, dur: number) => {
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

  /**
   * Owl: Deep, mellow, hollow dual-tone woodland call ("Hoo ... Hoo-oo").
   */
  private playOwlHoot(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const hoot = (t: number, fStart: number, fMid: number, fEnd: number, dur: number) => {
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

  /**
   * Bee: Rapid wing-flutter vibrato tone with soft drift ("Bzzzzz!").
   */
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

  /**
   * Rewarding water splash & cheerful golden chime arpeggio upon puzzle solve.
   */
  public playSplashSuccess(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlock();
    const now = ctx.currentTime;

    // Splash lowpass burst
    const splashOsc = ctx.createOscillator();
    const splashFilter = ctx.createBiquadFilter();
    const splashGain = ctx.createGain();

    splashOsc.type = 'triangle';
    splashOsc.frequency.setValueAtTime(180, now);
    splashOsc.frequency.exponentialRampToValueAtTime(45, now + 0.28);

    splashFilter.type = 'lowpass';
    splashFilter.frequency.setValueAtTime(800, now);
    splashFilter.frequency.exponentialRampToValueAtTime(150, now + 0.28);

    splashGain.gain.setValueAtTime(0.3, now);
    splashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    splashOsc.connect(splashFilter);
    splashFilter.connect(splashGain);
    splashGain.connect(ctx.destination);
    splashOsc.start(now);
    splashOsc.stop(now + 0.3);

    // Chime arpeggio: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const noteTime = now + 0.08 + idx * 0.07;
      const noteOsc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      noteOsc.type = 'sine';
      noteOsc.frequency.setValueAtTime(freq, noteTime);

      noteGain.gain.setValueAtTime(0.001, noteTime);
      noteGain.gain.linearRampToValueAtTime(0.22, noteTime + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      noteOsc.connect(noteGain);
      noteGain.connect(ctx.destination);

      noteOsc.start(noteTime);
      noteOsc.stop(noteTime + 0.38);
    });
  }

  /**
   * Gentle snapback tap when an incorrect animal returns to shelf.
   */
  public playGentleSnapback(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlock();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }
}

/**
 * Procedural Vector Drawing Generator for Phonics Pond:
 * Renders large, high-resolution (256x256), storybook character illustrations
 * directly to HTML5 Canvas textures. Gives crisp, expressive, toddler-friendly
 * drawings for each woodland creature.
 */
export class PhonicsCreatureTextureBuilder {
  public static ensureCreatureTextures(scene: Phaser.Scene): void {
    for (const creature of CREATURES) {
      const texKey = `phonics_creature_${creature.id}`;
      if (scene.textures.exists(texKey)) {
        continue;
      }

      const size = 256;
      const canvasTex = scene.textures.createCanvas(texKey, size, size);
      const ctx = canvasTex?.getContext();
      if (!ctx || !canvasTex) continue;

      ctx.save();
      ctx.clearRect(0, 0, size, size);

      switch (creature.id) {
        case 'duck':
          this.drawDuckIllustration(ctx, size);
          break;
        case 'frog':
          this.drawFrogIllustration(ctx, size);
          break;
        case 'bird':
          this.drawBirdIllustration(ctx, size);
          break;
        case 'owl':
          this.drawOwlIllustration(ctx, size);
          break;
        case 'bee':
          this.drawBeeIllustration(ctx, size);
          break;
      }

      ctx.restore();
      canvasTex.refresh();
    }
  }

  /**
   * Duck: Plump yellow duckling with orange bill, glossy eye, and water ripple base.
   */
  private static drawDuckIllustration(ctx: CanvasRenderingContext2D, size: number): void {
    // Soft sunny halo
    const halo = ctx.createRadialGradient(128, 128, 10, 128, 128, 115);
    halo.addColorStop(0, 'rgba(255, 238, 186, 0.45)');
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Pond water ripples at bottom
    ctx.strokeStyle = '#48cae4';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(128, 205, 75, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(118, 222, 50, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Body gradient
    const bodyGrad = ctx.createLinearGradient(60, 90, 180, 190);
    bodyGrad.addColorStop(0, '#ffd166');
    bodyGrad.addColorStop(1, '#f77f00');
    ctx.fillStyle = bodyGrad;

    // Plump body oval
    ctx.beginPath();
    ctx.ellipse(115, 145, 68, 52, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Cute perky tail
    ctx.beginPath();
    ctx.moveTo(55, 145);
    ctx.quadraticCurveTo(30, 120, 22, 105);
    ctx.quadraticCurveTo(45, 125, 65, 130);
    ctx.closePath();
    ctx.fill();

    // Folded wing
    const wingGrad = ctx.createLinearGradient(80, 120, 140, 175);
    wingGrad.addColorStop(0, '#ee9b00');
    wingGrad.addColorStop(1, '#ca6702');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.ellipse(105, 148, 42, 28, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(102, 146, 24, 0.3, Math.PI - 0.4);
    ctx.stroke();

    // Duck neck & head
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(135, 140);
    ctx.quadraticCurveTo(155, 115, 155, 85);
    ctx.quadraticCurveTo(115, 80, 105, 130);
    ctx.fill();

    // Head circle
    ctx.beginPath();
    ctx.arc(155, 80, 42, 0, Math.PI * 2);
    ctx.fill();

    // Crest feather tuft on head
    ctx.beginPath();
    ctx.moveTo(150, 42);
    ctx.quadraticCurveTo(145, 18, 135, 22);
    ctx.quadraticCurveTo(152, 28, 158, 40);
    ctx.fill();

    // Bright orange duck bill
    const billGrad = ctx.createLinearGradient(180, 75, 235, 95);
    billGrad.addColorStop(0, '#f77f00');
    billGrad.addColorStop(1, '#d9480f');
    ctx.fillStyle = billGrad;
    ctx.beginPath();
    ctx.moveTo(185, 70);
    ctx.quadraticCurveTo(235, 74, 238, 88);
    ctx.quadraticCurveTo(220, 102, 180, 95);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a2810';
    ctx.beginPath();
    ctx.arc(195, 80, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Expressive cartoon eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(162, 70, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#102015';
    ctx.beginPath();
    ctx.arc(166, 70, 9, 0, Math.PI * 2);
    ctx.fill();
    // Catchlight sparkles
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(164, 66, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(168, 73, 2, 0, Math.PI * 2);
    ctx.fill();

    // Rosy cheek
    ctx.fillStyle = 'rgba(255, 107, 107, 0.4)';
    ctx.beginPath();
    ctx.arc(152, 92, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Frog: Vibrant lime frog with bulging friendly eyes, wide smile, and lily pad.
   */
  private static drawFrogIllustration(ctx: CanvasRenderingContext2D, size: number): void {
    // Soft lagoon halo
    const halo = ctx.createRadialGradient(128, 128, 10, 128, 128, 115);
    halo.addColorStop(0, 'rgba(183, 228, 199, 0.45)');
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Lily pad base
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.ellipse(128, 205, 85, 28, 0, 0.25, Math.PI * 1.95);
    ctx.lineTo(128, 205);
    ctx.closePath();
    ctx.fill();

    // Body gradient
    const frogGrad = ctx.createLinearGradient(70, 70, 180, 190);
    frogGrad.addColorStop(0, '#52b788');
    frogGrad.addColorStop(1, '#2d6a4f');
    ctx.fillStyle = frogGrad;

    // Plump frog body
    ctx.beginPath();
    ctx.ellipse(128, 145, 72, 58, 0, 0, Math.PI * 2);
    ctx.fill();

    // Light belly patch
    ctx.fillStyle = '#d8f3dc';
    ctx.beginPath();
    ctx.ellipse(128, 156, 46, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bulging eye mounds
    ctx.fillStyle = frogGrad;
    ctx.beginPath();
    ctx.arc(88, 70, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(168, 70, 28, 0, Math.PI * 2);
    ctx.fill();

    // Sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(88, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(168, 70, 22, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#102015';
    ctx.beginPath();
    ctx.arc(90, 70, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(166, 70, 13, 0, Math.PI * 2);
    ctx.fill();

    // Twin catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(86, 65, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(162, 65, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(92, 74, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(168, 74, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Wide friendly smile
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(128, 118, 46, 0.25, Math.PI - 0.25);
    ctx.stroke();

    // Rosy pink cheeks
    ctx.fillStyle = 'rgba(255, 154, 162, 0.55)';
    ctx.beginPath();
    ctx.arc(72, 122, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(184, 122, 13, 0, Math.PI * 2);
    ctx.fill();

    // Front webbed hands
    ctx.fillStyle = '#52b788';
    ctx.beginPath();
    ctx.arc(92, 192, 8, 0, Math.PI * 2);
    ctx.arc(106, 195, 8, 0, Math.PI * 2);
    ctx.arc(150, 195, 8, 0, Math.PI * 2);
    ctx.arc(164, 192, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Bird: Sweet singing bluebird with open beak and floating musical notes.
   */
  private static drawBirdIllustration(ctx: CanvasRenderingContext2D, size: number): void {
    // Sky blue halo
    const halo = ctx.createRadialGradient(128, 128, 10, 128, 128, 115);
    halo.addColorStop(0, 'rgba(202, 240, 248, 0.45)');
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Tail feathers
    ctx.fillStyle = '#023e8a';
    ctx.beginPath();
    ctx.moveTo(75, 135);
    ctx.lineTo(26, 92);
    ctx.lineTo(38, 115);
    ctx.lineTo(24, 112);
    ctx.lineTo(44, 138);
    ctx.closePath();
    ctx.fill();

    // Body gradient
    const birdGrad = ctx.createLinearGradient(80, 80, 180, 180);
    birdGrad.addColorStop(0, '#4cc9f0');
    birdGrad.addColorStop(1, '#0077b6');
    ctx.fillStyle = birdGrad;

    // Chubby body
    ctx.beginPath();
    ctx.ellipse(120, 140, 60, 52, -0.12, 0, Math.PI * 2);
    ctx.fill();

    // Soft cream breast
    ctx.fillStyle = '#ffe8d6';
    ctx.beginPath();
    ctx.ellipse(145, 148, 34, 38, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = birdGrad;
    ctx.beginPath();
    ctx.arc(155, 82, 42, 0, Math.PI * 2);
    ctx.fill();

    // Cute crest feather
    ctx.beginPath();
    ctx.moveTo(145, 42);
    ctx.quadraticCurveTo(140, 18, 130, 22);
    ctx.quadraticCurveTo(150, 26, 152, 42);
    ctx.fill();

    // Indigo wing
    const wingGrad = ctx.createLinearGradient(90, 115, 145, 170);
    wingGrad.addColorStop(0, '#023e8a');
    wingGrad.addColorStop(1, '#0077b6');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.ellipse(105, 142, 40, 26, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Parted singing beak
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(185, 75);
    ctx.lineTo(225, 78);
    ctx.lineTo(185, 86);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(185, 89);
    ctx.lineTo(220, 95);
    ctx.lineTo(185, 96);
    ctx.closePath();
    ctx.fill();

    // Floating musical notes
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('♪', 230, 65);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('♫', 240, 42);

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(165, 74, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#102015';
    ctx.beginPath();
    ctx.arc(167, 74, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(165, 71, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Cheek
    ctx.fillStyle = 'rgba(255, 107, 107, 0.4)';
    ctx.beginPath();
    ctx.arc(158, 92, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Owl: Cuddly woodland owl with huge glowing golden eyes, ear tufts, and facial disc.
   */
  private static drawOwlIllustration(ctx: CanvasRenderingContext2D, size: number): void {
    // Warm amber halo
    const halo = ctx.createRadialGradient(128, 128, 10, 128, 128, 115);
    halo.addColorStop(0, 'rgba(255, 230, 169, 0.45)');
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Ear tufts (horns)
    ctx.fillStyle = '#8c4e0b';
    ctx.beginPath();
    ctx.moveTo(78, 80);
    ctx.lineTo(58, 30);
    ctx.lineTo(96, 68);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(178, 80);
    ctx.lineTo(198, 30);
    ctx.lineTo(160, 68);
    ctx.closePath();
    ctx.fill();

    // Body gradient
    const owlGrad = ctx.createLinearGradient(70, 70, 180, 190);
    owlGrad.addColorStop(0, '#bc6c25');
    owlGrad.addColorStop(1, '#8c4e0b');
    ctx.fillStyle = owlGrad;

    // Plump body
    ctx.beginPath();
    ctx.ellipse(128, 148, 68, 62, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heart-shaped cream facial disc
    ctx.fillStyle = '#fefae0';
    ctx.beginPath();
    ctx.arc(102, 92, 36, 0, Math.PI * 2);
    ctx.arc(154, 92, 36, 0, Math.PI * 2);
    ctx.fill();

    // Enormous golden owl eyes
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#d4a373';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(102, 92, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(154, 92, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupils
    ctx.fillStyle = '#1a140d';
    ctx.beginPath();
    ctx.arc(102, 92, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(154, 92, 15, 0, Math.PI * 2);
    ctx.fill();

    // Twin sparkles
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(98, 87, 5, 0, Math.PI * 2);
    ctx.arc(150, 87, 5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f77f00';
    ctx.beginPath();
    ctx.moveTo(122, 106);
    ctx.lineTo(134, 106);
    ctx.lineTo(128, 124);
    ctx.closePath();
    ctx.fill();

    // Feather chevrons on chest
    ctx.strokeStyle = '#dda15e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const drawChevron = (cx: number, cy: number) => {
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy - 4);
      ctx.lineTo(cx, cy + 3);
      ctx.lineTo(cx + 7, cy - 4);
      ctx.stroke();
    };
    drawChevron(112, 152);
    drawChevron(128, 158);
    drawChevron(144, 152);
    drawChevron(120, 172);
    drawChevron(136, 172);

    // Wings
    ctx.fillStyle = '#6f3e09';
    ctx.beginPath();
    ctx.ellipse(64, 155, 18, 38, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(192, 155, 18, 38, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Bee: Friendly striped bumblebee with large gossamer wings and cute antennae.
   */
  private static drawBeeIllustration(ctx: CanvasRenderingContext2D, size: number): void {
    // Golden sunshine halo
    const halo = ctx.createRadialGradient(128, 128, 10, 128, 128, 115);
    halo.addColorStop(0, 'rgba(255, 238, 186, 0.45)');
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Gossamer wings
    ctx.fillStyle = 'rgba(224, 251, 252, 0.88)';
    ctx.strokeStyle = 'rgba(72, 202, 228, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(96, 68, 28, 52, -0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(160, 68, 28, 52, 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Antennae
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(110, 95);
    ctx.quadraticCurveTo(95, 65, 84, 58);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(146, 95);
    ctx.quadraticCurveTo(161, 65, 172, 58);
    ctx.stroke();
    // Bobble tips
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(84, 58, 6, 0, Math.PI * 2);
    ctx.arc(172, 58, 6, 0, Math.PI * 2);
    ctx.fill();

    // Bee body
    const beeGrad = ctx.createLinearGradient(70, 70, 180, 190);
    beeGrad.addColorStop(0, '#ffbe0b');
    beeGrad.addColorStop(1, '#fb5607');
    ctx.fillStyle = beeGrad;
    ctx.beginPath();
    ctx.ellipse(128, 146, 62, 54, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bold velvety black stripes
    ctx.fillStyle = '#212529';
    ctx.beginPath();
    ctx.roundRect(75, 134, 106, 16, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(85, 165, 86, 15, 6);
    ctx.fill();

    // Stinger
    ctx.beginPath();
    ctx.moveTo(123, 200);
    ctx.lineTo(133, 200);
    ctx.lineTo(128, 214);
    ctx.closePath();
    ctx.fill();

    // Big happy eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(108, 114, 12, 0, Math.PI * 2);
    ctx.arc(148, 114, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#102015';
    ctx.beginPath();
    ctx.arc(110, 114, 8, 0, Math.PI * 2);
    ctx.arc(146, 114, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(108, 111, 3.5, 0, Math.PI * 2);
    ctx.arc(144, 111, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Sweet smile
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(128, 124, 13, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Cheeks
    ctx.fillStyle = 'rgba(255, 107, 107, 0.45)';
    ctx.beginPath();
    ctx.arc(92, 126, 9, 0, Math.PI * 2);
    ctx.arc(164, 126, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class PhonicsPondActivity extends BasePreschoolActivity {
  private currentPlayContext?: {
    scene: Phaser.Scene;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  };
  public readonly audioSynth = new PhonicsAudioSynthesizer();

  constructor() {
    super({
      id: 'phonics_pond',
      title: 'Phonics Pond (Language)',
      shortTitle: 'Phonics Pond',
      pillar: 'Creativity',
      knowledgeTags: ['language', 'science'],
      description:
        'Listen to iconic woodland calls and match friendly animal cards to the singing pond.',
      parentGuide: {
        pedagogicalGoals:
          'Builds pre-reading phonological awareness, sound-symbol connection, active listening, and creature identification without requiring text.',
        parentRecommendation:
          'Make playful sounds together! Ask your child "Who says ribbit?" or "Can you make a sound like a quiet bee?" to reinforce auditory imitation.'
      },
      animalInstructor: 'owl',
      backgroundKey: 'bg_phonics_pond',
      backgroundUrl: './bg-phonics-pond.jpg'
    });
  }

  protected setupGameplay(context: {
    scene: Phaser.Scene;
    container: Phaser.GameObjects.Container;
    playArea: Phaser.GameObjects.Container;
    onInstanceSolved: (desc: string) => void;
    onWrongAttempt: (desc: string) => void;
  }): void {
    this.currentPlayContext = context;

    // Build the high-resolution vector animal textures on canvas
    PhonicsCreatureTextureBuilder.ensureCreatureTextures(context.scene);

    // Unlock Web Audio context on the first user interaction
    context.scene.input.on('pointerdown', () => {
      this.audioSynth.unlock();
    });

    this.advanceNextInstance();
  }

  protected advanceNextInstance(): void {
    if (!this.currentPlayContext) return;
    const { scene, playArea, onInstanceSolved, onWrongAttempt } =
      this.currentPlayContext;
    playArea.removeAll(true);

    const starProgress = this.getStarProgress();
    const starLevel = starProgress.starsEarned;

    // Number of animal choices:
    // Star 1 (Level 1): 1 creature (introductory direct match)
    // Star 2 (Level 2): 2 creatures (discrimination between 2 calls)
    // Star 3 (Level 3): 3 creatures
    // Star 4 (Level 4): 4 creatures
    // Star 5 (Level 5): 5 creatures
    const choiceCount = Math.min(5, starLevel + 1);

    // Shuffle and select distinct active creatures for rich variety each round
    const shuffledPool = [...CREATURES].sort(() => Math.random() - 0.5);
    const activeCreatures = shuffledPool.slice(0, choiceCount);

    // Pick 1 target creature whose sound is singing from the pond
    const targetCreature =
      activeCreatures[Math.floor(Math.random() * activeCreatures.length)];

    // Play target sound when instance begins
    this.audioSynth.playCreatureSound(targetCreature.id);

    // --- POND SETUP (Top Center) ---
    const pondY = -35;
    const pondContainer = scene.add.container(0, pondY);

    // Shoreline mossy base
    const pondShore = scene.add
      .ellipse(0, 0, 400, 155, 0x1b4332, 0.95)
      .setStrokeStyle(5, 0x2d6a4f);

    // Deep lagoon water
    const pondDeepWater = scene.add
      .ellipse(0, 0, 376, 140, 0x093a3e, 0.98)
      .setStrokeStyle(3, 0x48cae4);

    // Inner shimmering turquoise ripple
    const pondShimmer = scene.add
      .ellipse(0, 0, 330, 115, 0x0f4c5c, 0.85)
      .setStrokeStyle(2, 0x90e0ef);

    // Animated water ripple rings expanding outward
    const ripple1 = scene.add
      .ellipse(0, 0, 140, 60)
      .setStrokeStyle(2, 0x48cae4, 0.7);
    const ripple2 = scene.add
      .ellipse(0, 0, 210, 85)
      .setStrokeStyle(1.5, 0x80ed99, 0.5);

    scene.tweens.add({
      targets: [ripple1, ripple2],
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0,
      duration: 1800,
      repeat: -1,
      ease: 'Sine.easeOut'
    });

    // Water lilies on the pond rim
    const lilyPadLeft = scene.add
      .ellipse(-145, -15, 48, 26, 0x2d6a4f, 0.9)
      .setStrokeStyle(2, 0x52b788);
    const lilyFlowerLeft = scene.add
      .text(-145, -18, '🌸', { fontSize: '18px' })
      .setOrigin(0.5);

    const lilyPadRight = scene.add
      .ellipse(145, -15, 48, 26, 0x2d6a4f, 0.9)
      .setStrokeStyle(2, 0x52b788);
    const lilyFlowerRight = scene.add
      .text(145, -18, '🪷', { fontSize: '18px' })
      .setOrigin(0.5);

    // Center Singing Speaker Button / Sound Horn
    const speakerContainer = scene.add.container(0, 0);

    const speakerGlow = scene.add
      .circle(0, 0, 46, 0xffd166, 0.25)
      .setStrokeStyle(2, 0xffd166, 0.6);

    const speakerBg = scene.add
      .circle(0, 0, 36, 0x143628, 0.98)
      .setStrokeStyle(3.5, 0xffd166);

    const speakerIcon = scene.add
      .text(0, -2, '🔊', { fontSize: '32px' })
      .setOrigin(0.5);

    // Concentric sound wave circles that radiate on sound replay
    const soundWaveRing = scene.add
      .circle(0, 0, 48)
      .setStrokeStyle(3, 0xffd166, 0.9)
      .setScale(0.8)
      .setAlpha(0);

    // Sound callout pill banner: shows animal sound hint with music notes
    const calloutBubble = scene.add
      .rectangle(0, 42, 170, 28, 0x0a1c13, 0.92)
      .setStrokeStyle(2, 0x52b788);

    const calloutText = scene.add
      .text(0, 42, `♪ "${targetCreature.soundName}!" ♪`, {
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: '15px',
        color: '#ffd166',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    // Floating helpful hint below pond
    const listenHint = scene.add
      .text(0, 68, 'Tap pond to listen again 🔊', {
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: '12px',
        color: '#95d5b2',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    speakerContainer.add([
      speakerGlow,
      speakerBg,
      speakerIcon,
      soundWaveRing,
      calloutBubble,
      calloutText,
      listenHint
    ]);

    pondContainer.add([
      pondShore,
      pondDeepWater,
      pondShimmer,
      ripple1,
      ripple2,
      lilyPadLeft,
      lilyFlowerLeft,
      lilyPadRight,
      lilyFlowerRight,
      speakerContainer
    ]);
    playArea.add(pondContainer);

    // Radiating idle pulse on speaker button
    scene.tweens.add({
      targets: speakerGlow,
      scale: 1.18,
      alpha: 0.5,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const triggerPlaySoundAnimation = () => {
      this.audioSynth.playCreatureSound(targetCreature.id);

      // Bounce speaker button
      scene.tweens.add({
        targets: speakerContainer,
        scale: 1.15,
        duration: 150,
        yoyo: true,
        ease: 'Back.easeOut'
      });

      // Sound wave radiant burst
      soundWaveRing.setScale(0.8).setAlpha(0.95);
      scene.tweens.add({
        targets: soundWaveRing,
        scale: 2.1,
        alpha: 0,
        duration: 650,
        ease: 'Cubic.easeOut'
      });

      // Shimmer flash on water
      pondShimmer.setStrokeStyle(3, 0xffd166);
      scene.time.delayedCall(450, () => {
        if (pondShimmer.active) {
          pondShimmer.setStrokeStyle(2, 0x90e0ef);
        }
      });
    };

    // Make pond and speaker interactive to replay the target call
    pondDeepWater.setInteractive({ useHandCursor: true });
    speakerBg.setInteractive({ useHandCursor: true });
    speakerIcon.setInteractive({ useHandCursor: true });

    pondDeepWater.on('pointerdown', triggerPlaySoundAnimation);
    speakerBg.on('pointerdown', triggerPlaySoundAnimation);
    speakerIcon.on('pointerdown', triggerPlaySoundAnimation);

    // Initial sound wave burst when scene starts
    scene.time.delayedCall(120, () => {
      if (soundWaveRing.active) {
        triggerPlaySoundAnimation();
      }
    });

    // --- ANIMAL CARDS SHELF (Bottom) ---
    const shelfY = 118;
    const shelf = scene.add
      .rectangle(0, shelfY, 640, 140, 0x0e1b12, 0.94)
      .setStrokeStyle(2.5, 0x2d6a4f);

    const shelfTrim = scene.add
      .rectangle(0, shelfY - 68, 640, 4, 0x52b788, 1);
    playArea.add([shelf, shelfTrim]);

    // Adaptive card dimensions based on choice count (maximizes drawing size!):
    // 1 choice: 145x138 card, 108px drawing
    // 2 choices: 135x132 card, 98px drawing
    // 3 choices: 126x126 card, 92px drawing
    // 4 choices: 118x120 card, 86px drawing
    // 5 choices: 112x118 card, 80px drawing
    const cardMetrics = [
      { cardW: 145, cardH: 138, drawSize: 108, spacing: 0 },
      { cardW: 135, cardH: 132, drawSize: 98, spacing: 190 },
      { cardW: 126, cardH: 126, drawSize: 92, spacing: 160 },
      { cardW: 118, cardH: 120, drawSize: 86, spacing: 135 },
      { cardW: 112, cardH: 118, drawSize: 80, spacing: 122 }
    ][choiceCount - 1];

    const { cardW, cardH, drawSize, spacing } = cardMetrics;
    const startX = -((choiceCount - 1) * spacing) / 2;

    activeCreatures.forEach((creature, i) => {
      const cx = choiceCount === 1 ? 0 : startX + i * spacing;

      // Recessed silhouette slot on shelf
      const slotGuide = scene.add
        .rectangle(cx, shelfY, cardW + 8, cardH + 8, 0x09140c, 0.85)
        .setStrokeStyle(1.5, 0x1b4332);
      playArea.add(slotGuide);

      // Card container
      const card = scene.add.container(cx, shelfY);

      // Tactile drop shadow
      const cardShadow = scene.add
        .rectangle(2, 5, cardW, cardH, 0x000000, 0.4)
        .setOrigin(0.5);

      // Rounded tile surface with creature theme border
      const cardBg = scene.add
        .rectangle(0, 0, cardW, cardH, 0x162c1e, 0.98)
        .setStrokeStyle(3.5, creature.color);

      // Inner card gradient shimmer
      const cardInner = scene.add
        .rectangle(0, 0, cardW - 8, cardH - 8, 0x1b3826, 0.95);

      // Large Illustrated Character Drawing (256x256 vector procedural canvas)
      const texKey = `phonics_creature_${creature.id}`;
      let artwork: Phaser.GameObjects.GameObject;

      if (scene.textures.exists(texKey)) {
        artwork = scene.add
          .image(0, -12, texKey)
          .setDisplaySize(drawSize, drawSize);
      } else {
        // High-contrast fallback for headless / mock test environments
        artwork = scene.add
          .text(0, -12, creature.emoji, { fontSize: `${Math.round(drawSize * 0.72)}px` })
          .setOrigin(0.5);
      }

      // Bottom sound badge pill
      const badgePill = scene.add
        .rectangle(0, cardH / 2 - 18, cardW - 20, 24, 0x0d1f14, 0.92)
        .setStrokeStyle(1.5, creature.color);

      const badgeText = scene.add
        .text(0, cardH / 2 - 18, `${creature.emoji} ${creature.soundName}`, {
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: '13px',
          color: '#ffd166',
          fontStyle: 'bold'
        })
        .setOrigin(0.5);

      card.add([cardShadow, cardBg, cardInner, artwork, badgePill, badgeText]);
      card.setSize(cardW, cardH);
      card.setInteractive({ useHandCursor: true, draggable: true });
      playArea.add(card);

      scene.input.setDraggable(card);

      // Tap on card previews its animal sound
      card.on('pointerdown', () => {
        this.audioSynth.playCreatureSound(creature.id);
        scene.tweens.add({
          targets: card,
          scale: 1.06,
          duration: 120,
          yoyo: true,
          ease: 'Sine.easeInOut'
        });
      });

      card.on('dragstart', () => {
        card.setDepth(200);
        scene.tweens.add({
          targets: card,
          scale: 1.14,
          duration: 140,
          ease: 'Back.easeOut'
        });
      });

      card.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          card.setPosition(dragX, dragY);

          // Visual highlight on pond when hovering near drop target
          const dist = Math.hypot(card.x, card.y - pondY);
          if (dist < 140) {
            pondShore.setStrokeStyle(5, 0xffd166);
            pondDeepWater.setStrokeStyle(3, 0xffd166);
          } else {
            pondShore.setStrokeStyle(5, 0x2d6a4f);
            pondDeepWater.setStrokeStyle(3, 0x48cae4);
          }
        }
      );

      card.on('dragend', () => {
        card.setDepth(100);
        pondShore.setStrokeStyle(5, 0x2d6a4f);
        pondDeepWater.setStrokeStyle(3, 0x48cae4);

        const dist = Math.hypot(card.x, card.y - pondY);
        const inPondBounds =
          dist < 140 ||
          (Math.abs(card.x) < 180 && Math.abs(card.y - pondY) < 70);

        if (inPondBounds) {
          if (creature.id === targetCreature.id) {
            // Correct creature matched to sound!
            card.disableInteractive();

            // Joyful water splash and arpeggio
            this.audioSynth.playSplashSuccess();

            // Splash rings animation
            const splashRing = scene.add
              .ellipse(0, pondY, 60, 28)
              .setStrokeStyle(3.5, 0xffd166, 0.95);
            playArea.add(splashRing);

            scene.tweens.add({
              targets: splashRing,
              scaleX: 2.8,
              scaleY: 2.8,
              alpha: 0,
              duration: 650,
              ease: 'Cubic.easeOut',
              onComplete: () => splashRing.destroy()
            });

            // Card snaps to pond center with triumphant scale celebration
            scene.tweens.add({
              targets: card,
              x: 0,
              y: pondY,
              scale: 1.28,
              duration: 250,
              ease: 'Back.easeOut'
            });

            onInstanceSolved(
              `Matched "${targetCreature.soundName}" call to ${targetCreature.emoji} (${targetCreature.id}) in Phonics Pond (Star Level ${starLevel + 1})`
            );
          } else {
            // Wrong creature: gentle snapback and soft tap
            this.audioSynth.playGentleSnapback();

            onWrongAttempt(
              `Matched ${creature.emoji} (${creature.id}) to "${targetCreature.soundName}" call`
            );

            // Gentle shake and return to shelf slot
            scene.tweens.add({
              targets: card,
              rotation: 0.1,
              duration: 90,
              yoyo: true,
              repeat: 1,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                if (card.active) card.setRotation(0);
              }
            });

            scene.tweens.add({
              targets: card,
              x: cx,
              y: shelfY,
              scale: 1.0,
              duration: 240,
              ease: 'Cubic.easeOut'
            });
          }
        } else {
          // Dropped outside pond: smooth snap back to shelf
          scene.tweens.add({
            targets: card,
            x: cx,
            y: shelfY,
            scale: 1.0,
            duration: 220,
            ease: 'Cubic.easeOut'
          });
        }
      });
    });
  }
}

export const phonicsPondActivity = new PhonicsPondActivity();
export default phonicsPondActivity;
