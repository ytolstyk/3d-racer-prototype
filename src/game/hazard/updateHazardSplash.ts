import type { Vector3 } from 'three';
import type { CarState } from '../../types/game.js';
import type { CarHazardState } from './types.js';
import type { HazardSplashSystem } from '../effects/HazardSplashSystem.js';
import type { TireMarkSystem } from '../scene/TireMarkSystem.js';
import type { AudioManager } from '../audio/AudioManager.js';

export function emitHazardSplash(
  car: CarState,
  hs: CarHazardState,
  wasInHazard: boolean,
  color: number,
  leftPos: Vector3,
  rightPos: Vector3,
  dt: number,
  hazardSplash: HazardSplashSystem | null | undefined,
  audioManager: AudioManager | null | undefined,
  tireMarks: TireMarkSystem | null | undefined,
): void {
  if (!wasInHazard) {
    hs.drip = 0;
    hs.splashTimer = 0;
    if (Math.abs(car.speed) >= car.definition.maxSpeed * 0.1) {
      hazardSplash?.emit(leftPos, color, car.speed, car.definition.maxSpeed, 28, car.rotation);
      hazardSplash?.emit(rightPos, color, car.speed, car.definition.maxSpeed, 27, car.rotation);
      audioManager?.onLiquidSlosh(hs.zoneType, car.id);
    }
  } else if (Math.abs(car.speed) >= car.definition.maxSpeed * 0.1) {
    hs.splashTimer -= dt;
    if (hs.splashTimer <= 0) {
      hs.splashTimer = 0.06;
      hazardSplash?.emit(leftPos, color, car.speed, car.definition.maxSpeed, 4, car.rotation);
      hazardSplash?.emit(rightPos, color, car.speed, car.definition.maxSpeed, 4, car.rotation);
    }
  }
  tireMarks?.addSubstanceMarks(car, hs.zoneType);
}
