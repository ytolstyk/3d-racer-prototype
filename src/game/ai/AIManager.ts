import * as YUKA from "yuka";
import type { CarState, HazardZone } from "../../types/game.js";
import type { TrackDefinition } from "../track/TrackDefinition.js";
import type { CarPhysics } from "../car/CarPhysics.js";
import type { DifficultyParams } from "../../constants/aiRacer.js";
import type { ObstacleInfo } from "../scene/ObstacleFactory.js";
import {
  AI_CONFIG,
  AI_VEHICLE,
  AI_BEHAVIOR_WEIGHTS,
} from "../../constants/aiRacer.js";
import { buildYukaPath } from "./pathUtils.js";

const WAYPOINT_COUNT = 400;

interface DelayedInput {
  steer: number;
  throttle: number;
}

interface AiVehicleState {
  vehicle: YUKA.Vehicle;
  path: YUKA.Path;
  params: DifficultyParams;
  skillLevel: number;
  reactionBuffer: DelayedInput[];
  reactionHead: number;
  reactionSize: number;
  stuckTimer: number;
  reverseTimer: number;
  separation: YUKA.SeparationBehavior;
}

export class AIManager {
  private readonly track: TrackDefinition;
  private readonly physics: CarPhysics;
  private readonly obstacleEntities: YUKA.GameEntity[];
  private readonly vehicles: Map<string, AiVehicleState> = new Map();
  private readonly yukaForce: YUKA.Vector3 = new YUKA.Vector3();

  constructor(
    track: TrackDefinition,
    physics: CarPhysics,
    _difficulty: string,
    staticObstacles: ObstacleInfo[],
    hazardZones: HazardZone[],
  ) {
    this.track = track;
    this.physics = physics;

    // Build shared obstacle entities from static obstacles + hazard zones
    this.obstacleEntities = [];
    for (const obs of staticObstacles) {
      const e = new YUKA.GameEntity();
      e.position.set(obs.position.x, 0, obs.position.z);
      e.boundingRadius = obs.radius;
      this.obstacleEntities.push(e);
    }
    for (const hz of hazardZones) {
      const e = new YUKA.GameEntity();
      if (hz.centerX !== undefined && hz.radius !== undefined) {
        e.position.set(hz.centerX, 0, hz.centerZ!);
        e.boundingRadius = hz.radius;
      } else if (hz.tStart !== undefined && hz.tEnd !== undefined) {
        const tMid =
          hz.tStart <= hz.tEnd
            ? (hz.tStart + hz.tEnd) / 2
            : ((hz.tStart + hz.tEnd + 1) / 2) % 1;
        const pt = track.getPointAt(tMid);
        const nm = track.getNormalAt(tMid);
        const offset = hz.lateralOffset ?? 0;
        e.position.set(pt.x + nm.x * offset, 0, pt.z + nm.z * offset);
        e.boundingRadius = (hz.width ?? 10) / 2;
      } else {
        continue;
      }
      this.obstacleEntities.push(e);
    }
  }

  addCar(carId: string, skillLevel: number, params: DifficultyParams): void {
    // Each vehicle gets its own path clone (YUKA.Path has internal _index state)
    const path = buildYukaPath(this.track, WAYPOINT_COUNT);
    path.loop = true;

    const vehicle = new YUKA.Vehicle();
    vehicle.maxSpeed = 8 + Math.random() * 4;
    vehicle.maxForce = AI_VEHICLE.maxForce;
    vehicle.mass = AI_VEHICLE.mass;
    vehicle.updateOrientation = false;

    // 1. OnPath: wide soft wall containment
    const onPath = new YUKA.OnPathBehavior(
      path,
      this.track.width * AI_VEHICLE.onPathRadiusFraction,
      1.0,
    );
    onPath.weight = AI_BEHAVIOR_WEIGHTS.onPath;
    vehicle.steering.add(onPath);

    // 2. FollowPath: apex trick via nextWaypointDistance
    const followPath = new YUKA.FollowPathBehavior(
      path,
      params.nextWaypointDistance,
    );
    followPath.weight = AI_BEHAVIOR_WEIGHTS.followPath;
    vehicle.steering.add(followPath);

    // 3. ObstacleAvoidance: hazard zones + static obstacles
    const obstacleAvoidance = new YUKA.ObstacleAvoidanceBehavior(
      this.obstacleEntities,
    );
    obstacleAvoidance.dBoxMinLength = AI_VEHICLE.obstacleDetectionBoxMin;
    obstacleAvoidance.weight = AI_BEHAVIOR_WEIGHTS.obstacleAvoidance;
    vehicle.steering.add(obstacleAvoidance);

    // 4. Separation: gentle push-apart
    const separation = new YUKA.SeparationBehavior();
    separation.weight = AI_BEHAVIOR_WEIGHTS.separation;
    vehicle.steering.add(separation);

    // Reaction delay ring buffer
    const reactionSize = Math.max(1, Math.round(params.reactionDelay * 60));
    const reactionBuffer: DelayedInput[] = Array.from(
      { length: reactionSize },
      () => ({
        steer: 0,
        throttle: skillLevel,
      }),
    );

    this.vehicles.set(carId, {
      vehicle,
      path,
      params,
      skillLevel,
      reactionBuffer,
      reactionHead: 0,
      reactionSize,
      stuckTimer: 0,
      reverseTimer: 0,
      separation,
    });
  }

  /** Set each vehicle's neighbors to all other AI vehicles for SeparationBehavior. */
  linkNeighbors(): void {
    const allVehicles = Array.from(this.vehicles.values()).map(
      (s) => s.vehicle,
    );
    for (const state of this.vehicles.values()) {
      // neighbors is typed readonly but Yuka expects it to be set externally for SeparationBehavior
      (state.vehicle as { neighbors: YUKA.GameEntity[] }).neighbors =
        allVehicles.filter((v) => v !== state.vehicle);
    }
  }

  update(cars: CarState[], dt: number): void {
    for (const car of cars) {
      if (car.isPlayer) continue;
      const state = this.vehicles.get(car.id);
      if (!state) continue;

      // A. Sync path index to current race progress every frame
      const targetIdx = Math.floor(car.currentT * (WAYPOINT_COUNT - 1));
      (state.path as any)._index = targetIdx;

      // B. Sync Yuka vehicle to real car state
      state.vehicle.position.set(car.position.x, 0, car.position.z);
      state.vehicle.rotation.fromEuler(0, car.rotation, 0);
      const effectiveSpeed = car.speed !== 0 ? car.speed : 1;
      state.vehicle.velocity.set(
        Math.sin(car.rotation) * effectiveSpeed,
        0,
        Math.cos(car.rotation) * effectiveSpeed,
      );

      // Suppress separation before cars are moving to avoid start-grid diving
      state.separation.weight =
        car.speed < 3.0 ? 0 : AI_BEHAVIOR_WEIGHTS.separation;

      // C. Compute combined steering force from all 4 behaviors
      this.yukaForce.set(0, 0, 0);
      state.vehicle.steering.calculate(dt, this.yukaForce);

      // D. Apply damping to smooth the combined force
      if (AI_VEHICLE.damping > 0) {
        const dampFactor = 1 - AI_VEHICLE.damping;
        this.yukaForce.multiplyScalar(dampFactor);
      }

      // E. Convert force direction → steer [-1, 1]
      let rawSteer = 0;
      const forceMag = Math.sqrt(this.yukaForce.x ** 2 + this.yukaForce.z ** 2);
      if (forceMag > 0.01) {
        const forceAngle = Math.atan2(this.yukaForce.x, this.yukaForce.z);
        let angleDiff = forceAngle - car.rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        rawSteer = Math.max(
          -1,
          Math.min(1, angleDiff * AI_CONFIG.steeringGain),
        );
      }

      // F. Noise
      rawSteer += (Math.random() - 0.5) * 2 * state.params.steeringNoise;
      rawSteer = Math.max(-1, Math.min(1, rawSteer));

      // G. Throttle with look-ahead braking
      const tangentNow = this.track.getTangentAt(car.currentT);
      const tMid = (car.currentT + AI_CONFIG.lookAhead * 2) % 1;
      const tFar = (car.currentT + AI_CONFIG.lookAhead * 4) % 1;
      const sharpMid = 1 - tangentNow.dot(this.track.getTangentAt(tMid));
      const sharpFar = 1 - tangentNow.dot(this.track.getTangentAt(tFar));
      const turnSharpness = Math.max(sharpMid, sharpFar * 0.75);

      let rawThrottle: number;
      if (turnSharpness > state.params.brakeSensitivity * 1.8) {
        rawThrottle = 0;
      } else if (turnSharpness > state.params.brakeSensitivity) {
        rawThrottle = AI_CONFIG.brakeFactor * state.skillLevel;
      } else {
        rawThrottle = state.skillLevel;
      }
      if (
        rawThrottle > 0 &&
        car.speed > car.definition.maxSpeed * state.skillLevel
      ) {
        rawThrottle = 0;
      }

      // Stuck recovery
      const STUCK_SPEED = 2.0;
      const STUCK_THRESH = 1.2; // seconds before triggering reverse
      const REVERSE_DUR = 1.5; // seconds to stay in reverse

      if (state.reverseTimer > 0) {
        state.reverseTimer -= dt;
        rawThrottle = -0.7;
        rawSteer = -rawSteer; // invert steer so car swings away from wall
        state.stuckTimer = 0;
      } else {
        if (Math.abs(car.speed) < STUCK_SPEED && rawThrottle > 0) {
          state.stuckTimer += dt;
        } else {
          state.stuckTimer = 0;
        }
        if (state.stuckTimer > STUCK_THRESH) {
          state.reverseTimer = REVERSE_DUR;
          state.stuckTimer = 0;
        }
      }

      // H. Reaction delay ring buffer
      state.reactionBuffer[state.reactionHead] = {
        steer: rawSteer,
        throttle: rawThrottle,
      };
      const readIdx = (state.reactionHead + 1) % state.reactionSize;
      const delayed = state.reactionBuffer[readIdx];
      state.reactionHead = (state.reactionHead + 1) % state.reactionSize;

      // I. Apply to physics
      this.physics.applyAcceleration(car, delayed.throttle, dt);
      this.physics.applySteering(car, delayed.steer, dt);
      this.physics.updatePosition(car, dt);
    }
  }

  dispose(): void {
    this.vehicles.clear();
  }
}
