import type { CarState, RaceResult } from '../../types/game.js';
import type { TrackDefinition } from '../track/TrackDefinition.js';

export class RaceManager {
  private track: TrackDefinition;
  private totalLaps: number;
  private raceStartTime = 0;
  private raceActive = false;
  private finishOrder: string[] = [];
  private wrongWayTimers = new Map<string, number>();

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

  isWrongWay(carId: string): boolean {
    return (this.wrongWayTimers.get(carId) ?? 0) > 2.0;
  }

  update(cars: CarState[], dt: number): void {
    if (!this.raceActive) return;

    const now = performance.now();
    const checkpoints = this.track.checkpoints;

    for (const car of cars) {
      // Always update T — AI navigation needs it even after finishing
      car.previousT = car.currentT;
      car.currentT = this.track.getClosestT(car.position, car.currentT);

      if (car.finished) continue;

      const tDelta = car.currentT - car.previousT;
      // A backward wrap occurs when T jumps from near 0 to near 1 (e.g. 0.02 → 0.98)
      const isForwardWrap = tDelta < -0.5;
      const isBackwardWrap = tDelta > 0.5;

      // Wrong way detection for player
      if (car.isPlayer) {
        // Going backward: small negative tDelta, OR backward wrap across T=0
        const isGoingBack = (tDelta < -0.001 && !isForwardWrap) || isBackwardWrap;
        const prev = this.wrongWayTimers.get(car.id) ?? 0;
        this.wrongWayTimers.set(car.id, isGoingBack ? prev + dt : 0);
      }

      // Only set waypoint flags when going forward (small positive tDelta or genuine forward wrap)
      const goingForward = (tDelta > 0.001 && !isBackwardWrap) || isForwardWrap;

      // Crossing start/finish backward invalidates all lap progress
      if (isBackwardWrap) {
        car.hasPassedQuarter = false;
        car.hasPassedHalfway = false;
        car.hasPassedThreeQuarter = false;
      }

      // Must have driven forward through the early section (T 5–25%) — the only way to satisfy
      // this is to start near the finish line and drive forward, not to return from mid-track.
      if (goingForward && car.currentT > 0.05 && car.currentT < 0.25) {
        car.hasPassedQuarter = true;
      }

      // Track halfway point so race-start crossing doesn't count as a lap — forward only
      if (goingForward && car.currentT > 0.5) {
        car.hasPassedHalfway = true;
      }

      // Track three-quarter point — additional guard
      if (goingForward && car.currentT > 0.75) {
        car.hasPassedThreeQuarter = true;
      }

      // Checkpoint detection — forward crossing only
      for (let ci = 0; ci < checkpoints.length; ci++) {
        const cpT = checkpoints[ci];
        const margin = 0.02;
        if (car.previousT > cpT - margin && car.previousT < cpT && car.currentT >= cpT && car.currentT < cpT + margin) {
          const segTime = now - car.lastCheckpointTime;
          car.lastCheckpointSegmentTime = segTime;
          car.lastCheckpointBestTime = car.checkpointBests[ci];
          if (car.checkpointBests[ci] === 0 || segTime < car.checkpointBests[ci]) {
            car.checkpointBests[ci] = segTime;
          }
          car.lastCheckpointTime = now;
          car.lastCheckpointCrossedAt = now;
        }
      }

      // Lap detection: crossed start/finish from high T to low T (forward direction only)
      const isForwardLap = isForwardWrap;
      if (
        car.previousT > 0.95 &&
        car.currentT < 0.05 &&
        car.hasPassedHalfway &&
        car.hasPassedQuarter &&
        car.hasPassedThreeQuarter &&
        isForwardLap
      ) {
        car.hasPassedHalfway = false;
        car.hasPassedQuarter = false;
        car.hasPassedThreeQuarter = false;
        car.completedLaps++;

        // Reset checkpoint tracking for new lap
        car.lastCheckpointTime = now;

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
