export const CAMERA = {
  fov: 50,
  near: 0.1,
  far: 1000,

  baseHeight: 75,
  maxZoomHeight: 131,
  heightLerp: 0.05,

  // Lead panning: camera shifts toward car's heading so car appears on trailing edge
  leadDist: 30, // max units of lead at full speed
  leadLerp: 0.02, // how fast lead responds to direction/speed changes

  // Pitch angle: 90 = straight down, lower = more horizon tilt
  angle: 60,
};
