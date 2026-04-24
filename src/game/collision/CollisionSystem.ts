import * as THREE from 'three';
import type { CarState } from '../../types/game.js';
import type { ObstacleInfo } from '../scene/ObstacleFactory.js';
import type { TrackDefinition } from '../track/TrackDefinition.js';
import type { CarPhysics } from '../car/CarPhysics.js';
import { PHYSICS } from '../../constants/physics.js';

export class CollisionSystem {
  private track: TrackDefinition;
  private obstacles: ObstacleInfo[];
  private physics: CarPhysics;
  private boundaryCooldowns = new Map<string, number>();
  private lastCollisionTime = new Map<string, number>();
  private now = 0;
  onCollision: ((position: THREE.Vector3, direction: THREE.Vector3, color: number, carVelocity?: THREE.Vector3) => void) | null = null;

  // Pre-allocated scratch vectors — never reassigned, mutated in place
  private readonly _pushDir = new THREE.Vector3();
  private readonly _headingA = new THREE.Vector3();
  private readonly _headingB = new THREE.Vector3();
  private readonly _midpoint = new THREE.Vector3();
  private readonly _carVel = new THREE.Vector3();
  private readonly _dir = new THREE.Vector3();

  constructor(track: TrackDefinition, obstacles: ObstacleInfo[], physics: CarPhysics) {
    this.track = track;
    this.obstacles = obstacles;
    this.physics = physics;
  }

  update(cars: CarState[], dt: number): void {
    this.now += dt;

    // Car-car collisions
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        this.checkCarCar(cars[i], cars[j]);
      }
    }

    // Car-obstacle collisions
    for (const car of cars) {
      for (const obstacle of this.obstacles) {
        this.checkCarObstacle(car, obstacle);
      }
    }

    // Car-boundary collisions
    for (const car of cars) {
      this.checkCarBoundary(car, dt);
    }
  }

  private emitCollision(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    carId: string,
    color: number,
    velocity: THREE.Vector3,
  ): void {
    if (!this.onCollision) return;
    const isRecent = this.now - (this.lastCollisionTime.get(carId) ?? -Infinity) < 0.5;
    if (isRecent) {
      this.onCollision(position, direction, color, undefined);
    } else {
      this.onCollision(position, direction, color, velocity);
      this.lastCollisionTime.set(carId, this.now);
    }
  }

  private checkCarCar(a: CarState, b: CarState): void {
    const dist = a.position.distanceTo(b.position);
    const minDist = PHYSICS.carBoundingRadius * 2;

    if (dist < minDist && dist > 0.01) {
      // Push apart — reuse pooled vectors
      this._pushDir.subVectors(a.position, b.position).normalize();
      const overlap = minDist - dist;
      a.position.addScaledVector(this._pushDir, overlap * 0.5);
      b.position.addScaledVector(this._pushDir, -overlap * 0.5);

      // Directional speed loss
      this._headingA.set(Math.sin(a.rotation), 0, Math.cos(a.rotation));
      this._headingB.set(Math.sin(b.rotation), 0, Math.cos(b.rotation));

      const bDot = this._headingB.dot(this._pushDir);
      const aDot = -this._headingA.dot(this._pushDir); // negated instead of clone().negate()

      if (bDot > 0.4) {
        b.speed *= 0.8;
      } else if (aDot > 0.4) {
        a.speed *= 0.8;
      } else if (Math.abs(bDot) < 0.35) {
        // Side swipe: no speed loss
      } else {
        a.speed *= 0.88;
        b.speed *= 0.88;
      }

      // Emit collision particles — only if car speed is above 50% max
      if (a.speed >= a.definition.maxSpeed * 0.5) {
        this._midpoint.addVectors(a.position, b.position).multiplyScalar(0.5);
        this._carVel.set(Math.sin(a.rotation) * a.speed, 0, Math.cos(a.rotation) * a.speed);
        this.emitCollision(this._midpoint, this._pushDir, a.id, a.definition.color, this._carVel);
      }

      // Update meshes
      a.mesh.position.copy(a.position);
      b.mesh.position.copy(b.position);
    }
  }

  private checkCarObstacle(car: CarState, obstacle: ObstacleInfo): void {
    const dist = car.position.distanceTo(obstacle.position);
    const minDist = PHYSICS.carBoundingRadius + obstacle.radius;

    if (dist < minDist && dist > 0.01) {
      this._dir.subVectors(car.position, obstacle.position).normalize();
      car.position.addScaledVector(this._dir, minDist - dist);
      car.speed *= 0.5;
      car.mesh.position.copy(car.position);

      if (car.speed >= car.definition.maxSpeed * 0.5) {
        this._carVel.set(Math.sin(car.rotation) * car.speed, 0, Math.cos(car.rotation) * car.speed);
        this.emitCollision(car.position, this._dir, car.id, car.definition.color, this._carVel);
      }
    }
  }

  private checkCarBoundary(car: CarState, dt: number): void {
    if (!this.track.isOnTrack(car.position, car.currentT)) {
      const t = this.track.getClosestT(car.position, car.currentT);
      const center = this.track.getPointAt(t);

      this.physics.bounceFromBoundary(car, center, dt);
      car.mesh.position.copy(car.position);

      // Emit sparks on boundary hit — rate-limited + speed check
      if (car.speed >= car.definition.maxSpeed * 0.5) {
        const now = performance.now();
        if ((now - (this.boundaryCooldowns.get(car.id) ?? 0)) > 200) {
          this.boundaryCooldowns.set(car.id, now);
          this._dir.subVectors(car.position, center).normalize();
          this._carVel.set(Math.sin(car.rotation) * car.speed, 0, Math.cos(car.rotation) * car.speed);
          this.emitCollision(car.position, this._dir, car.id, car.definition.color, this._carVel);
        }
      }
    }
  }
}
