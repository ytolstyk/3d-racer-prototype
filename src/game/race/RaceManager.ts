import * as THREE from 'three';
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
    return (this.wrongWayTimers.get(carId) ?? 0) > 1.5;
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

      // Wrong way detection for player — dot product of car heading vs track tangent
      if (car.isPlayer) {
        const trackTangent = this.track.getTangentAt(car.currentT).normalize();
        const carForward = new THREE.Vector3(Math.sin(car.rotation), 0, Math.cos(car.rotation));
        const alignment = carForward.dot(trackTangent);
        const isWrongWay = alignment < 0;
        const prev = this.wrongWayTimers.get(car.id) ?? 0;
        this.wrongWayTimers.set(car.id, isWrongWay ? prev + dt : Math.max(0, prev - dt * 2));
      }

      // Only set waypoint flags when going forward (small positive tDelta or genuine forward wrap)
      const goingForward = (tDelta > 0.001 && !isBackwardWrap) || isForwardWrap;

      // Crossing start/finish backward invalidates all lap progress
      if (isBackwardWrap) {
        car.checkpointProgress.fill(false);
      }

      // Set checkpoint guard flags only when actively crossing each zone (prev < cp <= current)
      if (goingForward) {
        for (let i = 0; i < checkpoints.length; i++) {
          if (!car.checkpointProgress[i] && car.previousT < checkpoints[i] && car.currentT >= checkpoints[i]) {
            car.checkpointProgress[i] = true;
          }
        }
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
      const allCheckpointsPassed = car.checkpointProgress.every(Boolean);
      const finishTangent = this.track.getTangentAt(car.currentT).normalize();
      const carHeading = new THREE.Vector3(Math.sin(car.rotation), 0, Math.cos(car.rotation));
      const isCorrectDirection = carHeading.dot(finishTangent) > 0;
      if (
        isForwardWrap &&
        car.previousT > 0.95 &&
        car.currentT < 0.05 &&
        allCheckpointsPassed &&
        isCorrectDirection
      ) {
        car.checkpointProgress.fill(false);
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
