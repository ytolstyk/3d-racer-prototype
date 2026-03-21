import * as THREE from 'three';
import type { TrackDefinition } from './TrackDefinition.js';

export class TrackBuilder {
  build(track: TrackDefinition): THREE.Group {
    const group = new THREE.Group();

    // Build track surface (chunked for frustum culling)
    const surface = this.buildSurfaceChunked(track);
    group.add(surface);

    // Build curbs on both edges
    group.add(this.buildCurb(track, 'left'));
    group.add(this.buildCurb(track, 'right'));

    // Build jersey barriers on both sides
    group.add(this.buildBarriers(track, 'left'));
    group.add(this.buildBarriers(track, 'right'));

    // Build rumble strips at tight corners
    group.add(this.buildRumbleStrips(track));

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

    return group;
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
          const base = (local - 1) * 2;
          indices.push(base, base + 1, base + 2);
          indices.push(base + 1, base + 3, base + 2);
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

  private buildCurb(track: TrackDefinition, side: 'left' | 'right'): THREE.Mesh {
    const boundaries = track.getBoundaryPoints();
    const total = boundaries.length;
    const geometry = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const curbHeight = 0.3;
    const curbWidth = 1.8;
    const uRepeat = 12; // texture tiles along track

    const curbTex = this.makeCurbTexture();

    for (let i = 0; i < total; i++) {
      const bp = boundaries[i];
      const base = side === 'left' ? bp.left : bp.right;
      const normal = track.getNormalAt(bp.t);
      const outward = side === 'left' ? normal : normal.clone().negate();

      const inner = base.clone();
      const outer = base.clone().add(outward.clone().multiplyScalar(curbWidth));

      // Compute curvature from adjacent tangents for corner darkening
      const iPrev = (i - 1 + total) % total;
      const iNext = (i + 1) % total;
      const tPrev = boundaries[iPrev].tangent;
      const tNext = boundaries[iNext].tangent;
      const curvature = Math.max(0, 1 - tPrev.dot(tNext));
      const dark = 1 - Math.min(curvature * 4, 0.55);

      // Bottom inner, top inner, top outer, bottom outer
      vertices.push(inner.x, 0.05, inner.z);
      vertices.push(inner.x, 0.05 + curbHeight, inner.z);
      vertices.push(outer.x, 0.05 + curbHeight, outer.z);
      vertices.push(outer.x, 0.05, outer.z);

      // Vertex colors (curvature darkening in tight corners)
      for (let j = 0; j < 4; j++) {
        colors.push(dark, dark, dark);
      }

      // UV: u = along track (with repeat), v = 0 inner / 1 outer
      const u = (i / total) * uRepeat;
      uvs.push(u, 0); // bot-inner
      uvs.push(u, 0); // top-inner
      uvs.push(u, 1); // top-outer
      uvs.push(u, 1); // bot-outer

      if (i < total - 1) {
        const baseIdx = i * 4;
        // Top face
        indices.push(baseIdx + 1, baseIdx + 2, baseIdx + 5);
        indices.push(baseIdx + 2, baseIdx + 6, baseIdx + 5);
        // Outer face
        indices.push(baseIdx + 2, baseIdx + 3, baseIdx + 6);
        indices.push(baseIdx + 3, baseIdx + 7, baseIdx + 6);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      map: curbTex,
      vertexColors: true,
      roughness: 0.6,
    });

    return new THREE.Mesh(geometry, material);
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

  private buildBarriers(track: TrackDefinition, side: 'left' | 'right'): THREE.Group {
    const group = new THREE.Group();
    const boundaries = track.getBoundaryPoints();
    const total = boundaries.length;

    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6, metalness: 0.0 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.7, metalness: 0.0 });

    const barrierOutset = 2.0; // distance beyond curb edge
    const segLen = 6.0;

    // Group boundary points into segments by arc length
    let accumulated = 0;
    let segStart = 0;

    for (let i = 1; i <= total; i++) {
      const prev = boundaries[(i - 1) % total];
      const curr = boundaries[i % total];
      const step = prev.center.distanceTo(curr.center);
      accumulated += step;

      if (accumulated >= segLen || i === total) {
        const midIdx = Math.floor((segStart + (i - 1)) / 2) % total;
        const bp = boundaries[midIdx];
        const base = side === 'left' ? bp.left : bp.right;
        const normal = new THREE.Vector3().crossVectors(bp.tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const outward = side === 'left' ? normal : normal.clone().negate();

        const pos = base.clone().add(outward.clone().multiplyScalar(barrierOutset + 1.25));
        const tAngle = Math.atan2(bp.tangent.x, bp.tangent.z);
        const jitter = (Math.random() - 0.5) * 0.04;

        // Trapezoidal jersey barrier body
        const bodyLen = accumulated * 0.95;
        const bodyGeo = new THREE.BoxGeometry(2.0, 3.5, bodyLen);
        const body = new THREE.Mesh(bodyGeo, barrierMat);
        body.position.set(pos.x, 1.75, pos.z);
        body.rotation.y = tAngle + jitter;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Red stripe band around mid-height
        const stripeGeo = new THREE.BoxGeometry(2.1, 0.8, bodyLen + 0.05);
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(pos.x, 1.2, pos.z);
        stripe.rotation.y = tAngle + jitter;
        group.add(stripe);

        // Reset for next segment
        accumulated = 0;
        segStart = i;
      }
    }

    return group;
  }

  private buildRumbleStrips(track: TrackDefinition): THREE.Group {
    const group = new THREE.Group();
    const boundaries = track.getBoundaryPoints();
    const total = boundaries.length;
    const curbTex = this.makeCurbTexture();

    const rumbleMat = new THREE.MeshStandardMaterial({
      map: curbTex,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });

    const stripWidth = 3.0;

    for (let i = 0; i < total - 1; i++) {
      const iPrev = (i - 1 + total) % total;
      const iNext = (i + 1) % total;
      const tPrev = boundaries[iPrev].tangent;
      const tNext = boundaries[iNext].tangent;
      const curvature = Math.max(0, 1 - tPrev.dot(tNext));

      if (curvature < 0.012) continue;

      // Determine which side is the inside of the curve
      const cross = tPrev.clone().cross(tNext);
      const insideSide = cross.y > 0 ? 'left' : 'right';

      const bp = boundaries[i];
      const bpNext = boundaries[iNext];
      const base = insideSide === 'left' ? bp.left : bp.right;
      const baseNext = insideSide === 'left' ? bpNext.left : bpNext.right;
      const normal = new THREE.Vector3().crossVectors(bp.tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const inward = insideSide === 'left' ? normal.clone().negate() : normal.clone();

      // Inner edge of rumble strip (into track)
      const innerA = base.clone().add(inward.clone().multiplyScalar(stripWidth));
      const innerB = baseNext.clone().add(inward.clone().multiplyScalar(stripWidth));
      const outerA = base.clone();
      const outerB = baseNext.clone();

      const verts = new Float32Array([
        outerA.x, 0.065, outerA.z,
        outerB.x, 0.065, outerB.z,
        innerA.x, 0.065, innerA.z,
        innerB.x, 0.065, innerB.z,
      ]);
      const uvArr = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
      const idx = new Uint16Array([0, 1, 2, 1, 3, 2]);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeVertexNormals();

      group.add(new THREE.Mesh(geo, rumbleMat));
    }

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
