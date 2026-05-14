import * as THREE from 'three';
import type { TrackDefinition } from '../track/TrackDefinition.js';

const BOLLARD_INTERVAL = 12; // place bollard every N boundary samples
const SPECTATOR_INTERVAL = 10;

// Shared materials — created once, reused across all boundary object instances
const BOLLARD_ORANGE_MAT = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.65, metalness: 0.1 });
const BOLLARD_WHITE_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.3,
  metalness: 0.4,
  emissive: 0xffffff,
  emissiveIntensity: 0.08,
});
const SPECTATOR_BODY_MAT = new THREE.MeshStandardMaterial({ color: 0x5588cc, roughness: 0.8 });
const SPECTATOR_SKIN_MAT = new THREE.MeshStandardMaterial({ color: 0xf5cba0, roughness: 0.9 });
const SPECTATOR_HELMET_MAT = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.4, metalness: 0.3 });

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

    // Main body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 4.2, 8), BOLLARD_ORANGE_MAT);
    body.position.y = 2.1;
    g.add(body);

    // Reflective white band
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.65, 8), BOLLARD_WHITE_MAT);
    band.position.y = 2.6;
    g.add(band);

    // Cone top
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.38, 0.9, 8), BOLLARD_ORANGE_MAT);
    top.position.y = 4.65;
    g.add(top);

    return g;
  }

  private makeSpectator(): THREE.Group {
    const g = new THREE.Group();

    // Legs
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.3), SPECTATOR_BODY_MAT);
    legs.position.y = 0.45;
    g.add(legs);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.35), SPECTATOR_BODY_MAT);
    torso.position.y = 1.27;
    g.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 6), SPECTATOR_SKIN_MAT);
    head.position.y = 1.92;
    g.add(head);

    // Helmet/hat
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 6), SPECTATOR_HELMET_MAT);
    helmet.position.y = 2.05;
    helmet.scale.set(1, 0.65, 1);
    g.add(helmet);

    return g;
  }
}
