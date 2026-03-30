import type { CarState } from '../../types/game.js';
import type { InputState } from '../InputManager.js';
import type { CarPhysics } from './CarPhysics.js';
import { CONTROLLER_PHYSICS } from '../../constants/physics.js';

export class CarController {
  private physics: CarPhysics;
  private wasHandbraking = false;
  private readonly _ctrlOv: Partial<Record<keyof typeof CONTROLLER_PHYSICS, number>> = {};

  constructor(physics: CarPhysics) {
    this.physics = physics;
  }

  private _cp<K extends keyof typeof CONTROLLER_PHYSICS>(k: K): number {
    return (this._ctrlOv[k] ?? CONTROLLER_PHYSICS[k]) as number;
  }

  setOverride(key: string, value: number): void {
    (this._ctrlOv as Record<string, number>)[key] = value;
  }
  resetOverrides(): void {
    for (const k in this._ctrlOv) delete (this._ctrlOv as Record<string, number>)[k];
  }

  update(car: CarState, input: InputState, dt: number): void {
    // Throttle — prevent instant direction reversal
    const goingForward = car.speed > this._cp('directionReversalBrakeThreshold');
    const goingBackward = car.speed < -this._cp('directionReversalBrakeThreshold');
    let throttle = 0;
    if (input.forward) {
      throttle = goingBackward ? this._cp('directionReversalBrakeForce') : 1;
    } else if (input.backward) {
      throttle = goingForward ? -this._cp('directionReversalBrakeForce') : -1;
    }

    // Handbrake: override throttle — brake to cap if above it, coast to stop if no input
    if (input.handbrake) {
      const speedCap = car.definition.maxSpeed * this._cp('handbrakeSpeedCap');
      if (input.forward || input.backward) {
        const targetDir = input.forward ? 1 : -1;
        if (car.speed * targetDir > speedCap) {
          throttle = targetDir * this._cp('handbrakeBrakeThrottle');
        } else {
          throttle = targetDir; // let handbrakeAccelMultiplier in applyAcceleration limit the force
        }
      } else {
        throttle = 0; // no input — coast to stop via drag
      }
    }

    // Steering
    let steer = 0;
    if (input.left) steer = 1;
    else if (input.right) steer = -1;

    this.physics.applyAcceleration(car, throttle, dt, input.handbrake);
    this.physics.applySteering(car, steer, dt);
    this.physics.updatePosition(car, dt, input.handbrake, throttle);

    // Post-physics: prevent backward drift while accelerating forward
    if (input.forward && !input.handbrake && car.speed > 0) {
      const slip = (((car.velocityAngle - car.rotation) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      if (Math.abs(slip) > Math.PI / 2) {
        const correction = Math.sign(slip) * Math.min(Math.abs(slip) - Math.PI / 2, dt * 10);
        car.velocityAngle -= correction;
      }
    }

    // Post-drift boost on handbrake release
    if (this.wasHandbraking && !input.handbrake) {
      if (Math.abs(car.lateralVelocity) > 5) {
        car.speed = Math.min(
          car.speed + car.definition.maxSpeed * this._cp('postDriftBoostFraction'),
          car.definition.maxSpeed
        );
      }
    }
    this.wasHandbraking = input.handbrake;

    // Track braking state
    car.isBraking = throttle < -0.1 && car.speed > car.definition.maxSpeed * 0.3;
  }
}
