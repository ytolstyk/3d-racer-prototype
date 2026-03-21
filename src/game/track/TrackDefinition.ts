import * as THREE from 'three';
import { TRACKS, TRACK_SAMPLES } from '../../constants/track.js';
import type { TrackConfig } from '../../constants/track.js';
import type { HazardZone } from '../../types/game.js';

export interface BoundaryPoint {
  left: THREE.Vector3;
  right: THREE.Vector3;
  center: THREE.Vector3;
  tangent: THREE.Vector3;
  t: number;
}

export class TrackDefinition {
  readonly curve: THREE.CatmullRomCurve3;
  readonly width: number;
  readonly hazardZones: HazardZone[];
  readonly checkpoints: number[];
  readonly name: string;
  private boundaryPoints: BoundaryPoint[] = [];

  constructor(config?: TrackConfig) {
    const cfg = config ?? TRACKS[0];
    this.width = cfg.width;
    this.hazardZones = cfg.hazards;
    this.checkpoints = cfg.checkpoints ?? [0.25, 0.5, 0.75];
    this.name = cfg.name;

    const points = cfg.controlPoints.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z)
    );
    this.curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.3);
    this.computeBoundaries();
  }

  private computeBoundaries(): void {
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= TRACK_SAMPLES; i++) {
      const t = i / TRACK_SAMPLES;
      const center = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      this.boundaryPoints.push({
        left: center.clone().add(normal.clone().multiplyScalar(this.width / 2)),
        right: center.clone().sub(normal.clone().multiplyScalar(this.width / 2)),
        center: center.clone(),
        tangent: tangent.clone(),
        t,
      });
    }
  }

  getBoundaryPoints(): BoundaryPoint[] {
    return this.boundaryPoints;
  }

  getPointAt(t: number): THREE.Vector3 {
    return this.curve.getPointAt(t);
  }

  getTangentAt(t: number): THREE.Vector3 {
    return this.curve.getTangentAt(t);
  }

  // Find closest t parameter for a world position
  // hint: previous currentT — enables windowed search to avoid cross-track snapping
  getClosestT(position: THREE.Vector3, hint?: number): number {
    if (hint !== undefined) {
      const window = 0.15;
      const windowSteps = Math.ceil(window * 2 * TRACK_SAMPLES);
      let closestT = hint, closestDist = Infinity;
      for (let s = 0; s <= windowSteps; s++) {
        let t = (hint - window) + (s / windowSteps) * window * 2;
        t = ((t % 1) + 1) % 1;
        const dist = position.distanceToSquared(this.curve.getPointAt(t));
        if (dist < closestDist) { closestDist = dist; closestT = t; }
      }
      if (Math.sqrt(closestDist) <= this.width * 2) return closestT;
    }
    // Global fallback (first frame or out of window)
    let closestT = 0;
    let closestDist = Infinity;
    for (let i = 0; i <= TRACK_SAMPLES; i++) {
      const t = i / TRACK_SAMPLES;
      const point = this.curve.getPointAt(t);
      const dist = position.distanceToSquared(point);
      if (dist < closestDist) {
        closestDist = dist;
        closestT = t;
      }
    }
    return closestT;
  }

  // Check if position is within track boundaries
  isOnTrack(position: THREE.Vector3, hint?: number): boolean {
    const t = this.getClosestT(position, hint);
    const center = this.curve.getPointAt(t);
    const dist = position.distanceTo(center);
    return dist <= this.width / 2 + 1; // small tolerance
  }

  // Get normal (perpendicular to track) at a given t
  getNormalAt(t: number): THREE.Vector3 {
    const tangent = this.curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3().crossVectors(tangent, up).normalize();
  }

  getLength(): number {
    return this.curve.getLength();
  }
}
