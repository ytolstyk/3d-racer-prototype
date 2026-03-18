import * as THREE from 'three';
import type { TrackDefinition } from './TrackDefinition.js';

export class TrackBuilder {
  build(track: TrackDefinition): THREE.Group {
    const group = new THREE.Group();

    // Build track surface (chunked for frustum culling)
    const surface = this.buildSurfaceChunked(track);
    group.add(surface);

    // Build start/finish line
    const startLine = this.buildStartLine(track);
    group.add(startLine);

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
    const geometry = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const curbHeight = 0.3;
    const curbWidth = 0.4;

    for (let i = 0; i < boundaries.length; i++) {
      const bp = boundaries[i];
      const base = side === 'left' ? bp.left : bp.right;
      const normal = track.getNormalAt(bp.t);
      const outward = side === 'left' ? normal : normal.clone().negate();

      const inner = base.clone();
      const outer = base.clone().add(outward.clone().multiplyScalar(curbWidth));

      // Bottom inner, top inner, top outer, bottom outer
      vertices.push(inner.x, 0.05, inner.z);
      vertices.push(inner.x, 0.05 + curbHeight, inner.z);
      vertices.push(outer.x, 0.05 + curbHeight, outer.z);
      vertices.push(outer.x, 0.05, outer.z);

      // Alternating red/white curb colors
      const isRed = Math.floor(i / 8) % 2 === 0;
      const r = isRed ? 0.9 : 1.0;
      const g = isRed ? 0.1 : 1.0;
      const b = isRed ? 0.1 : 1.0;
      for (let j = 0; j < 4; j++) {
        colors.push(r, g, b);
      }

      if (i < boundaries.length - 1) {
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
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.6,
    });

    return new THREE.Mesh(geometry, material);
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

  private buildStartLine(track: TrackDefinition): THREE.Mesh {
    const point = track.getPointAt(0);
    const tangent = track.getTangentAt(0);

    const geometry = new THREE.PlaneGeometry(track.width, 2.0);
    const material = new THREE.MeshStandardMaterial({
      map: this.makeCheckerTexture(),
      roughness: 0.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(point.x, 0.06, point.z);

    // Align with tangent direction
    const tAngle = Math.atan2(tangent.x, tangent.z);
    mesh.rotation.z = -tAngle;

    return mesh;
  }
}
