import type { CarDefinition } from '../types/game.js';

// ─── Stat guide ───────────────────────────────────────────────────────────────
// maxSpeed     Top speed cap (game units/s). Typical range: 100–140.
// acceleration Force added per frame at full throttle. Higher = faster 0-to-top.
//              Typical range: 75–100.
// handling     Steering responsiveness multiplier (0–1). Higher = tighter turns,
//              lower = drifty/loose. Typical range: 0.6–0.95.
// braking      Force applied when braking. Higher = shorter stopping distance.
//              Typical range: 50–70.
// ─────────────────────────────────────────────────────────────────────────────

// Racer Red — balanced all-rounder, good handling, solid top end
const RACER_RED = { maxSpeed: 118, acceleration: 85, handling: 0.80, braking: 58 };

// Sir Skids-a-Lot — fastest top speed but loose (low handling, weak brakes)
const SIR_SKIDS = { maxSpeed: 132, acceleration: 90, handling: 0.60, braking: 50 };

// Captain Crumb — slightly slower, dependable mid-tier stats
const CAPTAIN_CRUMB = { maxSpeed: 112, acceleration: 82, handling: 0.75, braking: 60 };

// The Butterknife — slowest top speed but sharpest handling and best brakes
const BUTTERKNIFE = { maxSpeed: 102, acceleration: 76, handling: 0.95, braking: 65 };

// Sauce Boss — high acceleration and speed, poor handling and braking
const SAUCE_BOSS = { maxSpeed: 128, acceleration: 95, handling: 0.65, braking: 54 };

// Lil' Pepper — well-rounded, slightly below average in all areas
const LIL_PEPPER = { maxSpeed: 115, acceleration: 83, handling: 0.78, braking: 62 };

export const CAR_DEFINITIONS: CarDefinition[] = [
  {
    id: 'racer-red',
    name: 'Racer Red',
    color: 0xe53935,
    accentColor: 0xffcdd2,
    ...RACER_RED,
  },
  {
    id: 'sir-skids',
    name: 'Sir Skids-a-Lot',
    color: 0x1e88e5,
    accentColor: 0xbbdefb,
    ...SIR_SKIDS,
  },
  {
    id: 'captain-crumb',
    name: 'Captain Crumb',
    color: 0xfdd835,
    accentColor: 0xfff9c4,
    ...CAPTAIN_CRUMB,
  },
  {
    id: 'butterknife',
    name: 'The Butterknife',
    color: 0x43a047,
    accentColor: 0xc8e6c9,
    ...BUTTERKNIFE,
  },
  {
    id: 'sauce-boss',
    name: 'Sauce Boss',
    color: 0xff6f00,
    accentColor: 0xffe0b2,
    ...SAUCE_BOSS,
  },
  {
    id: 'lil-pepper',
    name: "Lil' Pepper",
    color: 0xab47bc,
    accentColor: 0xe1bee7,
    ...LIL_PEPPER,
  },
];
