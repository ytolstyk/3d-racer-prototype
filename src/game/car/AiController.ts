import * as THREE from 'three';
import type { CarState } from '../../types/game.js';
import type { TrackDefinition } from '../track/TrackDefinition.js';
import type { CarPhysics } from './CarPhysics.js';
import { AI_CONFIG } from '../../constants/physics.js';

export class AiController {
  private track: TrackDefinition;
  private physics: CarPhysics;
  private skillLevel: number;
  private lateralOffset: number;

  constructor(track: TrackDefinition, physics: CarPhysics, skillLevel: number) {
    this.track = track;
    this.physics = physics;
    this.skillLevel = Math.max(AI_CONFIG.minSkillLevel, Math.min(AI_CONFIG.maxSkillLevel, skillLevel));
    this.lateralOffset = (Math.random() - 0.5) * AI_CONFIG.lateralVariation;
  }

  update(car: CarState, dt: number): void {
    // Find look-ahead target
    const lookAheadT = (car.currentT + AI_CONFIG.lookAhead) % 1;
    const targetPoint = this.track.getPointAt(lookAheadT);

    // Apply lateral offset for racing line diversity
    const normal = this.track.getNormalAt(lookAheadT);
    targetPoint.add(normal.clone().multiplyScalar(this.lateralOffset));

    // Calculate desired heading
    const toTarget = new THREE.Vector3().subVectors(targetPoint, car.position);
    const desiredAngle = Math.atan2(toTarget.x, toTarget.z);

    // Calculate angle difference
    let angleDiff = desiredAngle - car.rotation;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Proportional steering
    const steerInput = Math.max(-1, Math.min(1, angleDiff * AI_CONFIG.steeringGain));

    // Detect sharp turns ahead for braking
    const farLookAhead = (car.currentT + AI_CONFIG.lookAhead * 2) % 1;
    const currentTangent = this.track.getTangentAt(car.currentT);
    const farTangent = this.track.getTangentAt(farLookAhead);
    const tangentDot = currentTangent.dot(farTangent);
    const turnSharpness = 1 - tangentDot;

    // Throttle control
    let throttle: number;
    if (turnSharpness > AI_CONFIG.brakeAngleThreshold) {
      throttle = AI_CONFIG.brakeFactor * this.skillLevel;
    } else {
      throttle = this.skillLevel;
    }

    // Apply skill-level speed cap
    const effectiveMaxSpeed = car.definition.maxSpeed * this.skillLevel;
    if (car.speed > effectiveMaxSpeed) {
      throttle = 0;
    }

    this.physics.applyAcceleration(car, throttle, dt);
    this.physics.applySteering(car, steerInput, dt);
    this.physics.updatePosition(car, dt);

    // Randomly vary lateral offset occasionally
    if (Math.random() < 0.005) {
      this.lateralOffset = (Math.random() - 0.5) * AI_CONFIG.lateralVariation;
    }
  }
}
