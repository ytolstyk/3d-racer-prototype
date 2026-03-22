import * as THREE from 'three';
import type { CarState } from '../../types/game.js';

interface SmokeParticle {
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

const PARTICLE_COUNT = 400;
const EMIT_INTERVAL = 1 / 20; // 20fps emit rate

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
  varying float vOpacity;
  varying vec2 vUv;

  void main() {
    vOpacity = aOpacity;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  varying float vOpacity;
  varying vec2 vUv;

  void main() {
    vec4 texColor = texture2D(map, vUv);
    gl_FragColor = vec4(0.7, 0.7, 0.7, texColor.a * vOpacity);
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

  constructor(scene: THREE.Scene) {
    const geo = new THREE.CircleGeometry(1.0, 8);

    const opacityData = new Float32Array(PARTICLE_COUNT);
    this.opacityAttr = new THREE.InstancedBufferAttribute(opacityData, 1);
    this.opacityAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aOpacity', this.opacityAttr);

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
    scene.add(this.mesh);

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

  private emitOne(x: number, y: number, z: number): void {
    const p = this.particles[this.nextParticle];
    p.life = p.maxLife;
    p.velocity.set(
      (Math.random() - 0.5) * 2,
      1.5 + Math.random() * 1.5,
      (Math.random() - 0.5) * 2,
    );
    this.dummy.position.set(x + (Math.random() - 0.5) * 2, 0.3, z + (Math.random() - 0.5) * 2);
    this.dummy.scale.set(0.3, 0.3, 0.3);
    this.dummy.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.nextParticle, this.dummy.matrix);
    this.opacityAttr.setX(this.nextParticle, 0.45);
    this.nextParticle = (this.nextParticle + 1) % PARTICLE_COUNT;
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

    // Lateral offset for left/right tire
    const lateralX = cosR * 1.5;
    const lateralZ = -sinR * 1.5;
    this.emitOne(rearX - lateralX, 0.3, rearZ - lateralZ);
    this.emitOne(rearX + lateralX, 0.3, rearZ + lateralZ);
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
        this.opacityAttr.setX(i, 0);
      } else {
        const progress = 1 - p.life / p.maxLife;
        const sz = 0.3 + progress * 2.2;
        this.dummy.scale.set(sz, sz, sz);

        // Fade out over last 40% of lifetime
        const fadeStart = 0.4;
        const fadeProgress = progress > (1 - fadeStart) ? (progress - (1 - fadeStart)) / fadeStart : 0;
        const opacity = 0.45 * (1 - fadeProgress);
        this.opacityAttr.setX(i, opacity);
      }

      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      dirty = true;
    }

    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.opacityAttr.needsUpdate = true;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
