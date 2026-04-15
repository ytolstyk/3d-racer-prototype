// ── Tire Smoke ──────────────────────────────────────────────────────────────
export const TIRE_SMOKE = {
  poolSize: 800,            // instanced mesh pool (was 400)
  emitRate: 1 / 30,         // seconds between emits (30 fps, was 20)
  particlesPerEmit: 3,      // per-tire particles per emit (was 2, implicit from emitOne×2)
  lifetime: 1.5,            // seconds each puff lives
  initialSize: 0.3,         // start scale
  maxGrowth: 2.2,           // added to initialSize over lifetime
  initialOpacity: 0.45,
  collisionSizeMultiplier: 1.3, // collision smoke is 30% bigger
  collisionInitialSize: 0.39,
  collisionMaxGrowth: 2.86,
} as const;

// ── Speed Strip (boost pad) ─────────────────────────────────────────────────
export const SPEED_STRIP = {
  boostMultiplier: 1.5,     // speed cap multiplied by this on crossing
  decayRate: 2.0,           // per-second lerp rate back to 1.0
  color: 0x00ffcc,          // emissive strip color
  stripWidth: 3,            // strip depth along track direction
} as const;

// ── Boost Track (along-track lane) ──────────────────────────────────────────
export const BOOST_TRACK = {
  speedMultiplier: 1.25,    // maintained while car is on lane
  widthFraction: 0.25,      // fraction of track width for lane
  color: 0xff8800,          // lane surface color
  surfaceY: 0.06,           // slight elevation above track
} as const;

// ── Rain Hazard ─────────────────────────────────────────────────────────────
export const RAIN_HAZARD = {
  dropInterval: 0.15,       // seconds between drop spawns per zone
  shadowGrowDuration: 1.0,  // seconds for shadow to scale up
  dropFallDuration: 0.15,   // seconds for sphere to fall
  maxShadowRadius: 4.0,     // world-space radius of shadow circle
  dropHeight: 80,           // spawn height above ground
  pushForce: 8,             // lateral push on car hit
  slowFactor: 0.75,         // speed *= this on hit
  angleDeviationMin: 10,    // degrees of random rotation on hit
  angleDeviationMax: 30,
  splashParticles: 8,       // particle count on impact
  maxActiveDrops: 20,       // cap per zone
  shadowColor: 0x224466,
  dropColor: 0x4488cc,
  splashColor: 0x66aadd,
} as const;

// ── Collision Particles ─────────────────────────────────────────────────────
export const COLLISION_PARTICLES = {
  sparkCount: 300,
  paintCount: 225,
  shardCount: 150,
  sparkMaxLife: 0.6,
  paintMaxLife: 1.2,
  shardMaxLife: 1.8,
  gravity: -30,
} as const;

// ── Hazard Splash ───────────────────────────────────────────────────────────
export const HAZARD_SPLASH = {
  poolSize: 400,
  defaultCount: 55,
  gravity: -28,
} as const;
