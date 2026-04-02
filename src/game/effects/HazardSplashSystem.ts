import * as THREE from "three";

const SPLASH_COUNT = 400;

interface SplashParticle {
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
}

export class HazardSplashSystem {
  private mesh: THREE.InstancedMesh;
  private particles: SplashParticle[];
  private nextIndex = 0;
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, SPLASH_COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(SPLASH_COUNT * 3),
      3,
    );
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.particles = Array.from({ length: SPLASH_COUNT }, () => ({
      life: 0,
      maxLife: 0.7,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 1,
    }));

    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < SPLASH_COUNT; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * @param carSpeed  current car speed (game units/s)
   * @param maxSpeed  car's max speed — used to compute a 0–1 speed ratio
   * @param count     number of particles to emit
   */
  emit(
    position: THREE.Vector3,
    color: number,
    carSpeed = 0,
    maxSpeed = 1,
    count = 55,
  ): void {
    const baseColor = new THREE.Color(color);
    const speedRatio = Math.min(1, Math.abs(carSpeed) / Math.max(1, maxSpeed));

    const lateralBase = 6 + speedRatio * 55;
    const upBase = 10 + speedRatio * 22;
    const lifetime = 0.5 + speedRatio * 0.5;

    for (let i = 0; i < count; i++) {
      const idx = this.nextIndex;
      this.nextIndex = (this.nextIndex + 1) % SPLASH_COUNT;
      const p = this.particles[idx];
      p.life = lifetime * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.size = 0.8 + Math.random() * 1.2 + speedRatio * 1.2;
      const angle = Math.random() * Math.PI * 2;
      const hspeed = lateralBase * (0.4 + Math.random() * 0.6);
      p.vx = Math.cos(angle) * hspeed;
      p.vy = upBase * (0.5 + Math.random() * 0.5);
      p.vz = Math.sin(angle) * hspeed;
      this.dummy.position.copy(position);
      this.dummy.position.y += 1;
      this.dummy.scale.setScalar(p.size);
      this.dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        0,
      );
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);

      // Per-particle color: hue ±5%, lightness ±5%, then dim by opacity factor 90–100%
      const c = baseColor.clone();
      c.offsetHSL(
        (Math.random() - 0.5) * 0.05,
        0,
        (Math.random() - 0.5) * 0.05,
      );
      c.multiplyScalar(0.9 + Math.random() * 0.05);
      this.mesh.setColorAt(idx, c);
    }
    if (this.mesh.count < SPLASH_COUNT) this.mesh.count = SPLASH_COUNT;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    const gravity = -28;
    let dirty = false;
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      this.mesh.getMatrixAt(i, this.dummy.matrix);
      this.dummy.matrix.decompose(
        this.dummy.position,
        this.dummy.quaternion,
        this.dummy.scale,
      );
      p.vy += gravity * dt;
      this.dummy.position.x += p.vx * dt;
      this.dummy.position.y += p.vy * dt;
      this.dummy.position.z += p.vz * dt;
      if (p.life <= 0 || this.dummy.position.y < 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
      } else {
        const fade = p.life / p.maxLife;
        this.dummy.scale.setScalar(p.size * fade);
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
