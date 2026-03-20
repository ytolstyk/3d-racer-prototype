import type { CarState, RaceResult } from '../../types/game.js';
import type { TrackDefinition } from '../track/TrackDefinition.js';

export class RaceManager {
  private track: TrackDefinition;
  private totalLaps: number;
  private raceStartTime = 0;
  private raceActive = false;
  private finishOrder: string[] = [];

  constructor(track: TrackDefinition, totalLaps: number) {
    this.track = track;
    this.totalLaps = totalLaps;
  }

  start(): void {
    this.raceStartTime = performance.now();
    this.raceActive = true;
    this.finishOrder = [];
  }

  getTotalLaps(): number {
    return this.totalLaps;
  }

  isActive(): boolean {
    return this.raceActive;
  }

  update(cars: CarState[]): void {
    if (!this.raceActive) return;

    const now = performance.now();

    for (const car of cars) {
      // Always update T — AI navigation needs it even after finishing
      car.previousT = car.currentT;
      car.currentT = this.track.getClosestT(car.position, car.currentT);

      if (car.finished) continue;

      // Track halfway point so race-start crossing doesn't count as a lap
      if (car.currentT > 0.5) {
        car.hasPassedHalfway = true;
      }

      // Lap detection: crossed start/finish from high T to low T
      if (car.previousT > 0.95 && car.currentT < 0.05 && car.hasPassedHalfway) {
        car.hasPassedHalfway = false;
        car.completedLaps++;

        // Record lap time
        const lapTime = now - car.currentLapStart;
        if (car.bestLapTime === 0 || lapTime < car.bestLapTime) {
          car.bestLapTime = lapTime;
        }
        car.currentLapStart = now;

        // Check if finished
        if (car.completedLaps >= this.totalLaps) {
          car.finished = true;
          car.finishTime = now - this.raceStartTime;
          car.totalTime = car.finishTime;
          this.finishOrder.push(car.id);
        }
      }
    }

    // Check if all cars finished
    if (cars.every((c) => c.finished)) {
      this.raceActive = false;
    }
  }

  getPositions(cars: CarState[]): CarState[] {
    return [...cars].sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.completedLaps !== b.completedLaps) return b.completedLaps - a.completedLaps;
      return b.currentT - a.currentT;
    });
  }

  getResults(cars: CarState[]): RaceResult[] {
    const sorted = this.getPositions(cars);
    return sorted.map((car, index) => ({
      position: index + 1,
      carId: car.id,
      name: car.definition.name,
      color: car.definition.color,
      totalTime: car.finished ? car.totalTime : performance.now() - this.raceStartTime,
      bestLap: car.bestLapTime,
      isPlayer: car.isPlayer,
    }));
  }

  getElapsedTime(): number {
    if (!this.raceActive && this.raceStartTime === 0) return 0;
    return performance.now() - this.raceStartTime;
  }

  getRaceStartTime(): number {
    return this.raceStartTime;
  }
}
