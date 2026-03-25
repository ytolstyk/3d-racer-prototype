import * as THREE from 'three';
import type { TrackDefinition } from './TrackDefinition.js';
import type { TunnelSection } from '../../types/game.js';

export class TrackBuilder {
  build(track: TrackDefinition, tunnels: TunnelSection[] = []): THREE.Group {
    const group = new THREE.Group();

    // Build track surface (chunked for frustum culling)
    const surface = this.buildSurfaceChunked(track);
    group.add(surface);

    // Build jersey barriers on both sides (continuous spline mesh)
    group.add(this.buildBarrierSpline(track, 'left'));
    group.add(this.buildBarrierSpline(track, 'right'));


    // Build start/finish line
    const startLine = this.buildStartLine(track);
    group.add(startLine);

    // Build start/finish banner
    const banner = this.buildStartBanner(track);
    group.add(banner);

    // Build checkpoint gates
    for (let ci = 0; ci < track.checkpoints.length; ci++) {
      const gate = this.buildCheckpointGate(track, track.checkpoints[ci], ci);
      group.add(gate);
    }

    // Build tunnel sections
    for (const tunnel of tunnels) {
      group.add(this.buildTunnel(track, tunnel.tStart, tunnel.tEnd));
    }

    return group;
  }

  private buildTunnel(track: TrackDefinition, tStart: number, tEnd: number): THREE.Mesh {
    const N_SECTIONS = 80;
    const N_ARCH = 9;
    const halfW = (track.width + 8) / 2;
    const archH = 30;

    const pos: number[] = [];
    const idx: number[] = [];

    for (let si = 0; si <= N_SECTIONS; si++) {
      const t = tStart + (tEnd - tStart) * si / N_SECTIONS;
      const c = track.getPointAt(t);
      const n = track.getNormalAt(t);
      for (let j = 0; j < N_ARCH; j++) {
        const angle = Math.PI * (1 - j / (N_ARCH - 1));
        pos.push(
          c.x + n.x * halfW * Math.cos(angle),
          c.y + archH * Math.sin(angle),
          c.z + n.z * halfW * Math.cos(angle),
        );
      }
    }

    // Arch quads
    for (let si = 0; si < N_SECTIONS; si++) {
      for (let j = 0; j < N_ARCH - 1; j++) {
        const a = si * N_ARCH + j;
        const b = si * N_ARCH + j + 1;
        const c = (si + 1) * N_ARCH + j;
        const d = (si + 1) * N_ARCH + j + 1;
        idx.push(a, b, c, b, d, c);
      }
    }

    // End caps (triangle fans from vertex 0 of each end)
    for (const si of [0, N_SECTIONS]) {
      const base = si * N_ARCH;
      for (let j = 1; j < N_ARCH - 1; j++) {
        idx.push(base, base + j, base + j + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      transparent: true, opacity: 0.3, color: 0x99ccff,
      roughness: 0.4, side: THREE.DoubleSide, depthWrite: false,
    });

    return new THREE.Mesh(geo, mat);
  }

  private buildSurfaceChunked(track: TrackDefinition, chunkCount = 8): THREE.Group {
    const boundaries = track.getBoundaryPoints();
    const group = new THREE.Group();
    const samplesPerChunk = Math.ceil(boundaries.length / chunkCount);

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.85,
      metalness: 0.05,
    });

    for (let c = 0; c < chunkCount; c++) {
      const start = c * samplesPerChunk;
      // Overlap by 1 so adjacent chunks share an edge
      const end = Math.min(start + samplesPerChunk + 1, boundaries.length);

      const vertices: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      for (let i = start; i < end; i++) {
        const bp = boundaries[i];
        vertices.push(bp.left.x, 0.05, bp.left.z);
        vertices.push(bp.right.x, 0.05, bp.right.z);
        uvs.push(0, bp.t);
        uvs.push(1, bp.t);

        const local = i - start;
        if (local > 0) {
          const bpPrev = boundaries[i - 1];
          // Signed area of first triangle in xz plane; positive = correct CCW winding from above.
          const dx1 = bpPrev.right.x - bpPrev.left.x, dz1 = bpPrev.right.z - bpPrev.left.z;
          const dx2 = bp.left.x - bpPrev.left.x,       dz2 = bp.left.z - bpPrev.left.z;
          if (dx1 * dz2 - dz1 * dx2 > 1.0) {
            const base = (local - 1) * 2;
            indices.push(base, base + 1, base + 2);
            indices.push(base + 1, base + 3, base + 2);
          }
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      group.add(new THREE.Mesh(geometry, material));
    }

    return group;
  }

  private buildCurbDecals(track: TrackDefinition, side: 'left' | 'right'): THREE.Group {
    const group = new THREE.Group();
    const boundaries = track.getBoundaryPoints();
    const total = boundaries.length;

    const curbWidth = 1.8;
    const curbTex = this.makeCurbTexture();
    const material = new THREE.MeshBasicMaterial({
      map: curbTex,
      transparent: true,
      depthWrite: false,
      renderOrder: 1,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < total - 1; i++) {
      const bp = boundaries[i];
      const bpNext = boundaries[i + 1];

      // Skip quads at very tight turns to avoid overlap artifacts
      const iPrev = (i - 1 + total) % total;
      const iNext = (i + 1) % total;
      const tPrev = boundaries[iPrev].tangent;
      const tNext = boundaries[iNext].tangent;
      const curvature = Math.max(0, 1 - tPrev.dot(tNext));
      if (curvature > 0.35) continue;

      const base = side === 'left' ? bp.left : bp.right;
      const baseNext = side === 'left' ? bpNext.left : bpNext.right;

      const normal = track.getNormalAt(bp.t);
      const outward = side === 'left' ? normal : normal.clone().negate();

      const innerA = base.clone();
      const outerA = base.clone().add(outward.clone().multiplyScalar(curbWidth));
      const innerB = baseNext.clone();
      const outerB = baseNext.clone().add(outward.clone().multiplyScalar(curbWidth));

      const verts = new Float32Array([
        innerA.x, 0.06, innerA.z,
        outerA.x, 0.06, outerA.z,
        innerB.x, 0.06, innerB.z,
        outerB.x, 0.06, outerB.z,
      ]);
      const uvArr = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
      const idx = new Uint16Array([0, 1, 2, 1, 3, 2]);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, material);
      mesh.renderOrder = 1;
      group.add(mesh);
    }

    return group;
  }

  private makeRedTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 4; canvas.height = 4;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#cc1111';
    ctx.fillRect(0, 0, 4, 4);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private makeCurbTexture(): THREE.CanvasTexture {
    const w = 512, h = 64;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Alternating red/white vertical stripes
    const numStripes = 8;
    const stripeW = w / numStripes;
    for (let i = 0; i < numStripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#cc2020' : '#f0f0f0';
      ctx.fillRect(i * stripeW, 0, stripeW, h);
    }

    // Scattered dark scratch/dent lines
    for (let s = 0; s < 25; s++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.6 + Math.random() * 1.4;
      ctx.globalAlpha = 0.2 + Math.random() * 0.2;
      const x1 = Math.random() * w;
      const y1 = Math.random() * h;
      const x2 = x1 + (Math.random() - 0.5) * 50;
      const y2 = y1 + (Math.random() - 0.5) * 25;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private makeCheckerTexture(): THREE.CanvasTexture {
    const sq = 32, cols = 8, rows = 2;
    const canvas = document.createElement('canvas');
    canvas.width = cols * sq;
    canvas.height = rows * sq;
    const ctx = canvas.getContext('2d')!;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(c * sq, r * sq, sq, sq);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private makeBannerTexture(name: string): THREE.CanvasTexture {
    const w = 512, h = 128;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a0800');
    grad.addColorStop(1, '#2a1400');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Checkered border
    const sq = 12;
    for (let i = 0; i * sq < w; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#111111';
      ctx.fillRect(i * sq, 0, sq, sq);
      ctx.fillRect(i * sq, h - sq, sq, sq);
    }
    for (let j = 1; j * sq < h - sq; j++) {
      ctx.fillStyle = j % 2 === 0 ? '#ffffff' : '#111111';
      ctx.fillRect(0, j * sq, sq, sq);
      ctx.fillRect(w - sq, j * sq, sq, sq);
    }

    // Track name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Arial Black, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), w / 2, h / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildBarrierSpline(track: TrackDefinition, side: 'left' | 'right'): THREE.Group {
    const group = new THREE.Group();
    const barrierOutset = 3.25;
    const barrierH = 3.5;
    const halfD = 0.6;        // half-depth (total width = 1.2 units)
    const stripeH = 0.8;
    const stripeY = 1.2;
    const RIB_INTERVAL = 6;   // cross-section rib every N sample points

    // Collect spine points along barrier centerline (high-res to smooth curves)
    const BARRIER_SAMPLES = 2400;
    const rawSpinePoints: THREE.Vector3[] = [];
    const rawSpineRights: THREE.Vector3[] = [];
    for (let bi = 0; bi <= BARRIER_SAMPLES; bi++) {
      const t = bi / BARRIER_SAMPLES;
      const center = track.getPointAt(t);
      const tangent = track.getTangentAt(t);
      const trackNormal = track.getNormalAt(t);
      const outward = side === 'left' ? trackNormal : trackNormal.clone().negate();
      const edgePoint = center.clone().add(outward.clone().multiplyScalar(track.width / 2));
      rawSpinePoints.push(edgePoint.add(outward.clone().multiplyScalar(barrierOutset)));
      rawSpineRights.push(new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize());
    }

    // Post-process: two passes of midpoint insertion at high-curvature locations
    // to smooth outer arcs at sharp turns.
    let currentPoints = rawSpinePoints as THREE.Vector3[];
    let currentRights = rawSpineRights as THREE.Vector3[];
    for (let pass = 0; pass < 4; pass++) {
      const nextPoints: THREE.Vector3[] = [currentPoints[0]];
      const nextRights: THREE.Vector3[] = [currentRights[0]];
      for (let i = 1; i < currentPoints.length; i++) {
        if (i + 1 < currentPoints.length) {
          const d0 = new THREE.Vector3().subVectors(currentPoints[i], currentPoints[i - 1]).normalize();
          const d1 = new THREE.Vector3().subVectors(currentPoints[i + 1], currentPoints[i]).normalize();
          if (d0.dot(d1) < 0.98) {
            const mid = new THREE.Vector3().addVectors(currentPoints[i - 1], currentPoints[i]).multiplyScalar(0.5);
            const midR = new THREE.Vector3().addVectors(currentRights[i - 1], currentRights[i]).multiplyScalar(0.5).normalize();
            nextPoints.push(mid);
            nextRights.push(midR);
          }
        }
        nextPoints.push(currentPoints[i]);
        nextRights.push(currentRights[i]);
      }
      currentPoints = nextPoints;
      currentRights = nextRights;
    }
    const spinePoints = currentPoints;
    const spineRights = currentRights;

    // Laplacian smoothing on spine positions near high-curvature regions.
    for (let pass = 0; pass < 3; pass++) {
      const snap = spinePoints.map(p => p.clone());
      for (let i = 1; i < spinePoints.length - 1; i++) {
        const d0 = new THREE.Vector3().subVectors(snap[i], snap[i - 1]).normalize();
        const d1 = new THREE.Vector3().subVectors(snap[i + 1], snap[i]).normalize();
        if (d0.dot(d1) < 0.99) {
          const w = Math.min(0.45, (1 - d0.dot(d1)) * 3);
          spinePoints[i].copy(snap[i]).lerp(
            new THREE.Vector3().addVectors(snap[i - 1], snap[i + 1]).multiplyScalar(0.5),
            w,
          );
        }
      }
    }

    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });
    const stripeMat  = new THREE.MeshBasicMaterial({
      map: this.makeRedTexture(),
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    // Ribs face along the track direction — DoubleSide so visible from both travel directions
    const ribMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });

    const innerVerts:  number[] = [], innerUVs:  number[] = [], innerIdx:  number[] = [];
    const outerVerts:  number[] = [], outerUVs:  number[] = [], outerIdx:  number[] = [];
    const topVerts:    number[] = [], topUVs:    number[] = [], topIdx:    number[] = [];
    const stripeVerts: number[] = [], stripeUVs: number[] = [], stripeIdx: number[] = [];
    const ribVerts:    number[] = [], ribUVs:    number[] = [], ribIdx:    number[] = [];

    const total = spinePoints.length;

    // Detect degenerate spine segments (self-intersecting at sharp inner turns)
    const spineDegenerate: boolean[] = new Array(total - 1).fill(false);
    let prevSegDir: THREE.Vector3 | null = null;
    for (let i = 0; i < total - 1; i++) {
      const d = new THREE.Vector3().subVectors(spinePoints[i + 1], spinePoints[i]);
      const dist = d.length();
      if (dist < 0.05) {
        spineDegenerate[i] = true;
        continue;
      }
      d.normalize();
      if (prevSegDir !== null && prevSegDir.dot(d) < 0.15) {
        spineDegenerate[i] = true;
      } else {
        prevSegDir = d;
      }
    }

    const pushQuad = (
      verts: number[], uvs: number[], idx: number[],
      v00: [number, number, number], v01: [number, number, number],
      v10: [number, number, number], v11: [number, number, number],
      u0: number, u1: number,
      flip = false,
    ) => {
      const b = verts.length / 3;
      verts.push(...v00, ...v01, ...v10, ...v11);
      uvs.push(u0, 0,  u0, 1,  u1, 0,  u1, 1);
      if (flip) idx.push(b, b + 2, b + 1,  b + 1, b + 2, b + 3);
      else      idx.push(b, b + 1, b + 2,  b + 1, b + 3, b + 2);
    };

    for (let i = 0; i < total - 1; i++) {
      if (spineDegenerate[i]) continue;
      const p0 = spinePoints[i],   r0 = spineRights[i];
      const p1 = spinePoints[i + 1], r1 = spineRights[i + 1];
      const u0 = i / total, u1 = (i + 1) / total;

      // Inner face (track-facing)
      pushQuad(innerVerts, innerUVs, innerIdx,
        [p0.x + r0.x * halfD, 0.05,            p0.z + r0.z * halfD],
        [p0.x + r0.x * halfD, 0.05 + barrierH, p0.z + r0.z * halfD],
        [p1.x + r1.x * halfD, 0.05,            p1.z + r1.z * halfD],
        [p1.x + r1.x * halfD, 0.05 + barrierH, p1.z + r1.z * halfD],
        u0, u1,
      );

      // Outer face (away from track) — flipped winding
      pushQuad(outerVerts, outerUVs, outerIdx,
        [p0.x - r0.x * halfD, 0.05,            p0.z - r0.z * halfD],
        [p0.x - r0.x * halfD, 0.05 + barrierH, p0.z - r0.z * halfD],
        [p1.x - r1.x * halfD, 0.05,            p1.z - r1.z * halfD],
        [p1.x - r1.x * halfD, 0.05 + barrierH, p1.z - r1.z * halfD],
        u0, u1, true,
      );

      // Top face
      const topY = 0.05 + barrierH;
      pushQuad(topVerts, topUVs, topIdx,
        [p0.x + r0.x * halfD, topY, p0.z + r0.z * halfD],
        [p0.x - r0.x * halfD, topY, p0.z - r0.z * halfD],
        [p1.x + r1.x * halfD, topY, p1.z + r1.z * halfD],
        [p1.x - r1.x * halfD, topY, p1.z - r1.z * halfD],
        u0, u1,
      );

      // Red stripe on inner and outer faces
      for (const [sign, flip] of [[1, false], [-1, true]] as [number, boolean][]) {
        pushQuad(stripeVerts, stripeUVs, stripeIdx,
          [p0.x + r0.x * sign * halfD, stripeY,            p0.z + r0.z * sign * halfD],
          [p0.x + r0.x * sign * halfD, stripeY + stripeH,  p0.z + r0.z * sign * halfD],
          [p1.x + r1.x * sign * halfD, stripeY,            p1.z + r1.z * sign * halfD],
          [p1.x + r1.x * sign * halfD, stripeY + stripeH,  p1.z + r1.z * sign * halfD],
          u0, u1, flip,
        );
      }

      // Cross-section rib — perpendicular to track, visible when looking along the barrier length
      if (i % RIB_INTERVAL === 0) {
        const b = ribVerts.length / 3;
        ribVerts.push(
          p0.x + r0.x *  halfD, 0.05,            p0.z + r0.z *  halfD,  // inner-bottom
          p0.x + r0.x *  halfD, 0.05 + barrierH, p0.z + r0.z *  halfD,  // inner-top
          p0.x - r0.x *  halfD, 0.05 + barrierH, p0.z - r0.z *  halfD,  // outer-top
          p0.x - r0.x *  halfD, 0.05,            p0.z - r0.z *  halfD,  // outer-bottom
        );
        ribUVs.push(0, 0,  0, 1,  1, 1,  1, 0);
        ribIdx.push(b, b + 1, b + 2,  b, b + 2, b + 3);
      }
    }

    // End caps at degenerate gap boundaries to close open barrier ends
    for (let i = 0; i < total - 1; i++) {
      const atGapStart = !spineDegenerate[i] && (i + 1 < total - 1) && spineDegenerate[i + 1];
      const atGapEnd   = spineDegenerate[i]  && (i + 1 < total - 1) && !spineDegenerate[i + 1];
      if (atGapStart || atGapEnd) {
        const p = spinePoints[i + 1], r = spineRights[i + 1];
        const b = ribVerts.length / 3;
        ribVerts.push(
          p.x + r.x *  halfD, 0.05,            p.z + r.z *  halfD,
          p.x + r.x *  halfD, 0.05 + barrierH, p.z + r.z *  halfD,
          p.x - r.x *  halfD, 0.05 + barrierH, p.z - r.z *  halfD,
          p.x - r.x *  halfD, 0.05,            p.z - r.z *  halfD,
        );
        ribUVs.push(0, 0,  0, 1,  1, 1,  1, 0);
        ribIdx.push(b, b + 1, b + 2,  b, b + 2, b + 3);
      }
    }

    const buildMesh = (verts: number[], uvs: number[], idx: number[], mat: THREE.Material, shadow = false) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
      return mesh;
    };

    group.add(buildMesh(innerVerts,  innerUVs,  innerIdx,  barrierMat, true));
    group.add(buildMesh(outerVerts,  outerUVs,  outerIdx,  barrierMat));
    group.add(buildMesh(topVerts,    topUVs,    topIdx,    barrierMat));
    group.add(buildMesh(stripeVerts, stripeUVs, stripeIdx, stripeMat));
    group.add(buildMesh(ribVerts,    ribUVs,    ribIdx,    ribMat));

    return group;
  }

  private buildStartLine(track: TrackDefinition): THREE.Mesh {
    const point = track.getPointAt(0);
    const tangent = track.getTangentAt(0);

    const geometry = new THREE.PlaneGeometry(track.width, 3.0);
    const material = new THREE.MeshStandardMaterial({
      map: this.makeCheckerTexture(),
      roughness: 0.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const tAngle = Math.atan2(tangent.x, tangent.z);
    mesh.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), tAngle);
    mesh.rotateX(-Math.PI / 2);
    mesh.position.set(point.x, 0.06, point.z);

    return mesh;
  }

  private buildStartBanner(track: TrackDefinition): THREE.Group {
    const group = new THREE.Group();
    const point = track.getPointAt(0);
    const tangent = track.getTangentAt(0);
    const normal = track.getNormalAt(0);
    const tAngle = Math.atan2(tangent.x, tangent.z);

    const silverMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 });
    const postHeight = 12;
    const halfWidth = track.width / 2 + 1;

    // Left post
    const leftPos = point.clone().add(normal.clone().multiplyScalar(halfWidth));
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, postHeight, 8), silverMat);
    leftPost.position.set(leftPos.x, postHeight / 2, leftPos.z);
    leftPost.castShadow = true;
    group.add(leftPost);

    // Right post
    const rightPos = point.clone().sub(normal.clone().multiplyScalar(halfWidth));
    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, postHeight, 8), silverMat);
    rightPost.position.set(rightPos.x, postHeight / 2, rightPos.z);
    rightPost.castShadow = true;
    group.add(rightPost);

    // Horizontal bar — rotation.y = tAngle aligns the bar's X axis across the track width
    const bar = new THREE.Mesh(new THREE.BoxGeometry(track.width + 2, 0.5, 0.5), silverMat);
    bar.position.set(point.x, postHeight, point.z);
    bar.rotation.y = tAngle;
    group.add(bar);

    // Banner plane — rotation.y = tAngle makes it face approaching cars
    const bannerTex = this.makeBannerTexture(track.name);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(track.width * 0.85, 2.5), bannerMat);
    banner.position.set(point.x, postHeight - 1.25, point.z);
    banner.rotation.y = tAngle;
    group.add(banner);

    return group;
  }

  buildCheckpointGate(track: TrackDefinition, t: number, index: number): THREE.Group {
    const group = new THREE.Group();
    const point = track.getPointAt(t);
    const tangent = track.getTangentAt(t);
    const normal = track.getNormalAt(t);
    const tAngle = Math.atan2(tangent.x, tangent.z);

    const gateColors = [0x00aaff, 0xff8800, 0x00cc44];
    const color = gateColors[index % gateColors.length];

    const postMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 });
    const postHeight = 8;
    const halfWidth = track.width / 2 + 0.5;

    // Left post
    const leftPos = point.clone().add(normal.clone().multiplyScalar(halfWidth));
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, postHeight, 8), postMat);
    leftPost.position.set(leftPos.x, postHeight / 2, leftPos.z);
    group.add(leftPost);

    // Right post
    const rightPos = point.clone().sub(normal.clone().multiplyScalar(halfWidth));
    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, postHeight, 8), postMat);
    rightPost.position.set(rightPos.x, postHeight / 2, rightPos.z);
    group.add(rightPost);

    // Horizontal bar
    const bar = new THREE.Mesh(new THREE.BoxGeometry(track.width + 1, 0.4, 0.4), postMat);
    bar.position.set(point.x, postHeight, point.z);
    bar.rotation.y = tAngle;
    group.add(bar);

    // Translucent gate plane
    const gateMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(track.width, 6), gateMat);
    gate.position.set(point.x, 3, point.z);
    gate.rotation.y = tAngle;
    group.add(gate);

    return group;
  }
}
