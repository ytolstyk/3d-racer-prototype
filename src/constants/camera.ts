export const CAMERA = {
  fov: 50,
  near: 0.1,
  far: 1000,

  // Height above car (Y offset)
  baseHeight: 75,
  maxZoomHeight: 131,

  // Distance behind car in world-Z (fixed orientation, independent of car heading)
  baseBack: 41,
  maxZoomBack: 64,

  // Height/back lerp speed (zoom-in/out smoothing)
  heightLerp: 0.05,
  backLerp: 0.05,

  // Position lerp at speed=0 and speed=max
  positionLerpBase: 0.2,
  positionLerpMax: 0.7,

  // Look-at target lerp
  lookAtLerp: 0.6,

  // Pitch angle in degrees (63 = looks at car, 90 = straight down, lower = more horizon tilt)
  angle: 55,
};
