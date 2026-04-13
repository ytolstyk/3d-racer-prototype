import * as YUKA from "yuka";
import type { CarState } from "../../types/game.js";
import type { TrackDefinition } from "../track/TrackDefinition.js";
import type { CarPhysics } from "./CarPhysics.js";
import type { DifficultyParams } from "../../constants/physics.js";
import { AI_CONFIG } from "../../constants/physics.js";

const WAYPOINT_COUNT = 120;

interface DelayedInput {
  steer: number;
  throttle: number;
}

export class YukaAiController {
  private readonly vehicle: YUKA.Vehicle;
  private readonly physics: CarPhysics;
  private readonly track: TrackDefinition;
  private readonly params: DifficultyParams;
  private readonly skillLevel: number;

  private readonly centers: Array<{ x: number; z: number }>;
  private readonly normals: Array<{ x: number; z: number }>;
  private lateralOffset: number;
  private readonly yukaPath: YUKA.Path;

  private readonly reactionBuffer: DelayedInput[];
  private reactionHead: number;
  private readonly reactionSize: number;

  constructor(
    track: TrackDefinition,
    physics: CarPhysics,
    skillLevel: number,
    params: DifficultyParams,
  ) {
    this.track = track;
    this.physics = physics;
    this.skillLevel = skillLevel;
    this.params = params;
    this.lateralOffset = 0;

    // Sample waypoints and cache centers + normals
    this.centers = [];
    this.normals = [];
    for (let i = 0; i < WAYPOINT_COUNT; i++) {
      const t = i / WAYPOINT_COUNT;
      const pt = track.getPointAt(t);
      const nm = track.getNormalAt(t);
      this.centers.push({ x: pt.x, z: pt.z });
      this.normals.push({ x: nm.x, z: nm.z });
    }

    // Build initial Yuka path
    this.yukaPath = new YUKA.Path();
    this.yukaPath.loop = true;
    this.rebuildPath();

    // Yuka vehicle
    this.vehicle = new YUKA.Vehicle();
    this.vehicle.maxSpeed = 999;
    this.vehicle.maxForce = 5;
    this.vehicle.mass = 1;
    this.vehicle.updateOrientation = false;

    const followPath = new YUKA.FollowPathBehavior(
      this.yukaPath,
      params.pathRadius,
    );
    this.vehicle.steering.add(followPath);

    // Reaction delay ring buffer
    this.reactionSize = Math.max(1, Math.round(params.reactionDelay * 60));
    this.reactionBuffer = Array.from({ length: this.reactionSize }, () => ({
      steer: 0,
      throttle: skillLevel,
    }));
    this.reactionHead = 0;
  }

  update(car: CarState, dt: number, otherCars?: CarState[]): void {
    // A+B. Desired angle: look-ahead directly on track spline (no Yuka path index)
    const lookT = (car.currentT + 0.04) % 1;
    const wp = this.track.getPointAt(lookT);
    const nm = this.track.getNormalAt(lookT);
    const targetX = wp.x + nm.x * this.lateralOffset;
    const targetZ = wp.z + nm.z * this.lateralOffset;
    const dx = targetX - car.position.x;
    const dz = targetZ - car.position.z;
    const distToWp = Math.sqrt(dx * dx + dz * dz);

    let rawSteer = 0;
    if (distToWp > 0.5) {
      const desiredAngle = Math.atan2(dx, dz);
      let angleDiff = desiredAngle - car.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      rawSteer = Math.max(-1, Math.min(1, angleDiff * AI_CONFIG.steeringGain));
    }

    // C. Wall avoidance: push toward center when near boundary
    const trackCenter = this.track.getPointAt(car.currentT);
    const trackNormal = this.track.getNormalAt(car.currentT);
    // normal points LEFT — positive lateralError = car is LEFT of center
    const lateralError =
      (car.position.x - trackCenter.x) * trackNormal.x +
      (car.position.z - trackCenter.z) * trackNormal.z;
    const wallZone = this.track.width * 0.38;
    if (Math.abs(lateralError) > wallZone) {
      // push RIGHT (+) when displaced LEFT, push LEFT (-) when displaced RIGHT
      const wallPush = Math.sign(lateralError) * 0.65;
      rawSteer = Math.max(-1, Math.min(1, rawSteer + wallPush));
    }

    // D. Car avoidance: steer away from nearby cars in forward cone
    if (otherCars) {
      for (const other of otherCars) {
        if (other.id === car.id || other.finished) continue;
        const odx = other.position.x - car.position.x;
        const odz = other.position.z - car.position.z;
        const dist = Math.sqrt(odx * odx + odz * odz);
        if (dist < 12 && dist > 0.1) {
          // Forward dot: only react to cars ahead
          const dotFwd =
            Math.sin(car.rotation) * odx + Math.cos(car.rotation) * odz;
          if (dotFwd > 0) {
            // 2D cross: positive = other is LEFT → steer RIGHT (+)
            const cross2d =
              Math.sin(car.rotation) * odz - Math.cos(car.rotation) * odx;
            const avoidStrength = (1 - dist / 12) * 0.4;
            rawSteer = Math.max(
              -1,
              Math.min(1, rawSteer + Math.sign(cross2d) * avoidStrength),
            );
          }
        }
      }
    }

    // Noise (after avoidance)
    rawSteer += (Math.random() - 0.5) * 2 * this.params.steeringNoise;
    rawSteer = Math.max(-1, Math.min(1, rawSteer));

    // E. Throttle with improved look-ahead braking
    const tangentNow = this.track.getTangentAt(car.currentT);
    const tMid = (car.currentT + AI_CONFIG.lookAhead * 2) % 1;
    const tFar = (car.currentT + AI_CONFIG.lookAhead * 4) % 1;
    const sharpMid = 1 - tangentNow.dot(this.track.getTangentAt(tMid));
    const sharpFar = 1 - tangentNow.dot(this.track.getTangentAt(tFar));
    const turnSharpness = Math.max(sharpMid, sharpFar * 0.75);

    let rawThrottle: number;
    if (turnSharpness > this.params.brakeSensitivity * 1.8) {
      rawThrottle = 0; // coast — very sharp (no reversal risk)
    } else if (turnSharpness > this.params.brakeSensitivity) {
      rawThrottle = AI_CONFIG.brakeFactor * this.skillLevel; // throttle lift — moderate corner
    } else {
      rawThrottle = this.skillLevel;
    }
    // Speed cap: only cut throttle when accelerating
    if (
      rawThrottle > 0 &&
      car.speed > car.definition.maxSpeed * this.skillLevel
    ) {
      rawThrottle = 0;
    }

    // F. Reaction delay ring buffer
    this.reactionBuffer[this.reactionHead] = {
      steer: rawSteer,
      throttle: rawThrottle,
    };
    const readIdx = (this.reactionHead + 1) % this.reactionSize;
    const delayed = this.reactionBuffer[readIdx];
    this.reactionHead = (this.reactionHead + 1) % this.reactionSize;

    // G. Apply to physics
    this.physics.applyAcceleration(car, delayed.throttle, dt);
    this.physics.applySteering(car, delayed.steer, dt);
    this.physics.updatePosition(car, dt);

    // H. Occasionally vary lateral offset
    if (Math.random() < 0.005) {
      this.lateralOffset = (Math.random() - 0.5) * AI_CONFIG.lateralVariation;
    }
  }

  private rebuildPath(): void {
    this.yukaPath.clear();
    for (let i = 0; i < WAYPOINT_COUNT; i++) {
      this.yukaPath.add(
        new YUKA.Vector3(
          this.centers[i].x + this.normals[i].x * this.lateralOffset,
          0,
          this.centers[i].z + this.normals[i].z * this.lateralOffset,
        ),
      );
    }
  }
}
