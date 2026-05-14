// ─── Scene Lighting Constants ─────────────────────────────────────────────────

/** Hemisphere light — sky/ground ambient fill */
export const HEMI_LIGHT = {
  skyColor: 0x87ceeb,
  groundColor: 0x6db33f,
  intensity: 0.3,
} as const;

/** Main directional sun */
export const SUN_LIGHT = {
  color: 0xfff0cc,
  intensity: 0.8,
  posX: -60,
  posY: 80,
  posZ: 40,
  shadowMapSize: 2048,
  shadowNear: 1,
  shadowFar: 400,
  shadowLeft: -180,
  shadowRight: 180,
  shadowTop: 140,
  shadowBottom: -140,
  shadowBias: -0.0003,
} as const;

/** Soft fill light from opposite side */
export const FILL_LIGHT = {
  color: 0xb0c8e8,
  intensity: 0.25,
  posX: 40,
  posY: 30,
  posZ: -30,
} as const;

// ─── Night Mode Constants ──────────────────────────────────────────────────────

export const NIGHT_SCENE = {
  background: 0x050510,
  fogNear: 150,
  fogFar: 400,
} as const;

export const NIGHT_HEMI = { skyColor: 0x0a0a1a, groundColor: 0x000000, intensity: 0.02 } as const;
export const NIGHT_SUN  = { intensity: 0.0 } as const;
export const NIGHT_FILL = { intensity: 0.0 } as const;

export const NIGHT_TRACK_LIGHT = {
  color: 0xffeeaa, intensity: 600, distance: 150, height: 18, spacing: 100, maxCount: 10,
} as const;

// Single PointLight per headlight — illuminates the road ahead cheaply.
// SpotLights are not used: from a top-down camera the cone is invisible
// and each SpotLight adds significant fragment-shader cost.
export const CAR_HEADLIGHT = {
  color: 0xffeedd, intensity: 60, distance: 55,
} as const;

// Local car-group space (positive Z is forward)
export const HEADLIGHT_POSITIONS: Record<string, [number, number, number][]> = {
  'racer-red':     [[-0.5, 0.80, 3.22],  [0.5, 0.80, 3.22]],
  'sir-skids':     [[-0.66, 1.15, 2.18], [0.66, 1.15, 2.18]],
  'captain-crumb': [[-0.64, 1.10, 1.85], [0.64, 1.10, 1.85]],
  'butterknife':   [[-0.58, 0.95, 2.55], [0.58, 0.95, 2.55]],
  'sauce-boss':    [[-0.72, 1.55, 2.2],  [0.72, 1.55, 2.2]],
  'lil-pepper':    [[-0.5, 1.00, 1.58],  [0.5, 1.00, 1.58]],
};
const DEFAULT_HEADLIGHTS: [number, number, number][] = [[-0.64, 1.05, 2.1], [0.64, 1.05, 2.1]];
export function getHeadlightPositions(carId: string): [number, number, number][] {
  return HEADLIGHT_POSITIONS[carId] ?? DEFAULT_HEADLIGHTS;
}

/** Default corner spot lights added to every track */
export const CORNER_LIGHTS = [
  { x: -560, y: 70, z: -420, color: 0xffcc88, label: "NW warm" },
  { x: 560, y: 70, z: -420, color: 0x88ccff, label: "NE cool" },
  { x: -560, y: 70, z: 420, color: 0xffaa55, label: "SW warm" },
  { x: 560, y: 70, z: 420, color: 0xaaddff, label: "SE cool" },
] as const;

export const CORNER_LIGHT_DEFAULTS = {
  intensity: 300,
  distance: 900,
  angle: 0.55,
  penumbra: 0.3,
  targetX: 0,
  targetZ: 0,
  castShadow: false,
} as const;
