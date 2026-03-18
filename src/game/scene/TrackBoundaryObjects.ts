import * as THREE from 'three';
import type { TrackDefinition } from '../track/TrackDefinition.js';
import {
  makeCheerioColorTexture,
  makeCheerioRoughnessTexture,
  makeBroccoliColorTexture,
  makeBroccoliRoughnessTexture,
  makeBroccoliStemTexture,
} from './ProceduralTextures.js';

const JITTER = Math.PI / 10;

// Cheerio material — reused across all instances
const CHEERIO_MAT = new THREE.MeshStandardMaterial({
  map: makeCheerioColorTexture(),
  roughnessMap: makeCheerioRoughnessTexture(),
  roughness: 1.0,
  metalness: 0.04,
});
// Slightly darker shade for stacks (same tex, tinted darker)
const CHEERIO_MAT_DARK = new THREE.MeshStandardMaterial({
  map: makeCheerioColorTexture(),
  roughnessMap: makeCheerioRoughnessTexture(),
  roughness: 1.0,
  metalness: 0.0,
  color: 0xc07015,
});

// Shared geometry — one torus for all Cheerio pieces
const CHEERIO_GEO = new THREE.TorusGeometry(1.3, 0.48, 10, 22);

export class TrackBoundaryObjects {
  private track: TrackDefinition;

  constructor(track: TrackDefinition) {
    this.track = track;
  }

  build(): THREE.Group {
    const group = new THREE.Group();
    const boundaries = this.track.getBoundaryPoints();
    const total = boundaries.length;

    // Spacing constants
    const clusterInterval = 18;   // cheerio cluster every N samples (denser)
    const treeInterval = 40;
    const spectatorInterval = 20;

    for (let i = 0; i < total; i++) {
      const bp = boundaries[i];
      const up = new THREE.Vector3(0, 1, 0);
      const tangent = bp.tangent.clone().normalize();
      const outward = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const trackAngle = Math.atan2(tangent.x, tangent.z);

      // Cheerio clusters — far from track, grouped together
      if (i % clusterInterval === 0) {
        for (const side of [-1, 1] as const) {
          const base = side === -1 ? bp.left : bp.right;
          const dir  = side === -1 ? outward : outward.clone().negate();

          // Cluster of 2-4 cheerios right at track edge
          const clusterDist = 0.5 + Math.random() * 2.5;
          const clusterCenter = base.clone().add(dir.clone().multiplyScalar(clusterDist));
          const cheerioCount = 2 + Math.floor(Math.random() * 3);

          for (let c = 0; c < cheerioCount; c++) {
            const scatter = new THREE.Vector3(
              (Math.random() - 0.5) * 6,
              0,
              (Math.random() - 0.5) * 6,
            );
            const pos = clusterCenter.clone().add(scatter);
            pos.y = 0;

            const ring = this.makeSingleCheerio(trackAngle + Math.random() * Math.PI * 2);
            ring.position.copy(pos);
            group.add(ring);
          }

          // Occasional stack within cluster
          if (Math.random() > 0.4) {
            const stackPos = clusterCenter.clone().add(
              new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4)
            );
            stackPos.y = 0;
            const stack = this.makeCheerioStack(trackAngle);
            stack.position.copy(stackPos);
            group.add(stack);
          }
        }
      }

      // Broccoli further out
      if (i % treeInterval === 0) {
        for (const sx of [-1, 1]) {
          const base = sx === -1 ? bp.left : bp.right;
          const dir = sx === -1 ? outward : outward.clone().negate();
          const brocPos = base.clone().add(dir.clone().multiplyScalar(3 + Math.random() * 3));
          brocPos.y = 0;
          const broc = this.makeBroccoli();
          broc.position.copy(brocPos);
          broc.rotation.y = Math.random() * Math.PI * 2;
          group.add(broc);
        }
      }

      // Spectators on right side only (grandstand side)
      if (i % spectatorInterval === 0) {
        const rightPos = bp.right.clone().sub(outward.clone().multiplyScalar(3 + Math.random() * 2));
        rightPos.y = 0;
        const spec = this.makeSpectator();
        spec.position.copy(rightPos);
        spec.rotation.y = trackAngle + Math.PI + (Math.random() - 0.5) * 0.5;
        group.add(spec);
      }
    }

    return group;
  }

  /** Single Cheerio lying flat on the table surface. */
  private makeSingleCheerio(trackAngle: number): THREE.Group {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(CHEERIO_GEO, CHEERIO_MAT);
    // Flat — no rotation needed (torus lies in XZ by default), bottom of tube touches table
    mesh.rotation.y = trackAngle;
    mesh.position.y = 0.48; // tube radius, so bottom sits on table
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return g;
  }

  /** Stack of 3 Cheerios lying flat, stacked on top of each other. */
  private makeCheerioStack(trackAngle: number): THREE.Group {
    const g = new THREE.Group();
    const mats = [CHEERIO_MAT, CHEERIO_MAT_DARK, CHEERIO_MAT];
    const heights = [0.48, 1.48, 2.48]; // each tube diameter (~1.0) apart

    for (let k = 0; k < 3; k++) {
      const mesh = new THREE.Mesh(CHEERIO_GEO, mats[k]);
      // Flat orientation with slight random tilt for character
      const tiltX = (Math.random() - 0.5) * 0.18;
      const tiltZ = (Math.random() - 0.5) * 0.18;
      mesh.rotation.set(tiltX, trackAngle + (Math.random() - 0.5) * JITTER, tiltZ);
      mesh.position.y = heights[k];
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    return g;
  }

  private makeBroccoli(): THREE.Group {
    const g = new THREE.Group();

    const brocTex      = makeBroccoliColorTexture();
    const brocRoughTex = makeBroccoliRoughnessTexture();
    const stemTex      = makeBroccoliStemTexture();

    const stemMat  = new THREE.MeshStandardMaterial({ map: stemTex,  roughness: 1.0, metalness: 0 });
    const headMat  = new THREE.MeshStandardMaterial({ map: brocTex,  roughnessMap: brocRoughTex, roughness: 1.0, metalness: 0 });
    const headMat2 = new THREE.MeshStandardMaterial({ map: brocTex,  roughnessMap: brocRoughTex, roughness: 1.0, metalness: 0, color: 0x388e3c });
    const headMat3 = new THREE.MeshStandardMaterial({ map: brocTex,  roughnessMap: brocRoughTex, roughness: 1.0, metalness: 0, color: 0x1b5e20 });

    // Stalk — tapered cylinder
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 4.5, 8), stemMat);
    stalk.position.y = 2.25;
    stalk.castShadow = true;
    stalk.receiveShadow = true;
    g.add(stalk);

    // Main floret cluster — central big dome
    const main = new THREE.Mesh(new THREE.SphereGeometry(2.8, 7, 6), headMat);
    main.scale.y = 0.72;
    main.position.y = 5.6;
    main.castShadow = true;
    g.add(main);

    // Surrounding sub-florets for lumpy silhouette
    const offsets: [number, number, number, number][] = [
      [ 1.6,  5.2,  0.8, 1.9],
      [-1.5,  5.0,  0.9, 1.8],
      [ 0.5,  5.4, -1.7, 2.0],
      [-0.8,  5.8,  1.5, 1.6],
      [ 1.8,  5.8, -0.6, 1.5],
      [-1.9,  5.6, -0.8, 1.4],
    ];
    const subMats = [headMat2, headMat3, headMat, headMat2, headMat3, headMat];
    for (let j = 0; j < offsets.length; j++) {
      const [x, y, z, r] = offsets[j];
      const sub = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), subMats[j]);
      sub.scale.y = 0.75;
      sub.position.set(x, y, z);
      sub.castShadow = true;
      g.add(sub);
    }

    return g;
  }

  private makeSpectator(): THREE.Group {
    const g = new THREE.Group();

    const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x5588cc, roughness: 0.8 });
    const skinMat  = new THREE.MeshStandardMaterial({ color: 0xf5cba0, roughness: 0.9 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.4, metalness: 0.3 });

    // Legs
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.3), bodyMat);
    legs.position.y = 0.45;
    legs.castShadow = true;
    g.add(legs);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.35), bodyMat);
    torso.position.y = 1.27;
    torso.castShadow = true;
    g.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 6), skinMat);
    head.position.y = 1.92;
    head.castShadow = true;
    g.add(head);

    // Helmet/hat
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 6), helmetMat);
    helmet.position.y = 2.05;
    helmet.scale.set(1, 0.65, 1);
    g.add(helmet);

    return g;
  }
}
