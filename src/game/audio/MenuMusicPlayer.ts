import { loadAudioPrefs } from './AudioPrefs.js';

// Once the user has interacted with the page, AudioContext can be created freely.
// Track this at module level so subsequent play() calls after stop() start immediately.
let pageHasUserGesture = false;

// A minor, 90 BPM — chill retrowave/synthwave
const BPM = 90;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const NOTE: Record<string, number> = {
  A2: 110.00,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
  A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
  F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
  D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  rest: 0,
};

type Beat = [string, number];

// Slow expressive lead — 16 bars, chord prog: Am(1-4) F(5-8) C(9-12) G(13-16)
const LEAD: Beat[] = [
  // Phrase 1 (bars 1-4): Am → F
  ['E5', 3], ['rest', 1],
  ['D5', 2], ['C5', 2],
  ['C5', 3], ['rest', 1],
  ['A4', 2], ['rest', 2],
  // Phrase 2 (bars 5-8): C → G
  ['G4', 2], ['E5', 2],
  ['C5', 3], ['rest', 1],
  ['B4', 2], ['D5', 2],
  ['G4', 4],
  // Phrase 3 (bars 9-12): Am → F, higher energy
  ['E5', 2], ['A5', 2],
  ['G5', 1], ['E5', 1], ['D5', 2],
  ['F5', 3], ['rest', 1],
  ['C5', 2], ['A4', 2],
  // Phrase 4 (bars 13-16): C → G → resolve
  ['E5', 2], ['G5', 2],
  ['A5', 3], ['G5', 1],
  ['F5', 1], ['E5', 1], ['D5', 1], ['C5', 1],
  ['A4', 4],
];

// 8th-note arpeggios following chord tones
const ARP: Beat[] = [
  // Am × 4 bars  (A-E-A-C)
  ['A3',0.5],['E4',0.5],['A3',0.5],['C4',0.5], ['A3',0.5],['E4',0.5],['A3',0.5],['C4',0.5],
  ['A3',0.5],['E4',0.5],['A3',0.5],['C4',0.5], ['A3',0.5],['E4',0.5],['A3',0.5],['C4',0.5],
  ['A3',0.5],['E4',0.5],['A3',0.5],['C4',0.5], ['A3',0.5],['E4',0.5],['A3',0.5],['C4',0.5],
  ['A3',0.5],['E4',0.5],['A3',0.5],['C4',0.5], ['A3',0.5],['E4',0.5],['A3',0.5],['C4',0.5],
  // F × 4 bars  (F-A-C-A)
  ['F3',0.5],['A3',0.5],['C4',0.5],['A3',0.5], ['F3',0.5],['A3',0.5],['C4',0.5],['A3',0.5],
  ['F3',0.5],['A3',0.5],['C4',0.5],['A3',0.5], ['F3',0.5],['A3',0.5],['C4',0.5],['A3',0.5],
  ['F3',0.5],['A3',0.5],['C4',0.5],['A3',0.5], ['F3',0.5],['A3',0.5],['C4',0.5],['A3',0.5],
  ['F3',0.5],['A3',0.5],['C4',0.5],['A3',0.5], ['F3',0.5],['A3',0.5],['C4',0.5],['A3',0.5],
  // C × 4 bars  (C-G-C-E)
  ['C3',0.5],['G3',0.5],['C4',0.5],['E4',0.5], ['C3',0.5],['G3',0.5],['C4',0.5],['E4',0.5],
  ['C3',0.5],['G3',0.5],['C4',0.5],['E4',0.5], ['C3',0.5],['G3',0.5],['C4',0.5],['E4',0.5],
  ['C3',0.5],['G3',0.5],['C4',0.5],['E4',0.5], ['C3',0.5],['G3',0.5],['C4',0.5],['E4',0.5],
  ['C3',0.5],['G3',0.5],['C4',0.5],['E4',0.5], ['C3',0.5],['G3',0.5],['C4',0.5],['E4',0.5],
  // G × 4 bars  (G-D-G-B)
  ['G3',0.5],['D4',0.5],['G3',0.5],['B3',0.5], ['G3',0.5],['D4',0.5],['G3',0.5],['B3',0.5],
  ['G3',0.5],['D4',0.5],['G3',0.5],['B3',0.5], ['G3',0.5],['D4',0.5],['G3',0.5],['B3',0.5],
  ['G3',0.5],['D4',0.5],['G3',0.5],['B3',0.5], ['G3',0.5],['D4',0.5],['G3',0.5],['B3',0.5],
  ['G3',0.5],['D4',0.5],['G3',0.5],['B3',0.5], ['G3',0.5],['D4',0.5],['G3',0.5],['B3',0.5],
];

// Slow root bass — half-note pulses on each root
const BASS: Beat[] = [
  // Am × 4 bars
  ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2],
  ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2],
  // F × 4 bars
  ['F3', 2], ['F3', 2], ['F3', 2], ['F3', 2],
  ['F3', 2], ['F3', 2], ['F3', 2], ['F3', 2],
  // C × 4 bars
  ['C3', 2], ['C3', 2], ['C3', 2], ['C3', 2],
  ['C3', 2], ['C3', 2], ['C3', 2], ['C3', 2],
  // G × 4 bars
  ['G3', 2], ['G3', 2], ['G3', 2], ['G3', 2],
  ['G3', 2], ['G3', 2], ['G3', 2], ['G3', 2],
];

const LOOP_DURATION = BAR * 16;

// Detuned sawtooth lead — two oscillators slightly apart for a lush synth pad sound
function scheduleLeadNotes(
  ctx: AudioContext,
  destination: AudioNode,
  score: Beat[],
  gainValue: number,
  startTime: number,
): void {
  let t = startTime;
  for (const [name, beats] of score) {
    const dur = beats * BEAT;
    const freq = NOTE[name];
    if (freq && freq > 0) {
      const noteLen = dur * 0.92;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gainValue, t + 0.12);
      g.gain.setValueAtTime(gainValue, t + noteLen - 0.18);
      g.gain.linearRampToValueAtTime(0, t + noteLen);
      g.connect(destination);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = freq;
      osc1.connect(g);
      osc1.start(t);
      osc1.stop(t + noteLen);

      // Second oscillator detuned +8 cents for that classic synth chorus width
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = freq * 1.0046;
      osc2.connect(g);
      osc2.start(t);
      osc2.stop(t + noteLen);
    }
    t += dur;
  }
}

function scheduleNotes(
  ctx: AudioContext,
  destination: AudioNode,
  score: Beat[],
  type: OscillatorType,
  gainValue: number,
  startTime: number,
  gate: number,
  attackTime: number,
): void {
  let t = startTime;
  for (const [name, beats] of score) {
    const dur = beats * BEAT;
    const freq = NOTE[name];
    if (freq && freq > 0) {
      const noteLen = dur * gate;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gainValue, t + attackTime);
      g.gain.setValueAtTime(gainValue * 0.75, t + noteLen - 0.04);
      g.gain.linearRampToValueAtTime(0, t + noteLen);
      g.connect(destination);

      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(g);
      osc.start(t);
      osc.stop(t + noteLen);
    }
    t += dur;
  }
}

export class MenuMusicPlayer {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private loopStart = 0;
  private clickListener: (() => void) | null = null;

  play(): void {
    if (this.ctx || this.clickListener) return;
    if (pageHasUserGesture) {
      // User has already interacted with the page — start immediately.
      this.ctx = new AudioContext();
      void this.ctx.resume().then(() => this.startScheduling());
      return;
    }
    // AudioContext requires a user gesture on first use; defer until first click.
    this.clickListener = () => {
      pageHasUserGesture = true;
      this.clickListener = null;
      if (this.ctx) return;
      this.ctx = new AudioContext();
      void this.ctx.resume().then(() => this.startScheduling());
    };
    document.addEventListener('click', this.clickListener, { once: true });
  }

  private startScheduling(): void {
    if (!this.ctx) return;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = loadAudioPrefs().musicVolume;
    this.gainNode.connect(this.ctx.destination);
    this.loopStart = this.ctx.currentTime;
    this.scheduleLoop(this.loopStart);

    const scheduleAheadMs = 2000;
    const intervalMs = (LOOP_DURATION - scheduleAheadMs / 1000) * 1000;
    this.intervalId = setInterval(() => {
      this.loopStart += LOOP_DURATION;
      this.scheduleLoop(this.loopStart);
    }, Math.max(100, intervalMs));
  }

  private scheduleLoop(startTime: number): void {
    if (!this.ctx || !this.gainNode) return;
    const dest = this.gainNode;
    scheduleLeadNotes(this.ctx, dest, LEAD, 0.14, startTime);
    scheduleNotes(this.ctx, dest, ARP, 'triangle', 0.08, startTime, 0.55, 0.015);
    scheduleNotes(this.ctx, dest, BASS, 'square', 0.12, startTime, 0.80, 0.015);
  }

  setMusicVolume(v: number): void {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.05);
    }
  }

  stop(fadeMs = 500): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
      this.clickListener = null;
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(1, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeMs / 1000);
      // Close context after fade
      const closeCtx = this.ctx;
      setTimeout(() => { void closeCtx.close(); }, fadeMs + 50);
      this.ctx = null;
    }
  }

  dispose(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
      this.clickListener = null;
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
