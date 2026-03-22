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
  onCollision: ((position: THREE.Vector3, direction: THREE.Vector3, color: number, carVelocity?: THREE.Vector3) => void) | null = null;

  constructor(track: TrackDefinition, obstacles: ObstacleInfo[], physics: CarPhysics) {
    this.track = track;
    this.obstacles = obstacles;
    this.physics = physics;
  }

  update(cars: CarState[], dt: number): void {
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

  private checkCarCar(a: CarState, b: CarState): void {
    const dist = a.position.distanceTo(b.position);
    const minDist = PHYSICS.carBoundingRadius * 2;

    if (dist < minDist && dist > 0.01) {
      // Push apart
      const pushDir = new THREE.Vector3().subVectors(a.position, b.position).normalize();
      const overlap = minDist - dist;

      a.position.add(pushDir.clone().multiplyScalar(overlap * 0.5));
      b.position.sub(pushDir.clone().multiplyScalar(overlap * 0.5));

      // Directional speed loss
      const headingA = new THREE.Vector3(Math.sin(a.rotation), 0, Math.cos(a.rotation));
      const headingB = new THREE.Vector3(Math.sin(b.rotation), 0, Math.cos(b.rotation));

      // B's heading dot pushDir: >0.4 means B is behind A (rear-end)
      const bDot = headingB.dot(pushDir);
      const aDot = headingA.dot(pushDir.clone().negate());

      if (bDot > 0.4) {
        // B rear-ends A: B loses 20%, A unchanged
        b.speed *= 0.8;
      } else if (aDot > 0.4) {
        // A rear-ends B: A loses 20%, B unchanged
        a.speed *= 0.8;
      } else if (Math.abs(bDot) < 0.35) {
        // Side swipe: no speed loss, positional separation only
      } else {
        // Head-on or ambiguous: both lose 12%
        a.speed *= 0.88;
        b.speed *= 0.88;
      }

      // Emit collision for particles
      if (this.onCollision) {
        const midpoint = a.position.clone().add(b.position).multiplyScalar(0.5);
        const velA = new THREE.Vector3(Math.sin(a.rotation) * a.speed, 0, Math.cos(a.rotation) * a.speed);
        this.onCollision(midpoint, pushDir, a.definition.color, velA);
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
      const pushDir = new THREE.Vector3().subVectors(car.position, obstacle.position).normalize();
      const overlap = minDist - dist;
      car.position.add(pushDir.clone().multiplyScalar(overlap));
      car.speed *= 0.5;
      car.mesh.position.copy(car.position);
      const obsVel = new THREE.Vector3(Math.sin(car.rotation) * car.speed, 0, Math.cos(car.rotation) * car.speed);
      this.onCollision?.(car.position.clone(), pushDir, car.definition.color, obsVel);
    }
  }

  private checkCarBoundary(car: CarState, dt: number): void {
    if (!this.track.isOnTrack(car.position, car.currentT)) {
      const t = this.track.getClosestT(car.position, car.currentT);
      const center = this.track.getPointAt(t);
      this.physics.bounceFromBoundary(car, center, dt);
      car.mesh.position.copy(car.position);

      // Emit sparks on boundary hit — rate-limited to avoid per-frame spam
      const now = performance.now();
      if ((now - (this.boundaryCooldowns.get(car.id) ?? 0)) > 200) {
        this.boundaryCooldowns.set(car.id, now);
        const dir = new THREE.Vector3().subVectors(car.position, center).normalize();
        const carVel = new THREE.Vector3(Math.sin(car.rotation) * car.speed, 0, Math.cos(car.rotation) * car.speed);
        this.onCollision?.(car.position.clone(), dir, car.definition.color, carVel);
      }
    }
  }
}
