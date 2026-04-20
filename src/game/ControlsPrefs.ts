export interface ActionBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  handbrake: string;
}

export interface ControlsConfig {
  p1: ActionBindings;
  p2: ActionBindings;
}

const KEY = 'kgp_controls';

export const DEFAULT_CONTROLS: ControlsConfig = {
  p1: { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', handbrake: 'ShiftLeft' },
  p2: { forward: 'ArrowUp', backward: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', handbrake: 'ShiftRight' },
};

function isValidBindings(b: unknown): b is ActionBindings {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  return ['forward', 'backward', 'left', 'right', 'handbrake'].every(k => typeof o[k] === 'string');
}

export function loadControlsConfig(): ControlsConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_CONTROLS);
    const parsed = JSON.parse(raw) as Partial<ControlsConfig>;
    return {
      p1: isValidBindings(parsed.p1) ? parsed.p1 : { ...DEFAULT_CONTROLS.p1 },
      p2: isValidBindings(parsed.p2) ? parsed.p2 : { ...DEFAULT_CONTROLS.p2 },
    };
  } catch {
    return structuredClone(DEFAULT_CONTROLS);
  }
}

export function saveControlsConfig(config: ControlsConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function resetControlsConfig(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Convert a KeyboardEvent.code to a human-readable label */
export function keyCodeLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'Space') return 'Space';
  if (code === 'ShiftLeft') return 'L.Shift';
  if (code === 'ShiftRight') return 'R.Shift';
  if (code === 'ControlLeft') return 'L.Ctrl';
  if (code === 'ControlRight') return 'R.Ctrl';
  if (code === 'AltLeft') return 'L.Alt';
  if (code === 'AltRight') return 'R.Alt';
  if (code === 'Enter') return 'Enter';
  if (code === 'Tab') return 'Tab';
  if (code === 'Backspace') return '⌫';
  return code;
}
