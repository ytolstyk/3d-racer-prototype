import type { CarState } from '../../types/game.js';
import type { InputState } from '../InputManager.js';
import type { CarPhysics } from './CarPhysics.js';

export class CarController {
  private physics: CarPhysics;
  private wasHandbraking = false;

  constructor(physics: CarPhysics) {
    this.physics = physics;
  }

  update(car: CarState, input: InputState, dt: number): void {
    // Throttle — prevent instant direction reversal
    const goingForward = car.speed > 2.0;
    const goingBackward = car.speed < -2.0;
    let throttle = 0;
    if (input.forward) {
      throttle = goingBackward ? 0.4 : 1;   // if moving backward, brake gently
    } else if (input.backward) {
      throttle = goingForward ? -0.4 : -1;  // if moving forward, brake gently
    }

    // Handbrake: override throttle — brake to 25% cap if above it, coast to stop if no input
    if (input.handbrake) {
      const speedCap = car.definition.maxSpeed * 0.25;
      if (input.forward || input.backward) {
        const targetDir = input.forward ? 1 : -1;
        if (car.speed * targetDir > speedCap) {
          throttle = targetDir * -0.6; // actively brake toward 25%
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

    this.physics.applyAcceleration(car, throttle, dt);
    this.physics.applySteering(car, steer, dt);
    this.physics.updatePosition(car, dt, input.handbrake);

    // Enforce 25% speed floor when handbrake + directional input (prevents drag pulling below cap)
    if (input.handbrake && (input.forward || input.backward)) {
      const speedFloor = car.definition.maxSpeed * 0.25;
      const targetDir = input.forward ? 1 : -1;
      if (car.speed * targetDir > 0.5 && car.speed * targetDir < speedFloor) {
        car.speed = targetDir * speedFloor;
      }
    }

    // Post-drift boost on handbrake release
    if (this.wasHandbraking && !input.handbrake) {
      if (Math.abs(car.lateralVelocity) > 5) {
        car.speed = Math.min(car.speed + car.definition.maxSpeed * 0.04, car.definition.maxSpeed);
      }
    }
    this.wasHandbraking = input.handbrake;

    // Track braking state
    car.isBraking = throttle < -0.1 && car.speed > car.definition.maxSpeed * 0.3;
  }
}
