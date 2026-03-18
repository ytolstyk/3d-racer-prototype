import type { GameState } from '../types/game.js';

type Listener = (state: GameState) => void;

export class GameStateEmitter {
  private listeners: Set<Listener> = new Set();
  private lastEmit = 0;
  private throttleMs = 1000 / 15; // ~15fps for HUD updates

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(state: GameState, force = false): void {
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
