import * as THREE from 'three';
import type { CarState } from '../../types/game.js';
import type { TrackDefinition } from '../track/TrackDefinition.js';

function tDiff(leader: number, follower: number): number {
  let d = leader - follower;
  if (d < -0.5) d += 1;
  if (d > 0.5) d -= 1;
  return d; // positive = leader is ahead
}

export class VersusRaceManager {
  private track: TrackDefinition;
  readonly pointsToWin = 3;
  private wrongWayTimers = new Map<string, number>();

  constructor(track: TrackDefinition) {
    this.track = track;
  }

  updateT(car: CarState): void {
    car.previousT = car.currentT;
    car.currentT = this.track.getClosestT(car.position, car.currentT);
  }

  isWrongWay(carId: string): boolean {
    return (this.wrongWayTimers.get(carId) ?? 0) > 2.0;
  }

  updateWrongWay(car: CarState, dt: number): void {
    const tDelta = car.currentT - car.previousT;
    const isForwardWrap = tDelta < -0.5;
    const isBackwardWrap = tDelta > 0.5;
    const isGoingBack = (tDelta < -0.001 && !isForwardWrap) || isBackwardWrap;
    const prev = this.wrongWayTimers.get(car.id) ?? 0;
    this.wrongWayTimers.set(car.id, isGoingBack ? prev + dt : 0);
  }

  // Returns 1 if car1 is the back car, 2 if car2 is the back car
  getBackCar(car1: CarState, car2: CarState): 1 | 2 {
    // tDiff(car2.currentT, car1.currentT) > 0 means car2 is ahead of car1 → car1 is behind
    return tDiff(car2.currentT, car1.currentT) > 0 ? 1 : 2;
  }

  getRoundResetPositions(
    car1: CarState,
    car2: CarState,
  ): [{ pos: THREE.Vector3; rot: number }, { pos: THREE.Vector3; rot: number }] {
    const t1 = car1.currentT;
    const t2 = car2.currentT;

    // Wrap-safe midpoint
    let mid: number;
    if (Math.abs(t1 - t2) > 0.5) {
      mid = ((t1 + t2 + 1) / 2) % 1;
    } else {
      mid = (t1 + t2) / 2;
    }

    const center = this.track.getPointAt(mid);
    const tangent = this.track.getTangentAt(mid).normalize();
    const normal = this.track.getNormalAt(mid);
    const rotation = Math.atan2(tangent.x, tangent.z);

    const offset = 10;
    const pos1 = center.clone().add(normal.clone().multiplyScalar(offset));
    const pos2 = center.clone().sub(normal.clone().multiplyScalar(offset));
    pos1.y = 0.01;
    pos2.y = 0.01;

    return [
      { pos: pos1, rot: rotation },
      { pos: pos2, rot: rotation },
    ];
  }
}
