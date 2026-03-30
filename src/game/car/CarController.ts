import type { CarState } from '../../types/game.js';
import type { InputState } from '../InputManager.js';
import type { CarPhysics } from './CarPhysics.js';
import { CONTROLLER_PHYSICS } from '../../constants/physics.js';

export class CarController {
  private physics: CarPhysics;
  private wasHandbraking = false;

  constructor(physics: CarPhysics) {
    this.physics = physics;
  }

  update(car: CarState, input: InputState, dt: number): void {
    // Throttle — prevent instant direction reversal
    const goingForward = car.speed > CONTROLLER_PHYSICS.directionReversalBrakeThreshold;
    const goingBackward = car.speed < -CONTROLLER_PHYSICS.directionReversalBrakeThreshold;
    let throttle = 0;
    if (input.forward) {
      throttle = goingBackward ? CONTROLLER_PHYSICS.directionReversalBrakeForce : 1;
    } else if (input.backward) {
      throttle = goingForward ? -CONTROLLER_PHYSICS.directionReversalBrakeForce : -1;
    }

    // Handbrake: override throttle — brake to cap if above it, coast to stop if no input
    if (input.handbrake) {
      const speedCap = car.definition.maxSpeed * CONTROLLER_PHYSICS.handbrakeSpeedCap;
      if (input.forward || input.backward) {
        const targetDir = input.forward ? 1 : -1;
        if (car.speed * targetDir > speedCap) {
          throttle = targetDir * CONTROLLER_PHYSICS.handbrakeBrakeThrottle;
        } else {
          throttle = 0; // at/below cap — hold via floor enforced below
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

    // Enforce speed floor when handbrake + directional input (prevents drag pulling below cap)
    if (input.handbrake && (input.forward || input.backward)) {
      const speedFloor = car.definition.maxSpeed * CONTROLLER_PHYSICS.handbrakeSpeedCap;
      const targetDir = input.forward ? 1 : -1;
      if (car.speed * targetDir > 0.5 && car.speed * targetDir < speedFloor) {
        car.speed = targetDir * speedFloor;
      }
    }

    // Post-drift boost on handbrake release
    if (this.wasHandbraking && !input.handbrake) {
      if (Math.abs(car.lateralVelocity) > 5) {
        car.speed = Math.min(
          car.speed + car.definition.maxSpeed * CONTROLLER_PHYSICS.postDriftBoostFraction,
          car.definition.maxSpeed
        );
      }
    }
    this.wasHandbraking = input.handbrake;

    // Track braking state
    car.isBraking = throttle < -0.1 && car.speed > car.definition.maxSpeed * 0.3;
  }
}
