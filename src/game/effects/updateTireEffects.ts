import type { CarState } from '../../types/game.js';
import type { TireMarkSystem } from '../scene/TireMarkSystem.js';
import type { TireSmokeSystem } from './TireSmokeSystem.js';

export function updateTireEffects(
  cars: CarState[],
  dt: number,
  tireMarks: TireMarkSystem | null | undefined,
  tireSmoke: TireSmokeSystem | null | undefined,
): void {
  for (const car of cars) {
    if (car.isSkidding || car.isBraking) tireMarks?.addMarks(car);
    if (car.isSkidding) tireSmoke?.emitForCar(car, dt);
    if (car.accelBoostTimer > 0) tireMarks?.addFireMarks(car);
  }
  tireMarks?.update(dt);
  tireSmoke?.update(dt);
}
