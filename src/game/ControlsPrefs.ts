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

const SP_KEY = 'kgp_controls_sp';
const VS_KEY = 'kgp_controls';

/** Default bindings for single-player / solo mode */
export const DEFAULT_SP_CONTROLS: ControlsConfig = {
  p1: { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', handbrake: 'Space' },
  p2: { forward: 'ArrowUp', backward: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', handbrake: 'ShiftRight' },
};

/** Default bindings for versus (local multiplayer) mode */
export const DEFAULT_VS_CONTROLS: ControlsConfig = {
  p1: { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', handbrake: 'ShiftLeft' },
  p2: { forward: 'ArrowUp', backward: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', handbrake: 'ShiftRight' },
};

/** @deprecated Use DEFAULT_SP_CONTROLS or DEFAULT_VS_CONTROLS */
export const DEFAULT_CONTROLS = DEFAULT_VS_CONTROLS;

function isValidBindings(b: unknown): b is ActionBindings {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  return ['forward', 'backward', 'left', 'right', 'handbrake'].every(k => typeof o[k] === 'string');
}

function loadConfig(key: string, defaults: ControlsConfig): ControlsConfig {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw) as Partial<ControlsConfig>;
    return {
      p1: isValidBindings(parsed.p1) ? parsed.p1 : { ...defaults.p1 },
      p2: isValidBindings(parsed.p2) ? parsed.p2 : { ...defaults.p2 },
    };
  } catch {
    return structuredClone(defaults);
  }
}

export function loadSPControlsConfig(): ControlsConfig {
  return loadConfig(SP_KEY, DEFAULT_SP_CONTROLS);
}

export function saveSPControlsConfig(config: ControlsConfig): void {
  try { localStorage.setItem(SP_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

export function resetSPControlsConfig(): void {
  try { localStorage.removeItem(SP_KEY); } catch { /* ignore */ }
}

export function loadControlsConfig(): ControlsConfig {
  return loadConfig(VS_KEY, DEFAULT_VS_CONTROLS);
}

export function saveControlsConfig(config: ControlsConfig): void {
  try { localStorage.setItem(VS_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

export function resetControlsConfig(): void {
  try { localStorage.removeItem(VS_KEY); } catch { /* ignore */ }
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
