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
  shadowMapSize: 4096,
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
  castShadow: true,
} as const;
