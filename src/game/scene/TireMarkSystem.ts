import * as THREE from 'three';
import type { CarState } from '../../types/game.js';

const MAX_MARKS = 1200;
const MAX_SUBSTANCE_MARKS = 400;
const MARK_SPACING = 0.9;

const SUBSTANCE_COLORS: Record<string, THREE.Color> = {
  oil: new THREE.Color(0x223311),
  juice: new THREE.Color(0xff8822),
  food: new THREE.Color(0x88cc44),
};

export class TireMarkSystem {
  private mesh: THREE.InstancedMesh;
  private substanceMesh: THREE.InstancedMesh;
  private nextIndex = 0;
  private count = 0;
  private substanceNextIndex = 0;
  private substanceCount = 0;
  private dummy = new THREE.Object3D();
  private lastMarkPos = new Map<string, THREE.Vector3>();
  private lastSubstancePos = new Map<string, THREE.Vector3>();
  private markCreationTime: Float32Array;
  private substanceCreationTime: Float32Array;
  private elapsed = 0;
  private baseColor = new THREE.Color(0x111111);
  private transparent = new THREE.Color(0x000000);

  constructor(scene: THREE.Scene) {
    // Geometry lies flat in XZ plane (baked rotation)
    const geo = new THREE.PlaneGeometry(0.65, 1.1);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_MARKS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Init instanceColor buffer
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_MARKS * 3), 3
    );
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // Substance marks pool
    const subGeo = new THREE.PlaneGeometry(0.7, 1.2);
    subGeo.rotateX(-Math.PI / 2);

    const subMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    this.substanceMesh = new THREE.InstancedMesh(subGeo, subMat, MAX_SUBSTANCE_MARKS);
    this.substanceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.substanceMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_SUBSTANCE_MARKS * 3), 3
    );
    this.substanceMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.substanceMesh.count = 0;
    this.substanceMesh.renderOrder = 1;
    this.substanceMesh.frustumCulled = false;
    scene.add(this.substanceMesh);

    this.markCreationTime = new Float32Array(MAX_MARKS).fill(-100);
    this.substanceCreationTime = new Float32Array(MAX_SUBSTANCE_MARKS).fill(-100);
  }

  addMarks(car: CarState): void {
    // Rate-limit by distance traveled
    const last = this.lastMarkPos.get(car.id);
    if (last && car.position.distanceTo(last) < MARK_SPACING) return;

    const stored = last ?? new THREE.Vector3();
    stored.copy(car.position);
    this.lastMarkPos.set(car.id, stored);

    const sinR = Math.sin(car.rotation);
    const cosR = Math.cos(car.rotation);

    // Rear axle center: 2 units behind car origin
    const rearX = car.position.x - sinR * 2.0;
    const rearZ = car.position.z - cosR * 2.0;

    // Width variation based on lateral velocity
    const widthScale = 0.65 + Math.min(1, Math.abs(car.lateralVelocity) / 10) * 0.5;

    // Right direction: (cosR, 0, -sinR) — lateral offset ±1.4 for two rear wheels
    const wheelOffsets = [-1.4, 1.4];
    for (const offset of wheelOffsets) {
      const wx = rearX + cosR * offset;
      const wz = rearZ - sinR * offset;

      this.dummy.position.set(wx, 0.065, wz);
      this.dummy.rotation.set(0, car.rotation, 0);
      this.dummy.scale.set(widthScale, 1, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(this.nextIndex, this.dummy.matrix);
      this.mesh.setColorAt(this.nextIndex, this.baseColor);
      this.markCreationTime[this.nextIndex] = this.elapsed;
      this.nextIndex = (this.nextIndex + 1) % MAX_MARKS;
      if (this.count < MAX_MARKS) {
        this.count++;
        this.mesh.count = this.count;
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  addSubstanceMarks(car: CarState, substance: string): void {
    const last = this.lastSubstancePos.get(car.id + substance);
    if (last && car.position.distanceTo(last) < MARK_SPACING) return;

    const stored = last ?? new THREE.Vector3();
    stored.copy(car.position);
    this.lastSubstancePos.set(car.id + substance, stored);

    const color = SUBSTANCE_COLORS[substance] ?? this.baseColor;
    const sinR = Math.sin(car.rotation);
    const cosR = Math.cos(car.rotation);
    const rearX = car.position.x - sinR * 2.0;
    const rearZ = car.position.z - cosR * 2.0;

    const wheelOffsets = [-1.4, 1.4];
    for (const offset of wheelOffsets) {
      const wx = rearX + cosR * offset;
      const wz = rearZ - sinR * offset;

      this.dummy.position.set(wx, 0.066, wz);
      this.dummy.rotation.set(0, car.rotation, 0);
      this.dummy.scale.set(0.8, 1, 1);
      this.dummy.updateMatrix();
      this.substanceMesh.setMatrixAt(this.substanceNextIndex, this.dummy.matrix);
      this.substanceMesh.setColorAt(this.substanceNextIndex, color);
      this.substanceCreationTime[this.substanceNextIndex] = this.elapsed;
      this.substanceNextIndex = (this.substanceNextIndex + 1) % MAX_SUBSTANCE_MARKS;
      if (this.substanceCount < MAX_SUBSTANCE_MARKS) {
        this.substanceCount++;
        this.substanceMesh.count = this.substanceCount;
      }
    }

    this.substanceMesh.instanceMatrix.needsUpdate = true;
    if (this.substanceMesh.instanceColor) this.substanceMesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    this.elapsed += dt;
    let dirty = false;
    let subDirty = false;

    // Fade regular marks: start fading at 10s, fully transparent at 14s
    for (let i = 0; i < this.count; i++) {
      const age = this.elapsed - this.markCreationTime[i];
      if (age > 10 && age < 15) {
        const fade = 1 - Math.min(1, (age - 10) / 4);
        const c = this.baseColor.clone().lerp(this.transparent, 1 - fade);
        this.mesh.setColorAt(i, c);
        dirty = true;
      } else if (age >= 15 && this.markCreationTime[i] > -50) {
        this.mesh.setColorAt(i, this.transparent);
        this.markCreationTime[i] = -100; // stop checking
        dirty = true;
      }
    }

    // Fade substance marks: start at 8s, gone at 12s
    for (let i = 0; i < this.substanceCount; i++) {
      const age = this.elapsed - this.substanceCreationTime[i];
      if (age > 8 && age < 13) {
        const fade = 1 - Math.min(1, (age - 8) / 4);
        const c = new THREE.Color(0x000000);
        this.substanceMesh.setColorAt(i, c.lerp(new THREE.Color(0x000000), 1 - fade));
        subDirty = true;
      } else if (age >= 13 && this.substanceCreationTime[i] > -50) {
        this.substanceMesh.setColorAt(i, this.transparent);
        this.substanceCreationTime[i] = -100;
        subDirty = true;
      }
    }

    if (dirty && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (subDirty && this.substanceMesh.instanceColor) this.substanceMesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.substanceMesh.geometry.dispose();
    (this.substanceMesh.material as THREE.Material).dispose();
  }
}
