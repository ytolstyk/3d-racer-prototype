import { loadControlsConfig } from './ControlsPrefs.js';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.code);
    };
    this.boundKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  getState(): InputState {
    const { p1 } = loadControlsConfig();
    return {
      forward: this.keys.has(p1.forward),
      backward: this.keys.has(p1.backward),
      left: this.keys.has(p1.left),
      right: this.keys.has(p1.right),
      handbrake: this.keys.has(p1.handbrake),
    };
  }

  getStateP1(): InputState {
    const { p1 } = loadControlsConfig();
    return {
      forward: this.keys.has(p1.forward),
      backward: this.keys.has(p1.backward),
      left: this.keys.has(p1.left),
      right: this.keys.has(p1.right),
      handbrake: this.keys.has(p1.handbrake),
    };
  }

  getStateP2(): InputState {
    const { p2 } = loadControlsConfig();
    return {
      forward: this.keys.has(p2.forward),
      backward: this.keys.has(p2.backward),
      left: this.keys.has(p2.left),
      right: this.keys.has(p2.right),
      handbrake: this.keys.has(p2.handbrake),
    };
  }

  clearKeys(): void {
    this.keys.clear();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}
