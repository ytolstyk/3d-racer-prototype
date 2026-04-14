import type { Difficulty } from "../types/game.js";

// ─── Yuka Steering Behavior Weights ────────────────────────────────────────
// Higher weight = stronger influence on the combined steering output.
// The net force from all behaviors is summed and capped at maxForce.
export const AI_BEHAVIOR_WEIGHTS = {
  /** Soft containment — wide radius does the work, low weight avoids fighting followPath. */
  onPath: 2.5,
  /** Primary driver — dominates steering, advances along waypoints. */
  followPath: 1.5,
  /** Emergency swerve when a hazard zone or static obstacle is in the detection box. */
  obstacleAvoidance: 3.0,
  /** Gentle push-apart — low to avoid violent swerving during overtakes. */
  separation: 0.8,
} as const;

// ─── Yuka Vehicle Settings ──────────────────────────────────────────────────
export const AI_VEHICLE = {
  /**
   * Virtual speed (units/s) used when syncing the Yuka vehicle velocity each frame.
   * Only the *direction* matters for steering conversion — actual car speed is
   * handled by CarPhysics, not Yuka. Controls how far ahead OnPathBehavior predicts.
   */
  virtualSpeed: 20,
  /** Maximum combined steering force (Yuka units). Lower cap prevents instant direction changes. */
  maxForce: 50,
  /** Vehicle mass — heavier = smoother steering momentum. */
  mass: 2.0,
  /** Damping factor applied to combined behavior forces. Smooths out jitter. */
  damping: 0.1,
  /**
   * Minimum length of the obstacle detection box (Yuka units).
   * Larger = detects hazards earlier; smaller = only swerves at close range.
   */
  obstacleDetectionBoxMin: 6,
  /**
   * Fraction of track width used as the OnPathBehavior radius.
   * 0.8 = wide soft containment walls, lets car freely cut corners.
   */
  onPathRadiusFraction: 0.8,
} as const;

// ─── General AI Steering ────────────────────────────────────────────────────
export const AI_CONFIG = {
  /** How far ahead (in track t-units, 0–1) the braking look-ahead samples. */
  lookAhead: 0.03,
  /** Proportional gain converting angle-error (rad) → steer input [-1, 1].
   *  Higher = snappier response; too high causes oscillation. */
  steeringGain: 2.5,
  /** Throttle fraction applied during moderate corners (between the two brake thresholds). */
  brakeFactor: 0.65,
  minSkillLevel: 0.7,
  maxSkillLevel: 1.0,
} as const;

// ─── Difficulty Presets ─────────────────────────────────────────────────────
export interface DifficultyParams {
  /** [min, max] skill level — each AI car rolls a random value in this range. */
  skillRange: [number, number];
  /** Random noise added to steer input each frame. Higher = wobblier driving. */
  steeringNoise: number;
  /** Seconds before inputs are applied (ring buffer delay). Simulates reaction time. */
  reactionDelay: number;
  /**
   * Tangent-dot threshold for braking.
   * Higher = AI brakes later / corners faster.
   * Full brake fires at threshold × 1.8; partial lift at threshold × 1.0.
   */
  brakeSensitivity: number;
  /**
   * FollowPathBehavior nextWaypointDistance — the "apex trick".
   * Larger = AI advances to the next waypoint sooner, cutting corners more aggressively.
   */
  nextWaypointDistance: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyParams> = {
  easy: {
    skillRange: [0.68, 0.75],
    steeringNoise: 0.18,
    reactionDelay: 0.1,
    brakeSensitivity: 0.28,
    nextWaypointDistance: 15.0,
  },
  medium: {
    skillRange: [0.82, 0.9],
    steeringNoise: 0.09,
    reactionDelay: 0.07,
    brakeSensitivity: 0.38,
    nextWaypointDistance: 12.0,
  },
  hard: {
    skillRange: [0.94, 1.0],
    steeringNoise: 0.03,
    reactionDelay: 0.02,
    brakeSensitivity: 0.48,
    nextWaypointDistance: 9.0,
  },
} as const;
