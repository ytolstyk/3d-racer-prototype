export class StartSequence {
  private countdown = -1;
  private startTime = 0;
  private onComplete: (() => void) | null = null;
  private onTick: ((v: number) => void) | null = null;
  private active = false;
  private lastCountdown = -1;

  start(onComplete: () => void, onTick?: (value: number) => void): void {
    this.countdown = 3;
    this.startTime = performance.now();
    this.onComplete = onComplete;
    this.onTick = onTick ?? null;
    this.active = true;
    this.lastCountdown = -1;
  }

  update(): number {
    if (!this.active) return -1;

    const elapsed = performance.now() - this.startTime;

    if (elapsed < 1000) {
      this.countdown = 3;
    } else if (elapsed < 2000) {
      this.countdown = 2;
    } else if (elapsed < 3000) {
      this.countdown = 1;
    } else if (elapsed < 4000) {
      if (this.countdown !== 0) {
        this.countdown = 0; // GO!
        this.onComplete?.();
      }
    } else {
      this.active = false;
      this.countdown = -1;
    }

    if (this.countdown !== this.lastCountdown && this.countdown >= 0) {
      this.onTick?.(this.countdown);
      this.lastCountdown = this.countdown;
    }

    return this.countdown;
  }

  isActive(): boolean {
    return this.active;
  }

  getCountdown(): number {
    return this.countdown;
  }
}
