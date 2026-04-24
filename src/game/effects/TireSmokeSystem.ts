import * as THREE from 'three';
import type { CarState } from '../../types/game.js';
import { TIRE_SMOKE } from '../../constants/effects.js';

interface SmokeParticle {
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
  isDark: boolean;
  x: number;
  y: number;
  z: number;
  rz: number; // rotation.z — rotation is always (-π/2, 0, rz)
}

const PARTICLE_COUNT = TIRE_SMOKE.poolSize;
const EMIT_INTERVAL = TIRE_SMOKE.emitRate;

function makeSmokeTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(200,200,200,0.6)');
  grad.addColorStop(1, 'rgba(160,160,160,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const vertexShader = /* glsl */ `
  attribute float aOpacity;
  attribute float aDark;
  varying float vOpacity;
  varying float vDark;
  varying vec2 vUv;

  void main() {
    vOpacity = aOpacity;
    vDark = aDark;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  varying float vOpacity;
  varying float vDark;
  varying vec2 vUv;

  void main() {
    vec4 texColor = texture2D(map, vUv);
    vec3 color = mix(vec3(0.7), vec3(0.25), vDark);
    gl_FragColor = vec4(color, texColor.a * vOpacity);
    if (gl_FragColor.a < 0.01) discard;
  }
`;

export class TireSmokeSystem {
  private mesh: THREE.InstancedMesh;
  private particles: SmokeParticle[] = [];
  private nextParticle = 0;
  private dummy = new THREE.Object3D();
  private carTimers = new Map<string, number>();
  private opacityAttr: THREE.InstancedBufferAttribute;
  private aDarkAttr: THREE.InstancedBufferAttribute;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.CircleGeometry(1.0, 8);

    const opacityData = new Float32Array(PARTICLE_COUNT);
    this.opacityAttr = new THREE.InstancedBufferAttribute(opacityData, 1);
    this.opacityAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aOpacity', this.opacityAttr);

    const darkData = new Float32Array(PARTICLE_COUNT);
    this.aDarkAttr = new THREE.InstancedBufferAttribute(darkData, 1);
    this.aDarkAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aDark', this.aDarkAttr);

    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: makeSmokeTexture() } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = PARTICLE_COUNT;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    scene.add(this.mesh);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({ life: 0, maxLife: 1.5, velocity: new THREE.Vector3(), isDark: false, x: 0, y: 0, z: 0, rz: 0 });
    }

    // Hide all initially
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private findFreeSlot(): number {
    const n = this.particles.length;
    for (let offset = 0; offset < n; offset++) {
      const i = (this.nextParticle + offset) % n;
      if (this.particles[i].life <= 0) return i;
    }
    return this.nextParticle;
  }

  private emitOne(x: number, _y: number, z: number): void {
    const idx = this.findFreeSlot();
    const p = this.particles[idx];
    p.life = p.maxLife;
    p.isDark = false;
    p.x = x + (Math.random() - 0.5) * 2;
    p.y = 0.3;
    p.z = z + (Math.random() - 0.5) * 2;
    p.rz = Math.random() * Math.PI * 2;
    p.velocity.set(
      (Math.random() - 0.5) * 2,
      1.5 + Math.random() * 1.5,
      (Math.random() - 0.5) * 2,
    );
    this.dummy.position.set(p.x, p.y, p.z);
    this.dummy.scale.set(0.3, 0.3, 0.3);
    this.dummy.rotation.set(-Math.PI / 2, 0, p.rz);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(idx, this.dummy.matrix);
    this.opacityAttr.setX(idx, 0.45);
    this.aDarkAttr.setX(idx, 0);
    this.nextParticle = (idx + 1) % PARTICLE_COUNT;
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

    const sinR = Math.sin(car.rotation);
    const cosR = Math.cos(car.rotation);
    const rearX = car.position.x - sinR * 3;
    const rearZ = car.position.z - cosR * 3;

    const lateralX = cosR * 1.5;
    const lateralZ = -sinR * 1.5;

    // Emit multiple particles per tire for denser smoke
    for (let p = 0; p < TIRE_SMOKE.particlesPerEmit; p++) {
      const offset = p === 0 ? 0 : (Math.random() - 0.5) * 1.5;
      this.emitOne(rearX - lateralX + cosR * offset, 0.3, rearZ - lateralZ - sinR * offset);
      this.emitOne(rearX + lateralX + cosR * offset, 0.3, rearZ + lateralZ - sinR * offset);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.opacityAttr.needsUpdate = true;
    this.aDarkAttr.needsUpdate = true;
  }

  emitCollisionSmoke(position: THREE.Vector3, count = 3): void {
    for (let i = 0; i < count; i++) {
      const idx = this.findFreeSlot();
      const p = this.particles[idx];
      p.life = p.maxLife;
      p.isDark = true;
      p.velocity.set(
        (Math.random() - 0.5) * 6,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 6,
      );
      p.x = position.x + (Math.random() - 0.5) * 4.5;
      p.y = 0.3;
      p.z = position.z + (Math.random() - 0.5) * 4.5;
      p.rz = Math.random() * Math.PI * 2;
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.set(0.39, 0.39, 0.39);
      this.dummy.rotation.set(-Math.PI / 2, 0, p.rz);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      this.opacityAttr.setX(idx, 0.45);
      this.aDarkAttr.setX(idx, 1.0);
      this.nextParticle = (idx + 1) % PARTICLE_COUNT;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.opacityAttr.needsUpdate = true;
    this.aDarkAttr.needsUpdate = true;
  }

  update(dt: number): void {
    let dirty = false;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      p.life -= dt;

      // Update stored position — no decompose needed
      p.x += p.velocity.x * dt;
      p.y += p.velocity.y * dt;
      p.z += p.velocity.z * dt;

      if (p.life <= 0) {
        this.dummy.scale.set(0, 0, 0);
        p.life = 0;
        p.isDark = false;
        this.opacityAttr.setX(i, 0);
        this.aDarkAttr.setX(i, 0);
      } else {
        const progress = 1 - p.life / p.maxLife;
        // Dark (collision) smoke: 30% bigger — 0.39 → 3.25; regular: 0.3 → 2.5
        const sz = p.isDark
          ? 0.39 + progress * 2.86
          : 0.3 + progress * 2.2;
        this.dummy.scale.set(sz, sz, sz);

        // Fade out over last 40% of lifetime
        const fadeStart = 0.4;
        const fadeProgress = progress > (1 - fadeStart) ? (progress - (1 - fadeStart)) / fadeStart : 0;
        const opacity = 0.45 * (1 - fadeProgress);
        this.opacityAttr.setX(i, opacity);
      }

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(-Math.PI / 2, 0, p.rz);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      dirty = true;
    }

    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.opacityAttr.needsUpdate = true;
      this.aDarkAttr.needsUpdate = true;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
