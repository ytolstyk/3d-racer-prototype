import * as THREE from 'three';
import { TRACKS, TRACK_SAMPLES } from '../../constants/track.js';
import type { TrackConfig } from '../../constants/track.js';
import type { HazardZone } from '../../types/game.js';

/**
 * Cubic Hermite spline through closed control points.
 * When pointRotations are provided, the tangent at that index is overridden
 * with the specified canvas-space angle (converted to game-space direction).
 * Otherwise the tangent is computed via the standard Catmull-Rom formula.
 */
class HermiteTrackCurve extends THREE.Curve<THREE.Vector3> {
  private pts: THREE.Vector3[];
  private tangents: THREE.Vector3[];
  private n: number;

  constructor(controlPoints: THREE.Vector3[], rotationOverrides: number[]) {
    super();
    this.pts = controlPoints;
    this.n = controlPoints.length;
    const n = this.n;

    // Compute uniform Catmull-Rom tangents: m[i] = (p[i+1] - p[i-1]) / 2
    this.tangents = [];
    for (let i = 0; i < n; i++) {
      const prev = controlPoints[(i - 1 + n) % n];
      const next = controlPoints[(i + 1) % n];
      const catmull = next.clone().sub(prev).multiplyScalar(0.5);

      const rot = rotationOverrides[i];
      if (rot !== undefined && rot !== 0) {
        // Canvas angle → game-space direction: (-cos(a), 0, -sin(a))
        const mag = catmull.length();
        this.tangents.push(
          new THREE.Vector3(-Math.cos(rot), 0, -Math.sin(rot)).normalize().multiplyScalar(mag)
        );
      } else {
        this.tangents.push(catmull);
      }
    }
  }

  getPoint(t: number, optionalTarget?: THREE.Vector3): THREE.Vector3 {
    const n = this.n;
    let raw = t * n;
    if (raw >= n) raw = n - 1e-10;

    const seg = Math.floor(raw);
    const u = raw - seg;

    const i0 = seg % n;
    const i1 = (seg + 1) % n;
    const p0 = this.pts[i0], p1 = this.pts[i1];
    const m0 = this.tangents[i0], m1 = this.tangents[i1];

    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;

    const out = optionalTarget ?? new THREE.Vector3();
    out.set(
      h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x,
      h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y,
      h00 * p0.z + h10 * m0.z + h01 * p1.z + h11 * m1.z,
    );
    return out;
  }
}

export interface BoundaryPoint {
  left: THREE.Vector3;
  right: THREE.Vector3;
  center: THREE.Vector3;
  tangent: THREE.Vector3;
  t: number;
}

export class TrackDefinition {
  readonly curve: THREE.Curve<THREE.Vector3>;
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
    let pointRotations = cfg.pointRotations ?? [];

    if (reverse) {
      controlPoints = [...controlPoints].reverse();
      checkpoints = checkpoints.map(t => 1 - t).reverse();
      // Reverse order and flip direction (add π) for each rotation
      pointRotations = [...pointRotations].reverse().map(r => r !== 0 ? r + Math.PI : 0);
    }

    this.checkpoints = checkpoints;

    const points = controlPoints.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z)
    );

    const hasRotations = pointRotations.some(r => r !== 0);
    if (hasRotations) {
      this.curve = new HermiteTrackCurve(points, pointRotations);
    } else {
      this.curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
    }
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
