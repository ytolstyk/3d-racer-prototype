export class StartSequence {
  private countdown = -1;
  private startTime = 0;
  private onComplete: (() => void) | null = null;
  private active = false;

  start(onComplete: () => void): void {
    this.countdown = 3;
    this.startTime = performance.now();
    this.onComplete = onComplete;
    this.active = true;
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

    return this.countdown;
  }

  isActive(): boolean {
    return this.active;
  }

  getCountdown(): number {
    return this.countdown;
  }
}
