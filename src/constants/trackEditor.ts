// ─── Track Editor Constants ───────────────────────────────────────────────────

/** Table / world dimensions and initial viewport fit */
export const EDITOR_VIEWPORT = {
  tableW: 1200,        // world-unit width of the table boundary
  tableH: 900,         // world-unit height of the table boundary
  fitPadding: 80,      // extra world-unit padding when fitting table to screen
  toolbarW: 200,       // CSS width of the left sidebar (used for browser-centre offset)
} as const;

/** Zoom limits and wheel behaviour */
export const EDITOR_ZOOM = {
  min: 0.1,
  max: 10,
  factor: 1.1,         // multiplier per wheel-tick
  wheelNorm: 120,      // deltaY divisor to normalise wheel step to 1.0
} as const;

/** Background grid */
export const EDITOR_GRID = {
  step: 50,            // grid line spacing (world units)
  carStep: 100,        // car-silhouette grid spacing
  carW: 5,             // silhouette width
  carL: 9,             // silhouette length
} as const;

/** Spline sampling */
export const EDITOR_CURVE = {
  segments: 20,        // CatmullRom / Hermite sub-segments per control-point span
} as const;

/** Direction-arrow overlay */
export const EDITOR_ARROWS = {
  spacing: 80,         // world units between arrow heads
  headAngle: Math.PI / 5,      // half-angle of arrow head (36°)
  headLenFactor: 0.35, // head length = trackWidth × factor
  headLenMin: 6,       // minimum head length before factor kicks in
} as const;

/** Canvas drawing sizes — all multiplied by invZoom at draw time */
export const EDITOR_DRAW = {
  pointRadius: 6,          // control-point dot radius
  pointLabelFontMin: 9,    // minimum font size for point-index labels
  pointLabelFontBase: 11,  // base font size (× invZoom) for point-index labels
  rotArrowLen: 16,         // rotation-hint arrow length
  rotArrowDotR: 3,         // dot radius at the tip of the rotation-hint arrow
  selectRingFactor: 2.2,   // highlight ring = pointRadius × factor
  crosshairArm: 8,         // origin crosshair arm half-length
  startMarkerRadius: 8,   // pending-start circle radius for tunnel / boost / rain
  handleRadius: 5,         // resize / rotation handle dot radius
  handleOutset: 16,        // how far the rotation handle sits outside the shape
  objectGhostRadius: 12,   // hover ghost circle radius for object tool
  lightInnerRay: 6,        // inner radius of point-light radiating lines
  lightOuterRay: 12,       // outer radius of point-light radiating lines
  lightRayCount: 8,        // number of radiating lines on a point light
} as const;

/** Screen-pixel hit-test radii (used before dividing by zoom) */
export const EDITOR_HIT = {
  closeLoop: 15,       // pen-tool snap distance to first point to close loop
  point: 12,           // control-point pick radius (eraser / move / startPoint)
  object: 15,          // placed-object pick radius
  light: 10,           // placed-light pick radius (body centre)
  lightHandle: 8,      // light distance / target handle pick radius
  hazardHandle: 8,     // hazard edge / rotation handle pick radius
  cornerInner: 8,      // object corner-scale handle (inner grab zone)
  cornerOuter: 20,     // object corner-rotate handle (outer grab zone)
} as const;

/** World-space snap distance for the line tool */
export const EDITOR_LINE_SNAP = {
  dist: 10,
} as const;

/** Keyboard / scroll rotation increments */
export const EDITOR_ROTATION = {
  bracketStep: Math.PI / 12,  // [ / ] keys → 15°
  scrollStep: Math.PI / 36,   // scroll wheel → 5°
} as const;

/** Placed-object scale limits */
export const EDITOR_OBJECT = {
  scaleMin: 0.5,
  scaleMax: 3.0,
  rectCornerR: 0.3,    // corner-radius fraction for rounded-rect footprints
} as const;

/** Undo history */
export const EDITOR_HISTORY = {
  maxSteps: 20,
} as const;

/** Track-width slider */
export const EDITOR_TRACK_WIDTH = {
  min: 10,
  max: 60,
} as const;

/** Hazard tool */
export const EDITOR_HAZARD = {
  radiusMin: 5,
  radiusMax: 60,
  radiusStep: 5,       // +/- button increment
  defaultRadius: 15,   // initial activeHazardRadius and fallback for hz.radius
} as const;

/** Default initial light placement values */
export const EDITOR_LIGHT_DEFAULTS = {
  spotTargetOffset: 50,  // canvas-unit default target offset (south) for new spot lights
} as const;

/** Light tool slider bounds */
export const EDITOR_LIGHT_SLIDER = {
  heightMin: 1,
  heightMax: 50,
  intensityMin: 0.1,
  intensityMax: 5,
  intensityStep: 0.1,
  distanceMin: 20,
  distanceMax: 300,
  distanceStep: 5,
  angleDegMin: 5,      // spot-light angle in degrees (converted to radians in JSX)
  angleDegMax: 90,
  penumbraMin: 0,
  penumbraMax: 1,
  penumbraStep: 0.05,
} as const;

/** Track-decoration rendering factors */
export const EDITOR_RENDER = {
  tunnelWidthFactor: 0.8,    // stroke width = trackWidth × factor
  rainWidthFactor: 0.7,
  boostLaneFactor: 0.25,     // boost-track lane = trackWidth × factor per side
} as const;
