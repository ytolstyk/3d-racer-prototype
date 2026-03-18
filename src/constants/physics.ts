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
  oil: { speedMultiplier: 1.0, steeringMultiplier: 0.3, lateralDrift: 0.5 },
  food: { speedMultiplier: 0.7, steeringMultiplier: 1.0, lateralDrift: 0 },
};

export const AI_CONFIG = {
  lookAhead: 0.03,
  steeringGain: 3.0,
  brakeAngleThreshold: 0.4,
  brakeFactor: 0.6,
  lateralVariation: 1.5,
  minSkillLevel: 0.7,
  maxSkillLevel: 1.0,
} as const;
