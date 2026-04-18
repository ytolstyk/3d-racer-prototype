import { loadAudioPrefs } from './AudioPrefs.js';

// D major, 130 BPM — staccato arcade feel
const BPM = 130;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// Gate ratio: note sounds for this fraction of its beat slot, then silence
const GATE = 0.40;

const NOTE: Record<string, number> = {
  D3: 146.83, A3: 220.00, B3: 246.94,
  D4: 293.66, E4: 329.63, 'F#4': 369.99, G4: 392.00,
  A4: 440.00, B4: 493.88, 'C#5': 554.37, D5: 587.33,
  E5: 659.25, 'F#5': 739.99,
  rest: 0,
};

// 16-bar score: each entry is [noteName, durationBeats]
// Half-beat (0.5) subdivisions give rhythmic variety and natural breathing gaps
type Beat = [string, number];

const MELODY: Beat[] = [
  // Phrase A (bars 1-4) — bright ascending riff
  ['D4',0.5],['F#4',0.5],['A4',0.5],['rest',0.5], ['D5',0.5],['rest',0.5],['A4',0.5],['rest',0.5],
  ['B4',0.5],['A4',0.5],['G4',0.5],['rest',0.5],  ['F#4',1],['rest',1],
  ['F#4',0.5],['A4',0.5],['C#5',0.5],['D5',0.5],  ['C#5',0.5],['B4',0.5],['A4',0.5],['rest',0.5],
  ['A4',1],['F#4',0.5],['D4',0.5],                 ['D4',2],

  // Phrase B (bars 5-8) — higher energy
  ['G4',0.5],['A4',0.5],['B4',0.5],['rest',0.5],  ['D5',0.5],['rest',0.5],['B4',0.5],['rest',0.5],
  ['C#5',0.5],['B4',0.5],['A4',0.5],['rest',0.5], ['G4',1],['rest',1],
  ['A4',0.5],['B4',0.5],['C#5',0.5],['D5',0.5],   ['E5',0.5],['D5',0.5],['C#5',0.5],['B4',0.5],
  ['A4',1],['rest',1],                              ['D4',2],

  // Phrase A' (bars 9-12) — repeat with high run
  ['D4',0.5],['F#4',0.5],['A4',0.5],['rest',0.5], ['D5',0.5],['rest',0.5],['A4',0.5],['rest',0.5],
  ['B4',0.5],['A4',0.5],['G4',0.5],['rest',0.5],  ['F#4',1],['rest',1],
  ['F#4',0.5],['A4',0.5],['D5',0.5],['E5',0.5],   ['F#5',0.5],['E5',0.5],['D5',0.5],['C#5',0.5],
  ['B4',0.5],['A4',0.5],['G4',0.5],['F#4',0.5],   ['D4',2],

  // Phrase C (bars 13-16) — staccato climax + resolve
  ['D5',0.5],['rest',0.5],['D5',0.5],['rest',0.5], ['C#5',0.5],['rest',0.5],['B4',0.5],['rest',0.5],
  ['A4',0.5],['rest',0.5],['B4',0.5],['rest',0.5], ['C#5',0.5],['rest',0.5],['D5',0.5],['rest',0.5],
  ['E5',0.5],['D5',0.5],['C#5',0.5],['B4',0.5],   ['A4',1],['F#4',1],
  ['D5',1],['rest',1],                              ['D4',2],
];

const BASS: Beat[] = [
  // bars 1-4 — D pedal, punchy 8th notes
  ['D3',0.5],['rest',0.5],['D3',0.5],['rest',0.5], ['A3',0.5],['rest',0.5],['D3',0.5],['rest',0.5],
  ['D3',0.5],['rest',0.5],['D3',0.5],['rest',0.5], ['A3',1],['rest',1],
  ['D3',0.5],['rest',0.5],['A3',0.5],['rest',0.5], ['D3',0.5],['rest',0.5],['A3',0.5],['rest',0.5],
  ['D3',0.5],['A3',0.5],['D3',0.5],['A3',0.5],     ['D3',2],

  // bars 5-8
  ['B3',0.5],['rest',0.5],['B3',0.5],['rest',0.5], ['A3',0.5],['rest',0.5],['A3',0.5],['rest',0.5],
  ['A3',0.5],['rest',0.5],['A3',0.5],['rest',0.5], ['D3',1],['rest',1],
  ['D3',0.5],['rest',0.5],['A3',0.5],['rest',0.5], ['D3',0.5],['rest',0.5],['A3',0.5],['rest',0.5],
  ['D3',1],['A3',1],                                ['D3',2],

  // bars 9-12 — repeat
  ['D3',0.5],['rest',0.5],['D3',0.5],['rest',0.5], ['A3',0.5],['rest',0.5],['D3',0.5],['rest',0.5],
  ['D3',0.5],['rest',0.5],['D3',0.5],['rest',0.5], ['A3',1],['rest',1],
  ['D3',0.5],['rest',0.5],['A3',0.5],['rest',0.5], ['D3',0.5],['rest',0.5],['A3',0.5],['rest',0.5],
  ['D3',0.5],['A3',0.5],['D3',0.5],['A3',0.5],     ['D3',2],

  // bars 13-16
  ['A3',0.5],['rest',0.5],['A3',0.5],['rest',0.5], ['D3',0.5],['rest',0.5],['D3',0.5],['rest',0.5],
  ['A3',0.5],['rest',0.5],['D3',0.5],['rest',0.5], ['A3',0.5],['rest',0.5],['D3',0.5],['rest',0.5],
  ['D3',0.5],['A3',0.5],['D3',0.5],['A3',0.5],     ['D3',0.5],['A3',0.5],['D3',0.5],['A3',0.5],
  ['D3',2],['rest',2],
];

const LOOP_DURATION = BAR * 16;

function scheduleNotes(
  ctx: AudioContext,
  destination: AudioNode,
  score: Beat[],
  type: OscillatorType,
  gainValue: number,
  startTime: number,
  gate = GATE,
): void {
  let t = startTime;
  for (const [name, beats] of score) {
    const dur = beats * BEAT;
    const freq = NOTE[name];
    if (freq && freq > 0) {
      const noteLen = dur * gate;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      // fast attack
      g.gain.linearRampToValueAtTime(gainValue, t + 0.008);
      // quick decay to sustain
      g.gain.linearRampToValueAtTime(gainValue * 0.65, t + 0.035);
      // hold, then sharp release well before next beat
      g.gain.setValueAtTime(gainValue * 0.65, t + noteLen - 0.020);
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
    if (this.ctx) return;
    this.ctx = new AudioContext();
    void this.ctx.resume();

    if (this.ctx.state === 'suspended') {
      this.clickListener = () => {
        void this.ctx?.resume().then(() => this.startScheduling());
        if (this.clickListener) {
          document.removeEventListener('click', this.clickListener);
          this.clickListener = null;
        }
      };
      document.addEventListener('click', this.clickListener, { once: true });
    } else {
      this.startScheduling();
    }
  }

  private startScheduling(): void {
    if (!this.ctx) return;
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
    scheduleNotes(this.ctx, dest, MELODY, 'triangle', 0.22, startTime);
    scheduleNotes(this.ctx, dest, BASS, 'square', 0.10, startTime, 0.50);
  }

  setMusicVolume(v: number): void {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.05);
    }
  }

  stop(fadeMs = 500): void {
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
