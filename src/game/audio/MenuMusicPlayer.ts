// D major, 120 BPM = 0.5s/beat = 2s/bar
const BPM = 120;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// Note frequencies (D major scale)
const NOTE: Record<string, number> = {
  D3: 146.83, A3: 220.00,
  D4: 293.66, E4: 329.63, 'F#4': 369.99, G4: 392.00,
  A4: 440.00, B4: 493.88, 'C#5': 554.37, D5: 587.33,
  E5: 659.25, 'F#5': 739.99,
  rest: 0,
};

// 16-bar score: each entry is [noteName, durationBeats]
type Beat = [string, number];

const MELODY: Beat[] = [
  // Phrase A (bars 1-4)
  ['D4',1],['D4',1],['F#4',1],['A4',1],
  ['A4',1],['G4',1],['F#4',1],['E4',1],
  ['F#4',1],['A4',1],['D5',1],['D5',1],
  ['C#5',1],['B4',1],['A4',1],['rest',1],
  // Phrase B (bars 5-8)
  ['G4',1],['G4',1],['B4',1],['D5',1],
  ['E5',1],['D5',1],['C#5',1],['B4',1],
  ['A4',1],['G4',1],['F#4',1],['E4',1],
  ['D4',1],['D4',1],['D4',1],['rest',1],
  // Phrase A (bars 9-12)
  ['D4',1],['D4',1],['F#4',1],['A4',1],
  ['A4',1],['G4',1],['F#4',1],['E4',1],
  ['F#4',1],['A4',1],['D5',1],['D5',1],
  ['C#5',1],['B4',1],['A4',1],['rest',1],
  // Phrase C (bars 13-16)
  ['A4',1],['B4',1],['C#5',1],['D5',1],
  ['E5',1],['D5',1],['C#5',1],['A4',1],
  ['G4',1],['A4',1],['B4',1],['C#5',1],
  ['D5',1],['A4',1],['F#4',1],['D4',1],
];

const BASS: Beat[] = [
  // bars 1-4
  ['D3',2],['A3',2], ['D3',2],['A3',2], ['D3',2],['A3',2], ['D3',2],['A3',2],
  // bars 5-8
  ['G4',2],['D3',2], ['A3',2],['E4',2], ['D3',2],['A3',2], ['D3',4],
  // bars 9-12 (repeat A)
  ['D3',2],['A3',2], ['D3',2],['A3',2], ['D3',2],['A3',2], ['D3',2],['A3',2],
  // bars 13-16
  ['A3',2],['D3',2], ['A3',2],['D3',2], ['D3',2],['A3',2], ['D3',4],
];

const LOOP_DURATION = BAR * 16;

function scheduleNotes(
  ctx: AudioContext,
  destination: AudioNode,
  score: Beat[],
  type: OscillatorType,
  gainValue: number,
  startTime: number,
): void {
  let t = startTime;
  for (const [name, beats] of score) {
    const dur = beats * BEAT;
    const freq = NOTE[name];
    if (freq && freq > 0) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      // attack
      g.gain.linearRampToValueAtTime(gainValue, t + 0.010);
      // decay to sustain
      g.gain.linearRampToValueAtTime(gainValue * 0.7, t + 0.060);
      // release
      g.gain.setValueAtTime(gainValue * 0.7, t + dur - 0.080);
      g.gain.linearRampToValueAtTime(0, t + dur);
      g.connect(destination);

      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(g);
      osc.start(t);
      osc.stop(t + dur);
    }
    t += dur;
  }
}

export class MenuMusicPlayer {
  private ctx: AudioContext | null = null;
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
    if (!this.ctx) return;
    const dest = this.ctx.destination;
    scheduleNotes(this.ctx, dest, MELODY, 'triangle', 0.25, startTime);
    scheduleNotes(this.ctx, dest, BASS, 'square', 0.12, startTime);
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
