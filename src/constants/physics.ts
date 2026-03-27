import type { HazardEffect } from "../types/game.js";

export const PHYSICS = {
  drag: 0.988,
  steeringSpeed: 22.0,
  maxSteeringAngle: 3.0,   // rotation rate (rad/s at full speed) — ~20 unit turn radius
  steeringReturnSpeed: 60.0,
  speedSteeringFactor: 0.2, // less speed-penalty on steering
  boundaryBounceSpeedLoss: 0.5,
  carCollisionSpeedLoss: 0.3,
  carCollisionPushForce: 2.0,
  carBoundingRadius: 2.0,
  obstacleBoundingRadius: 3.0,
} as const;

export const HAZARD_EFFECTS: Record<string, HazardEffect> = {
  juice: { speedMultiplier: 0.5, steeringMultiplier: 1.0, lateralDrift: 0 },
  oil:   { speedMultiplier: 1.0, steeringMultiplier: 0.3, lateralDrift: 0.5 },
  food:  { speedMultiplier: 0.7, steeringMultiplier: 1.0, lateralDrift: 0 },
  milk:  { speedMultiplier: 0.65, steeringMultiplier: 0.8, lateralDrift: 0.2 },
  butter: { speedMultiplier: 0.9, steeringMultiplier: 0.15, lateralDrift: 1.2 },
};

export const DRIFT_PHYSICS = {
  gripHigh: 8.0,              // grip alignment rate (rad/s) at zero speed
  gripLow: 2.8,               // grip alignment rate at max speed
  handbrakeGripMultiplier: 0.12, // rear wheels locked
  counterSteerBonus: 1.6,     // multiplied when steering against slip
  corneringDragFactor: 0.18,  // speed loss per radian of slip per second
  tractionLossMin: 0.35,      // accel fraction remaining at 90° slip
  throttleInertiaTime: 0.40,  // seconds to ramp up throttle (~63%)
  brakeInertiaTime: 0.28,
  frontAxleOffset: 2.0,       // distance center → front axle (for pivot shift)
  skidSlipThreshold: 0.25,    // radians above which isSkidding = true
} as const;

export const AI_CONFIG = {
  lookAhead: 0.03,
  steeringGain: 3.0,
  brakeAngleThreshold: 0.5,
  brakeFactor: 0.65,
  lateralVariation: 1.5,
  minSkillLevel: 0.7,
  maxSkillLevel: 1.0,
} as const;
