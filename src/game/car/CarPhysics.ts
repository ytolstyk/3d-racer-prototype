import * as THREE from "three";
import type { CarState, HazardEffect } from "../../types/game.js";
import { PHYSICS, DRIFT_PHYSICS } from "../../constants/physics.js";

export class CarPhysics {
  private lastSteerSign = 0;
  private driftResidual = 0;
  private wasHandbraking = false;

  private normalizeAngle(a: number): number {
    return (((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  }

  applyAcceleration(car: CarState, throttle: number, dt: number, handbrake = false): void {
    const def = car.definition;
    const tau =
      throttle > 0
        ? DRIFT_PHYSICS.throttleInertiaTime
        : DRIFT_PHYSICS.brakeInertiaTime;
    const blend = 1 - Math.exp(-dt / tau);

    let tractionFactor = 1.0;
    if (throttle > 0) {
      const slip = this.normalizeAngle(car.velocityAngle - car.rotation);
      const slipFraction = Math.min(1, Math.abs(slip) / (Math.PI / 2));
      tractionFactor = 1 - slipFraction * (1 - DRIFT_PHYSICS.tractionLossMin);
    }

    // Burnout traction
    if (throttle > 0 && car.burnoutTimer > 0) {
      tractionFactor *= DRIFT_PHYSICS.burnoutTractionFactor;
    }

    const hbAccelMult = (handbrake && throttle > 0) ? DRIFT_PHYSICS.handbrakeAccelMultiplier : 1.0;
    const force =
      throttle > 0 ? def.acceleration * throttle : def.braking * throttle;
    car.speed += force * blend * tractionFactor * hbAccelMult;
    car.speed = Math.max(
      -def.maxSpeed * DRIFT_PHYSICS.maxReverseSpeedFraction,
      Math.min(car.speed, def.maxSpeed),
    );

    // Burnout trigger: HB released while driftResidual high and throttle applied
    const handbrakeJustReleased = this.wasHandbraking && !handbrake;
    if (handbrakeJustReleased && throttle > 0 && this.driftResidual > 0.4 && car.burnoutTimer <= 0) {
      car.burnoutTimer = DRIFT_PHYSICS.burnoutDuration;
    }
    this.wasHandbraking = handbrake;

    // Tick burnout timer
    if (car.burnoutTimer > 0) {
      car.burnoutTimer = Math.max(0, car.burnoutTimer - dt);
    }
  }

  applySteering(car: CarState, steerInput: number, dt: number): void {
    const def = car.definition;
    if (Math.abs(steerInput) > 0.01) {
      // When switching direction, snap steering to zero so response is immediate
      if (
        Math.sign(steerInput) !== Math.sign(car.steeringAngle) &&
        car.steeringAngle !== 0
      ) {
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
    car.hazardSteerFactor = Math.min(
      car.hazardSteerFactor,
      effect.steeringMultiplier,
    );

    if (effect.lateralDrift > 0) {
      const driftAngle = car.rotation + Math.PI / 2;
      const drift = effect.lateralDrift * dt * (Math.random() - 0.5) * 2;
      car.position.x += Math.sin(driftAngle) * drift;
      car.position.z += Math.cos(driftAngle) * drift;
    }
  }

  updatePosition(car: CarState, dt: number, handbrake = false, throttle = 0): void {
    // 1. Drag
    const drag = handbrake
      ? (throttle <= 0 ? DRIFT_PHYSICS.handbrakeDragNoThrottle : DRIFT_PHYSICS.handbrakeDrag)
      : PHYSICS.drag;
    car.speed *= drag;

    // 2. Slip angle
    const slip = this.normalizeAngle(car.velocityAngle - car.rotation);

    // 3. Drift residual — builds up while actively drifting, decays on release
    if (handbrake && Math.abs(slip) > DRIFT_PHYSICS.skidSlipThreshold) {
      this.driftResidual = Math.min(1.0, this.driftResidual + dt * 4);
    } else {
      this.driftResidual = Math.max(0, this.driftResidual - dt * 1.2);
    }

    // 4. Grip factor
    const speedRatio = Math.abs(car.speed) / car.definition.maxSpeed;
    const baseGrip =
      DRIFT_PHYSICS.gripHigh +
      (DRIFT_PHYSICS.gripLow - DRIFT_PHYSICS.gripHigh) * speedRatio;
    const hbMult = handbrake
      ? DRIFT_PHYSICS.handbrakeGripMultiplier
      : Math.max(
          DRIFT_PHYSICS.handbrakeGripMultiplier * 4,
          1.0 - this.driftResidual * (1 - DRIFT_PHYSICS.handbrakeGripMultiplier * 4)
        );
    const isCounterSteer =
      this.lastSteerSign !== 0 &&
      Math.sign(this.lastSteerSign) !== Math.sign(slip);
    const csMult = isCounterSteer
      ? DRIFT_PHYSICS.counterSteerBonus * car.definition.handling
      : 1.0;

    // High-speed turn slip: reduce grip and add slight spinout rotation
    let highSpeedSlipExtra = 0;
    if (speedRatio > DRIFT_PHYSICS.highSpeedRatioThreshold && Math.abs(car.steeringAngle) > DRIFT_PHYSICS.highSpeedSteerThreshold) {
      highSpeedSlipExtra =
        ((speedRatio - DRIFT_PHYSICS.highSpeedRatioThreshold) / (1 - DRIFT_PHYSICS.highSpeedRatioThreshold)) *
        (Math.abs(car.steeringAngle) / PHYSICS.maxSteeringAngle) *
        0.4;
    }
    const gripFactor = 1 - highSpeedSlipExtra * 0.5;
    const effectiveGrip =
      baseGrip * hbMult * csMult * car.hazardSteerFactor * gripFactor;

    // 5. Align velocityAngle → rotation
    // When velocity is reversed relative to heading (|slip| > 90°), boost alignment
    // rate proportionally — a fully reversed velocity (180°) corrects 4x faster.
    const slipAbs = Math.abs(slip);
    const reverseBoost = slipAbs > Math.PI / 3
      ? 1.0 + ((slipAbs - Math.PI / 3) / (Math.PI / 3)) * 3.0
      : 1.0;
    const maxRot = effectiveGrip * reverseBoost * dt;
    const alignDelta = Math.max(-maxRot, Math.min(maxRot, slip));
    car.velocityAngle -= alignDelta;

    // 6. Cornering drag
    car.speed *= 1 - Math.abs(slip) * DRIFT_PHYSICS.corneringDragFactor * dt;

    // 7. Rotation from steering
    const speedFactor = Math.max(DRIFT_PHYSICS.minLowSpeedFactor, Math.abs(car.speed) / car.definition.maxSpeed);
    const signedSpeedFactor = Math.sign(car.speed) * speedFactor;
    let rotRate = car.steeringAngle * dt * signedSpeedFactor;
    // High-speed turn: add slight spinout rotation
    if (highSpeedSlipExtra > 0) {
      rotRate += Math.sign(car.steeringAngle) * highSpeedSlipExtra * DRIFT_PHYSICS.spinoutRotationFactor;
    }
    const rotDelta =
      handbrake && Math.abs(slip) > DRIFT_PHYSICS.skidSlipThreshold
        ? rotRate * DRIFT_PHYSICS.handbrakeRotationMultiplier
        : rotRate;

    // 8. Handbrake pivot correction (simulates front-axle rotation center)
    if (handbrake && Math.abs(rotDelta) > 0.001) {
      const pivotShift = DRIFT_PHYSICS.frontAxleOffset * Math.sin(rotDelta);
      const rightX = Math.cos(car.rotation);
      const rightZ = -Math.sin(car.rotation);
      const steerSign = Math.sign(car.steeringAngle);
      car.position.x -= rightX * pivotShift * steerSign;
      car.position.z -= rightZ * pivotShift * steerSign;
    }

    // 9. Apply rotation
    car.rotation += rotDelta;

    // 10. Derive lateralVelocity (backward compat with TireMarkSystem, TireSmokeSystem)
    const slipAfter = this.normalizeAngle(car.velocityAngle - car.rotation);
    car.lateralVelocity = Math.sin(slipAfter) * Math.abs(car.speed);

    // 11. Skid flag — also trigger during hard braking
    const hardBraking =
      !handbrake &&
      car.isBraking &&
      Math.abs(car.speed) > car.definition.maxSpeed * DRIFT_PHYSICS.hardBrakingThreshold;
    car.isSkidding =
      Math.abs(slip) > DRIFT_PHYSICS.skidSlipThreshold ||
      (handbrake && Math.abs(car.speed) > 3) ||
      hardBraking ||
      car.burnoutTimer > 0;

    // 12. Position update (velocity vector, not heading)
    car.position.x += Math.sin(car.velocityAngle) * car.speed * dt;
    car.position.z += Math.cos(car.velocityAngle) * car.speed * dt;
    car.position.y = 0.01;

    // 13. Hazard factor recovery
    car.hazardSteerFactor = Math.min(1.0, car.hazardSteerFactor + dt * 2.5);

    // 14. Mesh sync
    car.mesh.position.copy(car.position);
    car.mesh.rotation.y = car.rotation;
  }

  bounceFromBoundary(
    car: CarState,
    trackCenter: THREE.Vector3,
    dt: number,
  ): void {
    const toCenter = new THREE.Vector3().subVectors(trackCenter, car.position);
    const dist = toCenter.length();
    if (dist < 0.001) return;

    const toCenterDir = toCenter.normalize();

    // Spring push back toward track
    car.position.add(toCenterDir.clone().multiplyScalar(80 * dt));

    // Compute impact component from actual velocity direction (not heading)
    const velDir = new THREE.Vector3(Math.sin(car.velocityAngle), 0, Math.cos(car.velocityAngle));
    const impactComponent = Math.max(0, -velDir.dot(toCenterDir)); // positive = moving into wall

    // Speed-proportional slowdown: harder hit = more speed loss
    if (impactComponent > 0) {
      car.speed *= 1 - impactComponent * 0.5;
    }

    // Lateral redirect impulse — bounce car sideways along the wall
    const right = new THREE.Vector3(
      Math.cos(car.rotation),
      0,
      -Math.sin(car.rotation),
    );
    const wallTangentSign = Math.sign(right.dot(toCenterDir));
    car.lateralVelocity +=
      impactComponent * 0.5 * wallTangentSign * Math.abs(car.speed);

    // Absorb lateral velocity on wall contact
    car.lateralVelocity *= 0.4;

    // Reflect velocity angle toward wall normal so redirect persists next frame
    const wallNormalAngle = Math.atan2(toCenterDir.x, toCenterDir.z);
    const vaDiff = this.normalizeAngle(wallNormalAngle - car.velocityAngle);
    car.velocityAngle += vaDiff * 0.5 * impactComponent;
  }
}
