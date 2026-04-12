import * as THREE from "three";
import type { CarState, HazardEffect } from "../../types/game.js";
import { PHYSICS, DRIFT_PHYSICS } from "../../constants/physics.js";

export class CarPhysics {
  private lastSteerSign = 0;
  private driftResidual = 0;
  private wasHandbraking = false;

  private readonly _driftOv: Partial<Record<keyof typeof DRIFT_PHYSICS, number>> = {};
  private readonly _physOv: Partial<Record<keyof typeof PHYSICS, number>> = {};

  readonly debugState = {
    slipAngle: 0,
    driftResidual: 0,
    gripFactor: 0,
    throttleBlend: 0,
    speedRatio: 0,
    currentThrottle: 0,
  };

  private _dp<K extends keyof typeof DRIFT_PHYSICS>(k: K): number {
    return (this._driftOv[k] ?? DRIFT_PHYSICS[k]) as number;
  }
  private _ph<K extends keyof typeof PHYSICS>(k: K): number {
    return (this._physOv[k] ?? PHYSICS[k]) as number;
  }

  setOverride(group: 'physics' | 'drift', key: string, value: number): void {
    const target = group === 'drift' ? this._driftOv : this._physOv;
    (target as Record<string, number>)[key] = value;
  }
  resetOverrides(): void {
    for (const k in this._driftOv) delete (this._driftOv as Record<string, number>)[k];
    for (const k in this._physOv) delete (this._physOv as Record<string, number>)[k];
  }

  private normalizeAngle(a: number): number {
    return (((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  }

  applyAcceleration(car: CarState, throttle: number, dt: number, handbrake = false): void {
    const def = car.definition;
    const tau =
      throttle > 0
        ? this._dp('throttleInertiaTime')
        : this._dp('brakeInertiaTime');
    const blend = 1 - Math.exp(-dt / tau);

    this.debugState.throttleBlend = blend;
    this.debugState.currentThrottle = throttle;

    let tractionFactor = 1.0;
    if (throttle > 0) {
      const slip = this.normalizeAngle(car.velocityAngle - car.rotation);
      const slipFraction = Math.min(1, Math.abs(slip) / (Math.PI / 2));
      tractionFactor = 1 - slipFraction * (1 - this._dp('tractionLossMin'));
    }

    // Burnout traction
    if (throttle > 0 && car.burnoutTimer > 0) {
      tractionFactor *= this._dp('burnoutTractionFactor');
    }

    const hbAccelMult = (handbrake && throttle > 0) ? this._dp('handbrakeAccelMultiplier') : 1.0;
    const force =
      throttle > 0 ? def.acceleration * throttle : def.braking * throttle;
    car.speed += force * blend * tractionFactor * hbAccelMult;
    car.speed = Math.max(
      -def.maxSpeed * this._dp('maxReverseSpeedFraction'),
      Math.min(car.speed, def.maxSpeed),
    );

    // Burnout trigger: HB released while driftResidual high and throttle applied
    const handbrakeJustReleased = this.wasHandbraking && !handbrake;
    if (handbrakeJustReleased && throttle > 0 && this.driftResidual > 0.4 && car.burnoutTimer <= 0) {
      car.burnoutTimer = this._dp('burnoutDuration');
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
        def.handling * (1.0 - speedRatio * this._ph('speedSteeringFactor'));
      car.steeringAngle +=
        steerInput * this._ph('steeringSpeed') * steerEffect * dt;
      car.steeringAngle = Math.max(
        -this._ph('maxSteeringAngle'),
        Math.min(this._ph('maxSteeringAngle'), car.steeringAngle),
      );
    } else {
      // Return steering to center
      const returnAmount = this._ph('steeringReturnSpeed') * dt;
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
    let drag: number;
    if (handbrake && throttle <= 0) {
      const speedRatio = Math.abs(car.speed) / car.definition.maxSpeed;
      const lowSpeedBlend = Math.max(0, 1 - speedRatio / 0.5); // 0 at ≥50%, 1 at 0%
      drag = this._dp('handbrakeDragNoThrottle') + (this._dp('handbrakeLowSpeedDrag') - this._dp('handbrakeDragNoThrottle')) * lowSpeedBlend;
    } else {
      drag = handbrake ? this._dp('handbrakeDrag') : this._ph('drag');
    }
    car.speed *= drag;

    // 2. Slip angle
    const slip = this.normalizeAngle(car.velocityAngle - car.rotation);
    this.debugState.slipAngle = slip;

    // 3. Drift residual — builds up while actively drifting, decays on release
    if (handbrake && Math.abs(slip) > this._dp('skidSlipThreshold')) {
      this.driftResidual = Math.min(1.0, this.driftResidual + dt * 4);
    } else {
      this.driftResidual = Math.max(0, this.driftResidual - dt * 1.2);
    }
    this.debugState.driftResidual = this.driftResidual;

    // 4. Grip factor
    const speedRatio = Math.abs(car.speed) / car.definition.maxSpeed;
    this.debugState.speedRatio = speedRatio;
    const baseGrip =
      this._dp('gripHigh') +
      (this._dp('gripLow') - this._dp('gripHigh')) * speedRatio;
    const hbMult = handbrake
      ? this._dp('handbrakeGripMultiplier')
      : Math.max(
          this._dp('handbrakeGripMultiplier') * 4,
          1.0 - this.driftResidual * (1 - this._dp('handbrakeGripMultiplier') * 4)
        );
    const isCounterSteer =
      this.lastSteerSign !== 0 &&
      Math.sign(this.lastSteerSign) !== Math.sign(slip);
    const csMult = isCounterSteer
      ? this._dp('counterSteerBonus') * car.definition.handling
      : 1.0;

    // High-speed turn slip: reduce grip and add slight spinout rotation
    let highSpeedSlipExtra = 0;
    if (speedRatio > this._dp('highSpeedRatioThreshold') && Math.abs(car.steeringAngle) > this._dp('highSpeedSteerThreshold')) {
      highSpeedSlipExtra =
        ((speedRatio - this._dp('highSpeedRatioThreshold')) / (1 - this._dp('highSpeedRatioThreshold'))) *
        (Math.abs(car.steeringAngle) / this._ph('maxSteeringAngle')) *
        0.4;
    }
    const gripFactor = 1 - highSpeedSlipExtra * 0.5;
    this.debugState.gripFactor = gripFactor;
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
    car.speed *= 1 - Math.abs(slip) * this._dp('corneringDragFactor') * dt;

    // 7. Rotation from steering
    const rawSpeedRatio = Math.abs(car.speed) / car.definition.maxSpeed;
    const isMoving = Math.abs(car.speed) > 0.5;
    const speedFactor = isMoving
      ? Math.max(this._dp('minLowSpeedFactor'), rawSpeedRatio)
      : rawSpeedRatio;
    const signedSpeedFactor = Math.sign(car.speed) * speedFactor;
    let rotRate = car.steeringAngle * dt * signedSpeedFactor;
    // High-speed turn: add slight spinout rotation
    if (highSpeedSlipExtra > 0) {
      rotRate += Math.sign(car.steeringAngle) * highSpeedSlipExtra * this._dp('spinoutRotationFactor');
    }
    const rotDelta =
      handbrake && Math.abs(slip) > this._dp('skidSlipThreshold')
        ? rotRate * this._dp('handbrakeRotationMultiplier')
        : rotRate;

    // 8. Handbrake pivot correction (simulates front-axle rotation center)
    if (handbrake && Math.abs(rotDelta) > 0.001) {
      const pivotShift = this._dp('frontAxleOffset') * Math.sin(rotDelta);
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
      Math.abs(car.speed) > car.definition.maxSpeed * this._dp('hardBrakingThreshold');
    car.isSkidding =
      Math.abs(slip) > this._dp('skidSlipThreshold') ||
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

    // Spring push back toward track (stronger to compensate for removed hard snap)
    car.position.add(toCenterDir.clone().multiplyScalar(150 * dt));

    // Compute impact component from actual velocity direction (not heading)
    const velDir = new THREE.Vector3(Math.sin(car.velocityAngle), 0, Math.cos(car.velocityAngle));
    const impactComponent = Math.max(0, -velDir.dot(toCenterDir)); // positive = moving into wall

    // Speed-proportional slowdown: harder hit = more speed loss
    if (impactComponent > 0) {
      car.speed *= 1 - impactComponent * 0.5;
    }

    // Full velocity reflection off the wall surface
    const wallNormalAngle = Math.atan2(toCenterDir.x, toCenterDir.z);
    const reflectedAngle = 2 * wallNormalAngle + Math.PI - car.velocityAngle;
    const vaDiff = this.normalizeAngle(reflectedAngle - car.velocityAngle);
    car.velocityAngle += vaDiff;

    // Align visual heading toward wall tangent for shallow hits (≤45°)
    if (impactComponent <= 0.707) {
      const wallTangent1 = wallNormalAngle + Math.PI / 2;
      const wallTangent2 = wallNormalAngle - Math.PI / 2;
      const diff1 = Math.abs(this.normalizeAngle(wallTangent1 - car.rotation));
      const diff2 = Math.abs(this.normalizeAngle(wallTangent2 - car.rotation));
      const targetTangent = diff1 <= diff2 ? wallTangent1 : wallTangent2;
      const rDiff = this.normalizeAngle(targetTangent - car.rotation);
      car.rotation += rDiff * 0.35;
    }

    // Absorb lateral velocity on wall contact
    car.lateralVelocity *= 0.4;
  }
}
