import * as THREE from 'three';
import type { TireSmokeSystem } from './TireSmokeSystem.js';

interface Particle {
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
}

const SPARK_COUNT = 300;
const PAINT_COUNT = 225;
const SHARD_COUNT = 150;

export class CollisionParticleSystem {
  private sparks: THREE.InstancedMesh;
  private paintChips: THREE.InstancedMesh;
  private shards: THREE.InstancedMesh;
  private tireSmokeSystem: TireSmokeSystem;

  private sparkParticles: Particle[] = [];
  private paintParticles: Particle[] = [];
  private shardParticles: Particle[] = [];

  private sparkNext = 0;
  private paintNext = 0;
  private shardNext = 0;

  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, tireSmokeSystem: TireSmokeSystem) {
    this.tireSmokeSystem = tireSmokeSystem;

    // Sparks — bright yellow planes (30% smaller: 1.5 → 1.05)
    const sparkGeo = new THREE.PlaneGeometry(1.05, 1.05);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.sparks = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARK_COUNT);
    this.sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparks.count = 0;
    this.sparks.frustumCulled = false;
    scene.add(this.sparks);

    // Paint chips — colored by car (30% smaller: 0.6×0.35 → 0.42×0.245)
    const paintGeo = new THREE.PlaneGeometry(0.42, 0.245);
    const paintMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.paintChips = new THREE.InstancedMesh(paintGeo, paintMat, PAINT_COUNT);
    this.paintChips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.paintChips.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(PAINT_COUNT * 3), 3
    );
    this.paintChips.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.paintChips.count = 0;
    this.paintChips.frustumCulled = false;
    scene.add(this.paintChips);

    // Shards — dark grey triangles (30% smaller: scale verts by 0.7)
    const shardGeo = new THREE.BufferGeometry();
    const shardVerts = new Float32Array([0, 0, 0, 0.28, 0, 0, 0.14, 0.35, 0]);
    shardGeo.setAttribute('position', new THREE.BufferAttribute(shardVerts, 3));
    shardGeo.computeVertexNormals();
    const shardMat = new THREE.MeshBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.shards = new THREE.InstancedMesh(shardGeo, shardMat, SHARD_COUNT);
    this.shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shards.count = 0;
    this.shards.frustumCulled = false;
    scene.add(this.shards);

    // Init particle arrays
    for (let i = 0; i < SPARK_COUNT; i++) {
      this.sparkParticles.push({ life: 0, maxLife: 0.6, velocity: new THREE.Vector3(), x: 0, y: 0, z: 0, rx: 0, ry: 0 });
    }
    for (let i = 0; i < PAINT_COUNT; i++) {
      this.paintParticles.push({ life: 0, maxLife: 1.2, velocity: new THREE.Vector3(), x: 0, y: 0, z: 0, rx: 0, ry: 0 });
    }
    for (let i = 0; i < SHARD_COUNT; i++) {
      this.shardParticles.push({ life: 0, maxLife: 1.8, velocity: new THREE.Vector3(), x: 0, y: 0, z: 0, rx: 0, ry: 0 });
    }

    // Hide all instances initially
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < SPARK_COUNT; i++) this.sparks.setMatrixAt(i, this.dummy.matrix);
    for (let i = 0; i < PAINT_COUNT; i++) this.paintChips.setMatrixAt(i, this.dummy.matrix);
    for (let i = 0; i < SHARD_COUNT; i++) this.shards.setMatrixAt(i, this.dummy.matrix);
  }

  private findFreeSlot(pool: Particle[], nextPtr: number): number {
    const n = pool.length;
    for (let offset = 0; offset < n; offset++) {
      const i = (nextPtr + offset) % n;
      if (pool[i].life <= 0) return i;
    }
    return nextPtr; // fallback: overwrite oldest
  }

  emit(position: THREE.Vector3, impactDir: THREE.Vector3, carColor: number, carVelocity?: THREE.Vector3, count = 35): void {
    const color = new THREE.Color(carColor);
    const vel = carVelocity ?? new THREE.Vector3();
    const speed = vel.length();
    const velDir = speed > 0.01 ? vel.clone().normalize() : new THREE.Vector3();

    // Sparks
    for (let i = 0; i < count; i++) {
      const slot = this.findFreeSlot(this.sparkParticles, this.sparkNext);
      const p = this.sparkParticles[slot];
      p.life = p.maxLife;
      p.x = position.x; p.y = position.y; p.z = position.z;
      p.rx = Math.random() * Math.PI; p.ry = Math.random() * Math.PI;
      p.velocity.set(
        (Math.random() - 0.5) * 52 + impactDir.x * 30 + velDir.x * 0.4 * speed,
        Math.random() * 25 + 8,
        (Math.random() - 0.5) * 52 + impactDir.z * 30 + velDir.z * 0.4 * speed,
      );
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(p.rx, p.ry, 0);
      this.dummy.updateMatrix();
      this.sparks.setMatrixAt(slot, this.dummy.matrix);
      this.sparkNext = (slot + 1) % SPARK_COUNT;
    }
    this.sparks.count = SPARK_COUNT;
    this.sparks.instanceMatrix.needsUpdate = true;

    // Paint chips
    const paintCount = Math.floor(count * 0.7);
    for (let i = 0; i < paintCount; i++) {
      const slot = this.findFreeSlot(this.paintParticles, this.paintNext);
      const p = this.paintParticles[slot];
      p.life = p.maxLife;
      p.x = position.x; p.y = position.y; p.z = position.z;
      p.rx = Math.random() * Math.PI; p.ry = Math.random() * Math.PI;
      p.velocity.set(
        (Math.random() - 0.5) * 18 + impactDir.x * 15 + velDir.x * 0.4 * speed,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 18 + impactDir.z * 15 + velDir.z * 0.4 * speed,
      );
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(p.rx, p.ry, 0);
      this.dummy.updateMatrix();
      this.paintChips.setMatrixAt(slot, this.dummy.matrix);
      this.paintChips.setColorAt(slot, color);
      this.paintNext = (slot + 1) % PAINT_COUNT;
    }
    this.paintChips.count = PAINT_COUNT;
    this.paintChips.instanceMatrix.needsUpdate = true;
    if (this.paintChips.instanceColor) this.paintChips.instanceColor.needsUpdate = true;

    // Shards
    const shardCount = Math.floor(count * 0.4);
    for (let i = 0; i < shardCount; i++) {
      const slot = this.findFreeSlot(this.shardParticles, this.shardNext);
      const p = this.shardParticles[slot];
      p.life = p.maxLife;
      p.x = position.x; p.y = position.y; p.z = position.z;
      p.rx = Math.random() * Math.PI; p.ry = Math.random() * Math.PI;
      p.velocity.set(
        (Math.random() - 0.5) * 12 + impactDir.x * 12 + velDir.x * 0.2 * speed,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * 12 + impactDir.z * 12 + velDir.z * 0.2 * speed,
      );
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(p.rx, p.ry, 0);
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(slot, this.dummy.matrix);
      this.shardNext = (slot + 1) % SHARD_COUNT;
    }
    this.shards.count = SHARD_COUNT;
    this.shards.instanceMatrix.needsUpdate = true;

    // Collision smoke — delegate to TireSmokeSystem (darker, 30% bigger)
    const smokeCount = Math.floor(count * 0.6);
    this.tireSmokeSystem.emitCollisionSmoke(position, smokeCount);
  }

  update(dt: number): void {
    const gravity = -30;
    let sparkDirty = false;
    let paintDirty = false;
    let shardDirty = false;

    // Update sparks — position stored in particle; no decompose needed
    for (let i = 0; i < SPARK_COUNT; i++) {
      const p = this.sparkParticles[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.velocity.y += gravity * dt;
      p.x += p.velocity.x * dt;
      p.y += p.velocity.y * dt;
      p.z += p.velocity.z * dt;
      if (p.life <= 0 || p.y < 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
      } else {
        const fade = p.life / p.maxLife;
        this.dummy.scale.set(fade, fade, fade);
      }
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rx, p.ry, 0);
      this.dummy.updateMatrix();
      this.sparks.setMatrixAt(i, this.dummy.matrix);
      sparkDirty = true;
    }

    // Update paint chips
    for (let i = 0; i < PAINT_COUNT; i++) {
      const p = this.paintParticles[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.velocity.y += gravity * 0.6 * dt;
      p.x += p.velocity.x * dt;
      p.y += p.velocity.y * dt;
      p.z += p.velocity.z * dt;
      if (p.life <= 0 || p.y < 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
      } else {
        const fade = p.life / p.maxLife;
        this.dummy.scale.set(fade, fade, fade);
      }
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rx, p.ry, 0);
      this.dummy.updateMatrix();
      this.paintChips.setMatrixAt(i, this.dummy.matrix);
      paintDirty = true;
    }

    // Update shards
    for (let i = 0; i < SHARD_COUNT; i++) {
      const p = this.shardParticles[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.velocity.y += gravity * 0.4 * dt;
      p.x += p.velocity.x * dt;
      p.y += p.velocity.y * dt;
      p.z += p.velocity.z * dt;
      if (p.life <= 0 || p.y < 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
      } else {
        const fade = p.life / p.maxLife;
        this.dummy.scale.set(fade, fade, fade);
      }
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rx, p.ry, 0);
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(i, this.dummy.matrix);
      shardDirty = true;
    }

    if (sparkDirty) this.sparks.instanceMatrix.needsUpdate = true;
    if (paintDirty) this.paintChips.instanceMatrix.needsUpdate = true;
    if (shardDirty) this.shards.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.sparks.geometry.dispose();
    (this.sparks.material as THREE.Material).dispose();
    this.paintChips.geometry.dispose();
    (this.paintChips.material as THREE.Material).dispose();
    this.shards.geometry.dispose();
    (this.shards.material as THREE.Material).dispose();
  }
}
