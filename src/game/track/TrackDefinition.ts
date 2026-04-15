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

  constructor(config?: TrackConfig, reverse = false) {
    const cfg = config ?? TRACKS[0];
    this.width = cfg.width;
    this.hazardZones = cfg.hazards;
    this.name = cfg.name;

    let controlPoints = cfg.controlPoints;
    let checkpoints = cfg.checkpoints ?? [0.25, 0.5, 0.75];

    if (reverse) {
      controlPoints = [...controlPoints].reverse();
      checkpoints = checkpoints.map(t => 1 - t).reverse();
    }

    this.checkpoints = checkpoints;

    const points = controlPoints.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z)
    );
    this.curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
    this.computeBoundaries();
  }

  private computeBoundaries(): void {
    const up = new THREE.Vector3(0, 1, 0);

    // Build base uniform t-values
    const tValues: number[] = [];
    for (let i = 0; i <= TRACK_SAMPLES; i++) {
      tValues.push(i / TRACK_SAMPLES);
    }

    // Insert extra t-values in high-curvature segments so sharp corners get
    // more boundary points and produce tighter, spike-free quads.
    const extra: number[] = [];
    for (let i = 0; i < TRACK_SAMPLES; i++) {
      const t0 = i / TRACK_SAMPLES;
      const t1 = (i + 1) / TRACK_SAMPLES;
      const dot = this.curve.getTangentAt(t0).normalize().dot(
        this.curve.getTangentAt(t1).normalize()
      );
      if (dot < 0.99) {
        const n = dot < 0.90 ? 16 : dot < 0.95 ? 8 : 4;
        for (let j = 1; j < n; j++) extra.push(t0 + (t1 - t0) * j / n);
      }
    }

    const allTs = [...tValues, ...extra].sort((a, b) => a - b);

    for (let i = 0; i < allTs.length; i++) {
      const t = allTs[i];
      if (i > 0 && t - allTs[i - 1] < 1e-7) continue;
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

    // Laplacian smoothing on left/right edge positions near high-curvature regions.
    // Uses a snapshot of positions each pass so order of iteration doesn't matter.
    const pts = this.boundaryPoints;
    const count = pts.length - 1; // closed loop: pts[0] and pts[count] are the same position
    for (let pass = 0; pass < 4; pass++) {
      const snapL = pts.map(p => p.left.clone());
      const snapR = pts.map(p => p.right.clone());
      for (let i = 0; i < count; i++) {
        const ip = (i - 1 + count) % count;
        const inext = (i + 1) % count;
        const dot = pts[i].tangent.dot(pts[inext].tangent);
        if (dot < 0.99) {
          const w = Math.min(0.45, (1 - dot) * 3);
          pts[i].left.lerp(snapL[ip].clone().add(snapL[inext]).multiplyScalar(0.5), w);
          pts[i].right.lerp(snapR[ip].clone().add(snapR[inext]).multiplyScalar(0.5), w);
        }
      }
    }

    this.fixBorderSelfIntersections();
  }

  private segmentIntersect2D(
    ax: number, az: number, bx: number, bz: number,
    cx: number, cz: number, dx: number, dz: number,
  ): { x: number; z: number } | null {
    const dABx = bx - ax, dABz = bz - az;
    const dCDx = dx - cx, dCDz = dz - cz;
    const denom = dABx * dCDz - dABz * dCDx;
    if (Math.abs(denom) < 1e-10) return null; // parallel
    const t = ((cx - ax) * dCDz - (cz - az) * dCDx) / denom;
    const s = ((cx - ax) * dABz - (cz - az) * dABx) / denom;
    if (t > 0 && t < 1 && s > 0 && s < 1) {
      return { x: ax + t * dABx, z: az + t * dABz };
    }
    return null;
  }

  private fixBorderSelfIntersections(): void {
    const pts = this.boundaryPoints;
    const n = pts.length - 1; // closed: pts[0] === pts[n]
    const WINDOW = 80;

    for (const side of ['left', 'right'] as const) {
      for (let i = 0; i < n; i++) {
        const a1 = pts[i][side];
        const a2 = pts[(i + 1) % n][side];
        for (let jOff = 2; jOff < WINDOW; jOff++) {
          const j = (i + jOff) % n;
          const jNext = (i + jOff + 1) % n;
          const b1 = pts[j][side];
          const b2 = pts[jNext][side];
          if (a1.distanceTo(b1) > this.width * 3) continue;
          const hit = this.segmentIntersect2D(
            a1.x, a1.z, a2.x, a2.z,
            b1.x, b1.z, b2.x, b2.z,
          );
          if (hit) {
            // Collapse all loop points [i+1 .. j] to the intersection tip
            for (let k = 1; k <= jOff; k++) {
              pts[(i + k) % n][side].set(hit.x, pts[(i + k) % n][side].y, hit.z);
            }
            i += jOff; // skip past the corrected region
            break;
          }
        }
      }
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
