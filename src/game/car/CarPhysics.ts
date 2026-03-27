import * as THREE from "three";
import type { CarState, HazardEffect } from "../../types/game.js";
import { PHYSICS, DRIFT_PHYSICS } from "../../constants/physics.js";

export class CarPhysics {
  private lastSteerSign = 0;

  private normalizeAngle(a: number): number {
    return ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  }

  applyAcceleration(car: CarState, throttle: number, dt: number): void {
    const def = car.definition;
    const tau = throttle > 0 ? DRIFT_PHYSICS.throttleInertiaTime : DRIFT_PHYSICS.brakeInertiaTime;
    const blend = 1 - Math.exp(-dt / tau);

    let tractionFactor = 1.0;
    if (throttle > 0) {
      const slip = this.normalizeAngle(car.velocityAngle - car.rotation);
      const slipFraction = Math.min(1, Math.abs(slip) / (Math.PI / 2));
      tractionFactor = 1 - slipFraction * (1 - DRIFT_PHYSICS.tractionLossMin);
    }

    const force = throttle > 0 ? def.acceleration * throttle : def.braking * throttle;
    car.speed += force * blend * tractionFactor;
    car.speed = Math.max(-def.maxSpeed * 0.3, Math.min(car.speed, def.maxSpeed));
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
    this.lastSteerSign = steerInput;
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
    // 1. Drag
    car.speed *= handbrake ? 0.972 : PHYSICS.drag;

    // 2. Slip angle
    const slip = this.normalizeAngle(car.velocityAngle - car.rotation);

    // 3. Grip factor
    const speedRatio = Math.abs(car.speed) / car.definition.maxSpeed;
    const baseGrip = DRIFT_PHYSICS.gripHigh + (DRIFT_PHYSICS.gripLow - DRIFT_PHYSICS.gripHigh) * speedRatio;
    const hbMult = handbrake ? DRIFT_PHYSICS.handbrakeGripMultiplier : 1.0;
    const isCounterSteer = this.lastSteerSign !== 0 && Math.sign(this.lastSteerSign) !== Math.sign(slip);
    const csMult = isCounterSteer ? DRIFT_PHYSICS.counterSteerBonus * car.definition.handling : 1.0;
    const effectiveGrip = baseGrip * hbMult * csMult * car.hazardSteerFactor;

    // 4. Align velocityAngle → rotation
    const maxRot = effectiveGrip * dt;
    const alignDelta = Math.max(-maxRot, Math.min(maxRot, slip));
    car.velocityAngle -= alignDelta;

    // 5. Cornering drag
    car.speed *= 1 - Math.abs(slip) * DRIFT_PHYSICS.corneringDragFactor * dt;

    // 6. Rotation from steering
    const rotRate = car.steeringAngle * dt * (car.speed / car.definition.maxSpeed);
    const rotDelta = (handbrake && Math.abs(slip) > DRIFT_PHYSICS.skidSlipThreshold)
      ? rotRate * 3.5
      : rotRate;

    // 7. Handbrake pivot correction (simulates front-axle rotation center)
    if (handbrake && Math.abs(rotDelta) > 0.001) {
      const pivotShift = DRIFT_PHYSICS.frontAxleOffset * Math.sin(rotDelta);
      const rightX = Math.cos(car.rotation);
      const rightZ = -Math.sin(car.rotation);
      const steerSign = Math.sign(car.steeringAngle);
      car.position.x -= rightX * pivotShift * steerSign;
      car.position.z -= rightZ * pivotShift * steerSign;
    }

    // 8. Apply rotation
    car.rotation += rotDelta;

    // 9. Derive lateralVelocity (backward compat with TireMarkSystem, TireSmokeSystem)
    const slipAfter = this.normalizeAngle(car.velocityAngle - car.rotation);
    car.lateralVelocity = Math.sin(slipAfter) * Math.abs(car.speed);

    // 10. Skid flag
    car.isSkidding = Math.abs(slip) > DRIFT_PHYSICS.skidSlipThreshold || (handbrake && Math.abs(car.speed) > 3);

    // 11. Position update (velocity vector, not heading)
    car.position.x += Math.sin(car.velocityAngle) * car.speed * dt;
    car.position.z += Math.cos(car.velocityAngle) * car.speed * dt;
    car.position.y = 0.01;

    // 12. Hazard factor recovery
    car.hazardSteerFactor = Math.min(1.0, car.hazardSteerFactor + dt * 2.5);

    // 13. Mesh sync
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

    // Reflect velocity angle toward wall normal so redirect persists next frame
    const wallNormalAngle = Math.atan2(toCenterDir.x, toCenterDir.z);
    const vaDiff = this.normalizeAngle(wallNormalAngle - car.velocityAngle);
    car.velocityAngle += vaDiff * 0.5 * impactComponent;
  }
}
