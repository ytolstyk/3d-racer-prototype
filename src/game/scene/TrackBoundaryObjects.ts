import * as THREE from 'three';
import type { TrackDefinition } from '../track/TrackDefinition.js';

const BOLLARD_INTERVAL = 12; // place bollard every N boundary samples
const SPECTATOR_INTERVAL = 10;

export class TrackBoundaryObjects {
  private track: TrackDefinition;

  constructor(track: TrackDefinition) {
    this.track = track;
  }

  build(): THREE.Group {
    const group = new THREE.Group();
    const boundaries = this.track.getBoundaryPoints();
    const total = boundaries.length;

    for (let i = 0; i < total; i++) {
      const bp = boundaries[i];
      const up = new THREE.Vector3(0, 1, 0);
      const tangent = bp.tangent.clone().normalize();
      const outward = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const trackAngle = Math.atan2(tangent.x, tangent.z);

      // Bollards at both edges
      if (i % BOLLARD_INTERVAL === 0) {
        for (const side of [-1, 1] as const) {
          const base = side === -1 ? bp.left : bp.right;
          const dir = side === -1 ? outward : outward.clone().negate();

          // Slight jitter for organic placement
          const jitterFwd = (Math.random() - 0.5) * 4;
          const jitterLat = (Math.random() - 0.5) * 2;
          const pos = base.clone()
            .add(dir.clone().multiplyScalar(1.5 + jitterLat))
            .add(tangent.clone().multiplyScalar(jitterFwd));
          pos.y = 0;

          const bollard = this.makeBollard();
          bollard.position.copy(pos);
          bollard.rotation.y = trackAngle + (Math.random() - 0.5) * 0.3;
          group.add(bollard);
        }
      }

      // Spectators on right side only (grandstand side)
      if (i % SPECTATOR_INTERVAL === 0) {
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

  private makeBollard(): THREE.Group {
    const g = new THREE.Group();

    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.65, metalness: 0.1 });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0xffffff,
      emissiveIntensity: 0.08,
    });

    // Main body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 4.2, 8), orangeMat);
    body.position.y = 2.1;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // Reflective white band
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.65, 8), whiteMat);
    band.position.y = 2.6;
    g.add(band);

    // Cone top
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.38, 0.9, 8), orangeMat);
    top.position.y = 4.65;
    top.castShadow = true;
    g.add(top);

    return g;
  }

  private makeSpectator(): THREE.Group {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5588cc, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cba0, roughness: 0.9 });
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
