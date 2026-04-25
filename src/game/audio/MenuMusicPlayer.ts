import { loadAudioPrefs } from './AudioPrefs.js';

// Once the user has interacted with the page, AudioContext can be created freely.
let pageHasUserGesture = false;

// 120 BPM outrun/synthwave — Am-F-C-G progression
const BPM = 120;
const BEAT = 60 / BPM; // 0.5 s per beat
const BAR = BEAT * 4;   // 2.0 s per bar

const NOTE: Record<string, number> = {
  F2: 87.31,  G2: 98.00,  A2: 110.00, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
  A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
  F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
  D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  rest: 0,
};

type Beat = [string, number];

// Repeat a beat pattern N times
function rep(pattern: Beat[], times: number): Beat[] {
  const result: Beat[] = [];
  for (let i = 0; i < times; i++) result.push(...pattern);
  return result;
}

// --- Sequences (16 bars total = 32 s at 120 BPM) ---

// Lead melody: uplifting 8th-note hook, Am-F-C-G
// Each bar = 4 beats; 16 bars × 4 beats = 64 beats total
const LEAD: Beat[] = [
  // Bars 1-4: Am
  ['E5', 0.5], ['D5', 0.5], ['C5', 1],   ['A4', 2],
  ['C5', 0.5], ['D5', 0.5], ['E5', 1],   ['rest', 2],
  ['E5', 0.5], ['G5', 0.5], ['A5', 2],   ['G5', 1],
  ['E5', 2],   ['D5', 1],   ['C5', 1],
  // Bars 5-8: F
  ['F5', 2],   ['E5', 1],   ['D5', 1],
  ['C5', 0.5], ['D5', 0.5], ['E5', 1],   ['rest', 2],
  ['F5', 0.5], ['G5', 0.5], ['A5', 2],   ['G5', 1],
  ['F5', 2],   ['E5', 2],
  // Bars 9-12: C — building energy
  ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 2],
  ['G5', 0.5], ['E5', 0.5], ['D5', 1],   ['C5', 2],
  ['E5', 0.5], ['F5', 0.5], ['G5', 1],   ['A5', 2],
  ['G5', 1],   ['E5', 1],   ['D5', 1],   ['C5', 1],
  // Bars 13-16: G — climax and resolve
  ['G4', 0.5], ['A4', 0.5], ['B4', 1],   ['D5', 2],
  ['E5', 0.5], ['D5', 0.5], ['B4', 1],   ['G4', 2],
  ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 2],
  ['A5', 2],   ['rest', 1], ['E5', 1],   // pickup E5 flows back into bar 1
];

// ARP: driving 16th-note riff (0.25 beats = 16th note at 120 BPM)
// 4-note chord-tone riff × 16 reps per chord section = 4 bars each
const ARP: Beat[] = [
  ...rep([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['C4', 0.25]], 16), // Am ×4 bars
  ...rep([['F3', 0.25], ['A3', 0.25], ['C4', 0.25], ['A3', 0.25]], 16), // F  ×4 bars
  ...rep([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['E4', 0.25]], 16), // C  ×4 bars
  ...rep([['G3', 0.25], ['B3', 0.25], ['D4', 0.25], ['B3', 0.25]], 16), // G  ×4 bars
];

// BASS: pumping 8th-note root+fifth pattern (4-note cell × 8 reps = 4 bars)
const BASS: Beat[] = [
  ...rep([['A2', 0.5], ['A2', 0.5], ['E3', 0.5], ['A2', 0.5]], 8), // Am ×4 bars
  ...rep([['F2', 0.5], ['F2', 0.5], ['C3', 0.5], ['F2', 0.5]], 8), // F  ×4 bars
  ...rep([['C3', 0.5], ['C3', 0.5], ['G3', 0.5], ['C3', 0.5]], 8), // C  ×4 bars
  ...rep([['G2', 0.5], ['G2', 0.5], ['D3', 0.5], ['G2', 0.5]], 8), // G  ×4 bars
];

const LOOP_DURATION = BAR * 16; // 32 s

// --- Sound synthesis ---

// Detuned sawtooth lead (two oscillators for classic synth width).
// Also sends to echoDest for delay effect if provided.
function scheduleLeadNotes(
  ctx: AudioContext,
  destination: AudioNode,
  echoDest: AudioNode | null,
  score: Beat[],
  gainValue: number,
  startTime: number,
): void {
  let t = startTime;
  for (const [name, beats] of score) {
    const dur = beats * BEAT;
    const freq = NOTE[name];
    if (freq && freq > 0) {
      const noteLen = dur * 0.88;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gainValue, t + 0.08);
      g.gain.setValueAtTime(gainValue, t + noteLen - 0.10);
      g.gain.linearRampToValueAtTime(0, t + noteLen);
      g.connect(destination);
      if (echoDest) g.connect(echoDest);

      for (const mult of [1.0, 1.0046]) { // second osc +8 cents for chorus width
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq * mult;
        osc.connect(g);
        osc.start(t);
        osc.stop(t + noteLen);
      }
    }
    t += dur;
  }
}

// Generic note scheduler used for arp and bass
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
      g.gain.setValueAtTime(gainValue * 0.75, t + noteLen - 0.02);
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

// Kick drum: sine wave with fast pitch drop (150 Hz → 45 Hz)
function scheduleKick(ctx: AudioContext, destination: AudioNode, time: number): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.9, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  g.connect(destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(155, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.10);
  osc.connect(g);
  osc.start(time);
  osc.stop(time + 0.15);
}

// Snare: bandpass noise body + pitched tone transient
function scheduleSnare(
  ctx: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
  time: number,
): void {
  // Noise body
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2600;
  filter.Q.value = 0.7;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.42, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  noise.connect(filter);
  filter.connect(ng);
  ng.connect(destination);
  noise.start(time);
  noise.stop(time + 0.20);

  // Pitched crack transient
  const tone = ctx.createOscillator();
  tone.type = 'sine';
  tone.frequency.value = 185;
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(0.32, time);
  tg.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  tone.connect(tg);
  tg.connect(destination);
  tone.start(time);
  tone.stop(time + 0.08);
}

// Closed hi-hat: high-pass filtered noise, very short decay
function scheduleHihat(
  ctx: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
  time: number,
  gain: number,
): void {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 8000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  noise.connect(filter);
  filter.connect(g);
  g.connect(destination);
  noise.start(time);
  noise.stop(time + 0.05);
}

// Full 16-bar drum pattern: kick on 1&3, snare on 2&4, 8th-note hi-hats
function scheduleDrums(
  ctx: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
  startTime: number,
): void {
  for (let bar = 0; bar < 16; bar++) {
    const barStart = startTime + bar * BAR;
    for (let beat = 0; beat < 4; beat++) {
      const t = barStart + beat * BEAT;
      if (beat === 0 || beat === 2) scheduleKick(ctx, destination, t);
      if (beat === 1 || beat === 3) scheduleSnare(ctx, destination, noiseBuffer, t);
      scheduleHihat(ctx, destination, noiseBuffer, t, 0.11);
      scheduleHihat(ctx, destination, noiseBuffer, t + BEAT * 0.5, 0.08);
    }
  }
}

// Pad: slow-attack sustained chord tones for harmonic warmth
function schedulePad(ctx: AudioContext, destination: AudioNode, startTime: number): void {
  const sections: Array<[string[], number]> = [
    [['A3', 'C4', 'E4'], 4], // Am
    [['F3', 'A3', 'C4'], 4], // F
    [['C3', 'E4', 'G4'], 4], // C
    [['G3', 'B3', 'D4'], 4], // G
  ];
  let t = startTime;
  for (const [notes, bars] of sections) {
    const dur = bars * BAR;
    for (const name of notes) {
      const freq = NOTE[name];
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.050, t + 1.2); // slow pad attack
      g.gain.setValueAtTime(0.050, t + dur - 1.0);
      g.gain.linearRampToValueAtTime(0, t + dur);
      g.connect(destination);

      for (const mult of [1.0, 1.007]) { // detuned pair for lush pad width
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq * mult;
        osc.connect(g);
        osc.start(t);
        osc.stop(t + dur);
      }
    }
    t += dur;
  }
}

export class MenuMusicPlayer {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private echoDelay: DelayNode | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private loopStart = 0;
  private clickListener: (() => void) | null = null;

  play(): void {
    if (this.ctx) return;

    // Always create the context immediately — it may start suspended if the
    // browser's autoplay policy hasn't seen a user gesture yet.
    this.ctx = new AudioContext();

    // Called once the context is confirmed running.
    const onRunning = () => {
      pageHasUserGesture = true;
      this.removeInteractionListeners();
      if (this.intervalId === null) this.startScheduling();
    };

    if (this.ctx.state === 'running') {
      onRunning();
      return;
    }

    // Listen for the context to become running (happens after resume() succeeds).
    const onStateChange = () => {
      if (this.ctx?.state === 'running') {
        this.ctx.removeEventListener('statechange', onStateChange);
        onRunning();
      }
    };
    this.ctx.addEventListener('statechange', onStateChange);

    if (pageHasUserGesture) {
      // Prior gesture exists — resume() should resolve immediately.
      void this.ctx.resume();
      return;
    }

    // No prior gesture: try resume() optimistically (works in some browsers),
    // and also listen for any user interaction as a reliable fallback.
    void this.ctx.resume();
    this.clickListener = () => {
      pageHasUserGesture = true;
      this.removeInteractionListeners();
      void this.ctx?.resume();
    };
    document.addEventListener('click', this.clickListener);
    document.addEventListener('keydown', this.clickListener);
    document.addEventListener('touchstart', this.clickListener);
  }

  private removeInteractionListeners(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
      document.removeEventListener('keydown', this.clickListener);
      document.removeEventListener('touchstart', this.clickListener);
      this.clickListener = null;
    }
  }

  private startScheduling(): void {
    if (!this.ctx) return;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Shared noise buffer reused by all drum hits (avoids per-hit allocation)
    const bufSize = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = loadAudioPrefs().musicVolume;
    this.gainNode.connect(this.ctx.destination);

    // Dotted-quarter-note delay on lead for that synthwave echo character
    // At 120 BPM: dotted quarter = BEAT * 1.5 = 0.75 s
    this.echoDelay = this.ctx.createDelay(1.0);
    this.echoDelay.delayTime.value = BEAT * 1.5;
    const echoFeedback = this.ctx.createGain();
    echoFeedback.gain.value = 0.26;
    const echoWet = this.ctx.createGain();
    echoWet.gain.value = 0.18;
    this.echoDelay.connect(echoFeedback);
    echoFeedback.connect(this.echoDelay); // feedback loop (gain < 1, safe)
    this.echoDelay.connect(echoWet);
    echoWet.connect(this.gainNode);

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
    if (!this.ctx || !this.gainNode || !this.noiseBuffer) return;
    const dest = this.gainNode;
    schedulePad(this.ctx, dest, startTime);
    scheduleLeadNotes(this.ctx, dest, this.echoDelay, LEAD, 0.15, startTime);
    scheduleNotes(this.ctx, dest, ARP, 'triangle', 0.055, startTime, 0.55, 0.01);
    scheduleNotes(this.ctx, dest, BASS, 'square', 0.14, startTime, 0.72, 0.01);
    scheduleDrums(this.ctx, dest, this.noiseBuffer, startTime);
  }

  setMusicVolume(v: number): void {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.05);
    }
  }

  stop(fadeMs = 500): void {
    this.removeInteractionListeners();
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(1, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeMs / 1000);
      const closeCtx = this.ctx;
      setTimeout(() => { void closeCtx.close(); }, fadeMs + 50);
      this.ctx = null;
    }
  }

  dispose(): void {
    this.removeInteractionListeners();
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
