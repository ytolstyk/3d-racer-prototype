import type { VersusGameState } from '../types/game.js';

type Listener = (state: VersusGameState) => void;

export class VersusStateEmitter {
  private listeners: Set<Listener> = new Set();
  private lastEmit = 0;
  private throttleMs = 1000 / 15;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(state: VersusGameState, force = false): void {
    const now = performance.now();
    if (!force && now - this.lastEmit < this.throttleMs) return;
    this.lastEmit = now;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
