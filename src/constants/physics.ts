import type { HazardEffect } from "../types/game.js";

export const PHYSICS = {
  drag: 0.994, // per-frame speed multiplier when coasting (0.994^60 ≈ 0.70 — gradual coast-down)
  steeringSpeed: 40.0,
  maxSteeringAngle: 3.5, // rotation rate (rad/s at full speed) — ~20 unit turn radius
  steeringReturnSpeed: 60.0,
  speedSteeringFactor: 0.7, // how much speed reduces steering effectiveness (0.5 → 50% at max speed)
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
  milk: { speedMultiplier: 0.65, steeringMultiplier: 0.8, lateralDrift: 0.2 },
  butter: { speedMultiplier: 0.9, steeringMultiplier: 0.15, lateralDrift: 1.2 },
};

export const DRIFT_PHYSICS = {
  gripHigh: 8.0, // grip alignment rate (rad/s) at zero speed
  gripLow: 2.8, // grip alignment rate at max speed
  handbrakeGripMultiplier: 0.12, // rear wheels locked — low = more drift
  counterSteerBonus: 1.6, // multiplied when steering against slip
  corneringDragFactor: 0.18, // speed loss per radian of slip per second
  tractionLossMin: 0.35, // accel fraction remaining at 90° slip
  throttleInertiaTime: 0.7, // seconds to ramp up throttle (~63%)
  brakeInertiaTime: 0.5,
  frontAxleOffset: 2.0, // distance center → front axle (for pivot shift)
  skidSlipThreshold: 0.1, // radians above which isSkidding = true

  minLowSpeedFactor: 0.35, // floor on speed ratio in rotation calc
  handbrakeAccelMultiplier: 0.25, // accel force fraction when HB held
  handbrakeDragNoThrottle: 0.998, // gradual drag: HB held + no throttle
  burnoutDuration: 1, // seconds of burnout after HB release
  burnoutTractionFactor: 0.6, // accel fraction during burnout

  // CarPhysics internal constants
  handbrakeDrag: 0.994, // per-frame speed multiplier when handbrake active + throttle
  maxReverseSpeedFraction: 0.3, // max reverse speed as fraction of maxSpeed
  hardBrakingThreshold: 0.3, // speed fraction above which hard braking triggers skid
  handbrakeRotationMultiplier: 1.2, // rotation rate multiplier when handbraking above slip threshold
  highSpeedRatioThreshold: 0.75, // speedRatio above which high-speed slip activates
  highSpeedSteerThreshold: 0.8, // steeringAngle (rad) above which high-speed slip activates
  spinoutRotationFactor: 0.015, // extra rotation added per unit of high-speed slip extra
} as const;

export const CONTROLLER_PHYSICS = {
  directionReversalBrakeThreshold: 2.0, // speed below which direction-change braking is skipped
  directionReversalBrakeForce: 0.4, // gentle braking throttle when reversing at speed
  handbrakeSpeedCap: 0.4, // fraction of maxSpeed at which handbrake stops actively braking
  handbrakeBrakeThrottle: -0.2, // active throttle applied when handbrake + forward and above cap
  postDriftBoostFraction: 0.0, // maxSpeed fraction added as boost on handbrake release
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
