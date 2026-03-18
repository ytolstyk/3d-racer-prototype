import * as THREE from 'three';
import type { CarState } from '../../types/game.js';

interface SmokeParticle {
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

const PARTICLE_COUNT = 150;
const EMIT_INTERVAL = 1 / 20; // 20fps emit rate

export class TireSmokeSystem {
  private mesh: THREE.InstancedMesh;
  private particles: SmokeParticle[] = [];
  private nextParticle = 0;
  private dummy = new THREE.Object3D();
  private carTimers = new Map<string, number>();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.CircleGeometry(1.0, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x999999,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = PARTICLE_COUNT;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // Init particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({ life: 0, maxLife: 1.5, velocity: new THREE.Vector3() });
    }

    // Hide all initially
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  emitForCar(car: CarState, dt: number): void {
    if (!car.isSkidding) return;

    const prev = this.carTimers.get(car.id) ?? EMIT_INTERVAL;
    const next = prev - dt;
    if (next > 0) {
      this.carTimers.set(car.id, next);
      return;
    }
    this.carTimers.set(car.id, EMIT_INTERVAL);

    // Rear axle position — 3 units behind car center
    const sinR = Math.sin(car.rotation);
    const cosR = Math.cos(car.rotation);
    const rearX = car.position.x - sinR * 3;
    const rearZ = car.position.z - cosR * 3;

    const p = this.particles[this.nextParticle];
    p.life = p.maxLife;
    p.velocity.set(
      (Math.random() - 0.5) * 2,
      1.5 + Math.random() * 1.5,
      (Math.random() - 0.5) * 2,
    );

    this.dummy.position.set(rearX + (Math.random() - 0.5) * 2, 0.3, rearZ + (Math.random() - 0.5) * 2);
    this.dummy.scale.set(0.3, 0.3, 0.3);
    this.dummy.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.nextParticle, this.dummy.matrix);
    this.nextParticle = (this.nextParticle + 1) % PARTICLE_COUNT;
  }

  update(dt: number): void {
    let dirty = false;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      p.life -= dt;

      this.mesh.getMatrixAt(i, this.dummy.matrix);
      this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

      this.dummy.position.add(p.velocity.clone().multiplyScalar(dt));

      if (p.life <= 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
      } else {
        const progress = 1 - p.life / p.maxLife;
        const sz = 0.3 + progress * 2.2; // expand 0.3 → 2.5
        this.dummy.scale.set(sz, sz, sz);
      }

      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      dirty = true;
    }

    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
