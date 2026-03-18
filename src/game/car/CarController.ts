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
    // Throttle
    let throttle = 0;
    if (input.forward) throttle = 1;
    else if (input.backward) throttle = -1;

    // Steering
    let steer = 0;
    if (input.left) steer = 1;
    else if (input.right) steer = -1;

    this.physics.applyAcceleration(car, throttle, dt);
    this.physics.applySteering(car, steer, dt);
    this.physics.updatePosition(car, dt, input.handbrake);

    // Post-drift boost on handbrake release
    if (this.wasHandbraking && !input.handbrake) {
      if (Math.abs(car.lateralVelocity) > 5) {
        car.speed = Math.min(car.speed + 4, car.definition.maxSpeed);
      }
    }
    this.wasHandbraking = input.handbrake;

    // Track braking state
    car.isBraking = throttle < -0.1 && car.speed > car.definition.maxSpeed * 0.3;
  }
}
