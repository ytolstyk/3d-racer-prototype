import * as THREE from 'three';

export interface ObstacleInfo {
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  radius: number;
}

// Shared materials — created once, reused across all obstacle instances
const tireMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.85 });
const innerMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
const hayMat = new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.9 });
const bandMat = new THREE.MeshStandardMaterial({ color: 0xcc9900, roughness: 0.8 });
const barrelBodyMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5 });
const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
const flagMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.8, side: THREE.DoubleSide });
const sandMat = new THREE.MeshStandardMaterial({ color: 0xc8a850, roughness: 0.95 });

export class ObstacleFactory {
  build(): ObstacleInfo[] {
    const obstacles: ObstacleInfo[] = [];

    // Tire wall at the hairpin
    obstacles.push(this.createTireWall(new THREE.Vector3(90, 0, -5)));

    // Hay bales near chicane
    obstacles.push(this.createHayBale(new THREE.Vector3(-60, 0, -5)));
    obstacles.push(this.createHayBale(new THREE.Vector3(-55, 0, -10)));

    // Safety barrel cluster
    obstacles.push(this.createSafetyBarrel(new THREE.Vector3(-15, 0, 50), 0xff6600));
    obstacles.push(this.createSafetyBarrel(new THREE.Vector3(-10, 0, 52), 0xff6600));

    // Marshaling post
    obstacles.push(this.createMarshalingPost(new THREE.Vector3(20, 0, -5)));

    // Sandbag chicane markers
    obstacles.push(this.createSandbag(new THREE.Vector3(35, 0, 48)));
    obstacles.push(this.createSandbag(new THREE.Vector3(-75, 0, -45)));

    return obstacles;
  }

  private createTireWall(position: THREE.Vector3): ObstacleInfo {
    const group = new THREE.Group();
    const tireGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.85, 14);
    const innerGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.87, 12);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const t = new THREE.Mesh(tireGeo, tireMat);
        t.position.set(col * 2.25 - 3.375, row * 0.86 + 0.43, 0);
        t.castShadow = true;
        t.receiveShadow = true;
        group.add(t);
        const inner = new THREE.Mesh(innerGeo, innerMat);
        inner.position.copy(t.position);
        group.add(inner);
      }
    }

    group.position.copy(position);
    return { mesh: group, position: position.clone(), radius: 5 };
  }

  private createHayBale(position: THREE.Vector3): ObstacleInfo {
    const group = new THREE.Group();

    const bale = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.0, 2.0), hayMat);
    bale.position.y = 1.0;
    bale.castShadow = true;
    bale.receiveShadow = true;
    group.add(bale);

    // Twine bands
    for (const bx of [-0.9, 0, 0.9]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.05, 2.05), bandMat);
      band.position.set(bx, 1.0, 0);
      group.add(band);
    }

    group.position.copy(position);
    return { mesh: group, position: position.clone(), radius: 2.5 };
  }

  private createSafetyBarrel(position: THREE.Vector3, _color: number): ObstacleInfo {
    const group = new THREE.Group();
    const bodyMat = barrelBodyMat;

    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.5, 14), bodyMat);
    body.position.y = 1.25;
    body.castShadow = true;
    group.add(body);

    // Two reflective stripes
    for (const sy of [0.7, 1.5]) {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.2, 14), stripeMat);
      stripe.position.y = sy;
      group.add(stripe);
    }

    // Lid
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.0, 0.15, 14), bodyMat);
    lid.position.y = 2.57;
    group.add(lid);

    group.position.copy(position);
    return { mesh: group, position: position.clone(), radius: 1.5 };
  }

  private createMarshalingPost(position: THREE.Vector3): ObstacleInfo {
    const group = new THREE.Group();

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.4, 10), baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    group.add(base);

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.0, 8), poleMat);
    pole.position.y = 2.7;
    pole.castShadow = true;
    group.add(pole);

    // Flag
    const flagGeo = new THREE.PlaneGeometry(2.0, 1.2);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(1.0, 5.0, 0);
    group.add(flag);

    group.position.copy(position);
    return { mesh: group, position: position.clone(), radius: 2 };
  }

  private createSandbag(position: THREE.Vector3): ObstacleInfo {
    const group = new THREE.Group();

    for (let i = 0; i < 3; i++) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.1), sandMat);
      bag.position.set(i * 2.3 - 2.3, 0.5, 0);
      group.add(bag);
    }

    // Top row (2 bags)
    for (let i = 0; i < 2; i++) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.1), sandMat);
      bag.position.set(i * 2.3 - 1.15, 1.5, 0);
      group.add(bag);
    }

    group.position.copy(position);
    return { mesh: group, position: position.clone(), radius: 4 };
  }
}
