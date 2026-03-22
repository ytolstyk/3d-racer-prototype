import * as THREE from 'three';

interface Particle {
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

const SPARK_COUNT = 300;
const PAINT_COUNT = 225;
const SHARD_COUNT = 150;
const SMOKE_COUNT = 240;

export class CollisionParticleSystem {
  private sparks: THREE.InstancedMesh;
  private paintChips: THREE.InstancedMesh;
  private shards: THREE.InstancedMesh;
  private smokePuffs: THREE.InstancedMesh;

  private sparkParticles: Particle[] = [];
  private paintParticles: Particle[] = [];
  private shardParticles: Particle[] = [];
  private smokeParticles: Particle[] = [];

  private sparkNext = 0;
  private paintNext = 0;
  private shardNext = 0;
  private smokeNext = 0;

  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    // Sparks — bright yellow planes (larger for visibility)
    const sparkGeo = new THREE.PlaneGeometry(1.5, 1.5);
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

    // Paint chips — colored by car
    const paintGeo = new THREE.PlaneGeometry(0.6, 0.35);
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

    // Shards — dark grey triangles
    const shardGeo = new THREE.BufferGeometry();
    const shardVerts = new Float32Array([0, 0, 0, 0.4, 0, 0, 0.2, 0.5, 0]);
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
      this.sparkParticles.push({ life: 0, maxLife: 0.6, velocity: new THREE.Vector3() });
    }
    for (let i = 0; i < PAINT_COUNT; i++) {
      this.paintParticles.push({ life: 0, maxLife: 1.2, velocity: new THREE.Vector3() });
    }
    for (let i = 0; i < SHARD_COUNT; i++) {
      this.shardParticles.push({ life: 0, maxLife: 1.8, velocity: new THREE.Vector3() });
    }

    // Smoke puffs — flat grey circles, expand and fade over 1.5s
    const smokeGeo = new THREE.CircleGeometry(1.8, 8);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.smokePuffs = new THREE.InstancedMesh(smokeGeo, smokeMat, SMOKE_COUNT);
    this.smokePuffs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.smokePuffs.count = 0;
    this.smokePuffs.frustumCulled = false;
    scene.add(this.smokePuffs);

    // Init particle arrays
    for (let i = 0; i < SMOKE_COUNT; i++) {
      this.smokeParticles.push({ life: 0, maxLife: 1.5, velocity: new THREE.Vector3() });
    }

    // Hide all instances initially
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < SPARK_COUNT; i++) this.sparks.setMatrixAt(i, this.dummy.matrix);
    for (let i = 0; i < PAINT_COUNT; i++) this.paintChips.setMatrixAt(i, this.dummy.matrix);
    for (let i = 0; i < SHARD_COUNT; i++) this.shards.setMatrixAt(i, this.dummy.matrix);
    for (let i = 0; i < SMOKE_COUNT; i++) this.smokePuffs.setMatrixAt(i, this.dummy.matrix);
  }

  emit(position: THREE.Vector3, impactDir: THREE.Vector3, carColor: number, carVelocity?: THREE.Vector3, count = 35): void {
    const color = new THREE.Color(carColor);
    const vel = carVelocity ?? new THREE.Vector3();
    const speed = vel.length();
    const velDir = speed > 0.01 ? vel.clone().normalize() : new THREE.Vector3();

    // Sparks
    for (let i = 0; i < count; i++) {
      const p = this.sparkParticles[this.sparkNext];
      p.life = p.maxLife;
      p.velocity.set(
        (Math.random() - 0.5) * 52 + impactDir.x * 30 + velDir.x * 0.4 * speed,
        Math.random() * 25 + 8,
        (Math.random() - 0.5) * 52 + impactDir.z * 30 + velDir.z * 0.4 * speed,
      );
      this.dummy.position.copy(position);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.dummy.updateMatrix();
      this.sparks.setMatrixAt(this.sparkNext, this.dummy.matrix);
      this.sparkNext = (this.sparkNext + 1) % SPARK_COUNT;
    }
    this.sparks.count = SPARK_COUNT;
    this.sparks.instanceMatrix.needsUpdate = true;

    // Paint chips
    const paintCount = Math.floor(count * 0.7);
    for (let i = 0; i < paintCount; i++) {
      const p = this.paintParticles[this.paintNext];
      p.life = p.maxLife;
      p.velocity.set(
        (Math.random() - 0.5) * 18 + impactDir.x * 15 + velDir.x * 0.4 * speed,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 18 + impactDir.z * 15 + velDir.z * 0.4 * speed,
      );
      this.dummy.position.copy(position);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.dummy.updateMatrix();
      this.paintChips.setMatrixAt(this.paintNext, this.dummy.matrix);
      this.paintChips.setColorAt(this.paintNext, color);
      this.paintNext = (this.paintNext + 1) % PAINT_COUNT;
    }
    this.paintChips.count = PAINT_COUNT;
    this.paintChips.instanceMatrix.needsUpdate = true;
    if (this.paintChips.instanceColor) this.paintChips.instanceColor.needsUpdate = true;

    // Shards
    const shardCount = Math.floor(count * 0.4);
    for (let i = 0; i < shardCount; i++) {
      const p = this.shardParticles[this.shardNext];
      p.life = p.maxLife;
      p.velocity.set(
        (Math.random() - 0.5) * 12 + impactDir.x * 12 + velDir.x * 0.2 * speed,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * 12 + impactDir.z * 12 + velDir.z * 0.2 * speed,
      );
      this.dummy.position.copy(position);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(this.shardNext, this.dummy.matrix);
      this.shardNext = (this.shardNext + 1) % SHARD_COUNT;
    }
    this.shards.count = SHARD_COUNT;
    this.shards.instanceMatrix.needsUpdate = true;

    // Smoke puffs — ~60% of count, slow grey rising puffs
    const smokeCount = Math.floor(count * 0.6);
    for (let i = 0; i < smokeCount; i++) {
      const p = this.smokeParticles[this.smokeNext];
      p.life = p.maxLife;
      p.velocity.set(
        (Math.random() - 0.5) * 6 + velDir.x * 0.1 * speed,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 6 + velDir.z * 0.1 * speed,
      );
      this.dummy.position.copy(position);
      this.dummy.position.x += (Math.random() - 0.5) * 4.5;
      this.dummy.position.z += (Math.random() - 0.5) * 4.5;
      this.dummy.scale.set(0.5, 0.5, 0.5);
      this.dummy.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
      this.dummy.updateMatrix();
      this.smokePuffs.setMatrixAt(this.smokeNext, this.dummy.matrix);
      this.smokeNext = (this.smokeNext + 1) % SMOKE_COUNT;
    }
    this.smokePuffs.count = SMOKE_COUNT;
    this.smokePuffs.instanceMatrix.needsUpdate = true;
  }

  update(dt: number): void {
    const gravity = -30;
    let sparkDirty = false;
    let paintDirty = false;
    let shardDirty = false;
    let smokeDirty = false;

    // Update sparks
    for (let i = 0; i < SPARK_COUNT; i++) {
      const p = this.sparkParticles[i];
      if (p.life <= 0) continue;
      p.life -= dt;

      this.sparks.getMatrixAt(i, this.dummy.matrix);
      this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

      p.velocity.y += gravity * dt;
      this.dummy.position.add(p.velocity.clone().multiplyScalar(dt));

      if (p.life <= 0 || this.dummy.position.y < 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
      } else {
        const fade = p.life / p.maxLife;
        this.dummy.scale.set(fade, fade, fade);
      }
      this.dummy.updateMatrix();
      this.sparks.setMatrixAt(i, this.dummy.matrix);
      sparkDirty = true;
    }

    // Update paint chips
    for (let i = 0; i < PAINT_COUNT; i++) {
      const p = this.paintParticles[i];
      if (p.life <= 0) continue;
      p.life -= dt;

      this.paintChips.getMatrixAt(i, this.dummy.matrix);
      this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

      p.velocity.y += gravity * 0.6 * dt;
      this.dummy.position.add(p.velocity.clone().multiplyScalar(dt));

      if (p.life <= 0 || this.dummy.position.y < 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
      } else {
        const fade = p.life / p.maxLife;
        this.dummy.scale.set(fade, fade, fade);
      }
      this.dummy.updateMatrix();
      this.paintChips.setMatrixAt(i, this.dummy.matrix);
      paintDirty = true;
    }

    // Update shards
    for (let i = 0; i < SHARD_COUNT; i++) {
      const p = this.shardParticles[i];
      if (p.life <= 0) continue;
      p.life -= dt;

      this.shards.getMatrixAt(i, this.dummy.matrix);
      this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

      p.velocity.y += gravity * 0.4 * dt;
      this.dummy.position.add(p.velocity.clone().multiplyScalar(dt));

      if (p.life <= 0 || this.dummy.position.y < 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
      } else {
        const fade = p.life / p.maxLife;
        this.dummy.scale.set(fade, fade, fade);
      }
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(i, this.dummy.matrix);
      shardDirty = true;
    }

    // Update smoke puffs — rise slowly, expand scale 1× → 3×, fade out
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const p = this.smokeParticles[i];
      if (p.life <= 0) continue;
      p.life -= dt;

      this.smokePuffs.getMatrixAt(i, this.dummy.matrix);
      this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

      this.dummy.position.add(p.velocity.clone().multiplyScalar(dt));

      if (p.life <= 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
      } else {
        const progress = 1 - p.life / p.maxLife; // 0→1 as particle ages
        const sz = 0.5 + progress * 2.5; // 0.5 → 3.0
        this.dummy.scale.set(sz, sz, sz);
      }
      this.dummy.updateMatrix();
      this.smokePuffs.setMatrixAt(i, this.dummy.matrix);
      smokeDirty = true;
    }

    if (sparkDirty) this.sparks.instanceMatrix.needsUpdate = true;
    if (paintDirty) this.paintChips.instanceMatrix.needsUpdate = true;
    if (shardDirty) this.shards.instanceMatrix.needsUpdate = true;
    if (smokeDirty) this.smokePuffs.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.sparks.geometry.dispose();
    (this.sparks.material as THREE.Material).dispose();
    this.paintChips.geometry.dispose();
    (this.paintChips.material as THREE.Material).dispose();
    this.shards.geometry.dispose();
    (this.shards.material as THREE.Material).dispose();
    this.smokePuffs.geometry.dispose();
    (this.smokePuffs.material as THREE.Material).dispose();
  }
}
