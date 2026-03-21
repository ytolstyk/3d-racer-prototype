import * as THREE from "three";
import type { CarState, HazardEffect } from "../../types/game.js";
import { PHYSICS } from "../../constants/physics.js";

export class CarPhysics {
  applyAcceleration(car: CarState, throttle: number, dt: number): void {
    const def = car.definition;
    const accel =
      throttle > 0 ? def.acceleration * throttle : def.braking * throttle;
    car.speed += accel * dt;
    car.speed = Math.max(
      -def.maxSpeed * 0.3,
      Math.min(def.maxSpeed, car.speed),
    );
  }

  applySteering(car: CarState, steerInput: number, dt: number): void {
    const def = car.definition;
    if (Math.abs(steerInput) > 0.01) {
      // When switching direction, snap steering to zero so response is immediate
      if (Math.sign(steerInput) !== Math.sign(car.steeringAngle) && car.steeringAngle !== 0) {
        car.steeringAngle = 0;
      }
      const speedRatio = Math.abs(car.speed) / def.maxSpeed;
      const steerEffect =
        def.handling * (1.0 - speedRatio * PHYSICS.speedSteeringFactor);
      car.steeringAngle +=
        steerInput * PHYSICS.steeringSpeed * steerEffect * dt;
      car.steeringAngle = Math.max(
        -PHYSICS.maxSteeringAngle,
        Math.min(PHYSICS.maxSteeringAngle, car.steeringAngle),
      );
    } else {
      // Return steering to center
      const returnAmount = PHYSICS.steeringReturnSpeed * dt;
      if (Math.abs(car.steeringAngle) < returnAmount) {
        car.steeringAngle = 0;
      } else {
        car.steeringAngle -= Math.sign(car.steeringAngle) * returnAmount;
      }
    }
  }

  applyHazardEffect(car: CarState, effect: HazardEffect, dt: number): void {
    car.speed *=
      effect.speedMultiplier + (1 - effect.speedMultiplier) * (1 - dt * 5);

    // Suppress centripetal grip (slide physics) without killing steering rotation
    car.hazardSteerFactor = Math.min(car.hazardSteerFactor, effect.steeringMultiplier);

    if (effect.lateralDrift > 0) {
      const driftAngle = car.rotation + Math.PI / 2;
      const drift = effect.lateralDrift * dt * (Math.random() - 0.5) * 2;
      car.position.x += Math.sin(driftAngle) * drift;
      car.position.z += Math.cos(driftAngle) * drift;
    }
  }

  updatePosition(car: CarState, dt: number, handbrake = false): void {
    // Speed drag: handbrake locks rear wheels (slightly more resistance), otherwise normal drag
    car.speed *= handbrake ? 0.975 : PHYSICS.drag;

    // Lateral (skid) physics
    const speedRatio = Math.abs(car.speed) / car.definition.maxSpeed;
    const normalizedSteer = car.steeringAngle / PHYSICS.maxSteeringAngle;

    // Centripetal force — sqrt scaling suppresses low-speed slide without amplifying high-speed
    // hazardSteerFactor suppresses grip on oil/butter so car slides mostly straight
    car.lateralVelocity += normalizedSteer * car.speed * 0.45 * Math.pow(speedRatio, 0.5) * dt * car.hazardSteerFactor;

    // Recover hazard steer factor toward 1.0 over ~0.4s
    car.hazardSteerFactor = Math.min(1.0, car.hazardSteerFactor + dt * 2.5);

    // Grip band tightened — car stays planted, slight looseness only at top speed
    const grip = handbrake ? 0.6 : 10 - speedRatio * 2;
    car.lateralVelocity -= car.lateralVelocity * grip * dt;

    // Lateral cap — wider during handbrake for more dramatic slide arc
    const maxLateral = car.definition.maxSpeed * (handbrake ? 0.65 : 0.35);
    car.lateralVelocity = Math.max(-maxLateral, Math.min(maxLateral, car.lateralVelocity));

    car.isSkidding = Math.abs(car.lateralVelocity) > 1.5 || (handbrake && Math.abs(car.speed) > 3);

    // Update rotation based on steering (only when moving)
    // Handbrake during skid: multiply rotation rate for nose-flick effect
    if (Math.abs(car.speed) > 0.1) {
      const rotRate = car.steeringAngle * dt * (car.speed / car.definition.maxSpeed);
      car.rotation += (handbrake && car.isSkidding) ? rotRate * 3.5 : rotRate;
    }

    // Update position: forward + lateral (right = (cosR, 0, -sinR))
    const sinR = Math.sin(car.rotation);
    const cosR = Math.cos(car.rotation);
    car.position.x += sinR * car.speed * dt + cosR * car.lateralVelocity * dt;
    car.position.z += cosR * car.speed * dt - sinR * car.lateralVelocity * dt;
    car.position.y = 0.01;

    // Update mesh
    car.mesh.position.copy(car.position);
    car.mesh.rotation.y = car.rotation;
  }

  bounceFromBoundary(car: CarState, trackCenter: THREE.Vector3, dt: number): void {
    const toCenter = new THREE.Vector3().subVectors(trackCenter, car.position);
    const dist = toCenter.length();
    if (dist < 0.001) return;

    const toCenterDir = toCenter.normalize();

    // Spring push back toward track
    car.position.add(toCenterDir.clone().multiplyScalar(50 * dt));

    // Compute impact component: how much we're driving into the wall
    const heading = new THREE.Vector3(Math.sin(car.rotation), 0, Math.cos(car.rotation));
    const impactComponent = -heading.dot(toCenterDir); // positive = heading into wall

    // Speed-proportional slowdown: harder hit = more speed loss
    if (impactComponent > 0) {
      car.speed *= 1 - impactComponent * 0.5;
    }

    // Lateral redirect impulse — bounce car sideways along the wall
    const right = new THREE.Vector3(Math.cos(car.rotation), 0, -Math.sin(car.rotation));
    const wallTangentSign = Math.sign(right.dot(toCenterDir));
    car.lateralVelocity += impactComponent * 0.5 * wallTangentSign * Math.abs(car.speed);

    // Absorb lateral velocity on wall contact
    car.lateralVelocity *= 0.4;
  }
}
