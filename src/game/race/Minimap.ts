import type { TrackDefinition } from '../track/TrackDefinition.js';
import type { CarState, MinimapCar, MinimapPoint, MinimapStartFinish } from '../../types/game.js';

export class Minimap {
  private track: TrackDefinition;
  private trackPoints: MinimapPoint[] = [];
  private startFinish: MinimapStartFinish;

  constructor(track: TrackDefinition) {
    this.track = track;
    this.computeTrackPoints();
    const startPoint = track.getPointAt(0);
    const tangent = track.getTangentAt(0);
    this.startFinish = {
      x: startPoint.x,
      z: startPoint.z,
      tx: tangent.x,
      tz: tangent.z,
    };
  }

  private computeTrackPoints(): void {
    const samples = 200;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const point = this.track.getPointAt(t);
      this.trackPoints.push({ x: point.x, z: point.z });
    }
  }

  getTrackPoints(): MinimapPoint[] {
    return this.trackPoints;
  }

  getStartFinish(): MinimapStartFinish {
    return this.startFinish;
  }

  getCarPositions(cars: CarState[]): MinimapCar[] {
    return cars.map((car) => ({
      x: car.position.x,
      z: car.position.z,
      color: car.definition.color,
      isPlayer: car.isPlayer,
    }));
  }
}
