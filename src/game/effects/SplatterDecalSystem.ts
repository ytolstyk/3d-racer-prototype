import * as THREE from 'three';
import { DynamicDrawUsage } from 'three';
import type { PlacedSplatter } from '../../types/game.js';
import type { HazardZone } from '../../types/game.js';

const SPLATTER_COLORS: Record<HazardZone['type'], number> = {
  juice:  0xff8800,
  oil:    0x888820,
  milk:   0xaaccff,
  butter: 0xf5d020,
  food:   0x66aa33,
};

const POOL_SIZE = 64;
const FLOOR_Y = 0.07;
const OPACITY = 0.8;

interface SplatterSlot {
  data: PlacedSplatter | null;
  active: boolean;
}

export class SplatterDecalSystem {
  private scene: THREE.Scene;
  private mesh: THREE.InstancedMesh;
  private slots: SplatterSlot[];
  private nextSlot: number;
  private freeSlots: number[];
  private activeCount: number;
  private normalMap: THREE.CanvasTexture;
  private _dummy: THREE.Object3D;
  private _col: THREE.Color;

  constructor(scene: THREE.Scene, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.nextSlot = 0;
    this.activeCount = 0;
    this.freeSlots = Array.from({ length: POOL_SIZE }, (_, i) => POOL_SIZE - 1 - i); // stack: pop gives 0,1,2,...
    this._dummy = new THREE.Object3D();
    this._col = new THREE.Color();

    this.normalMap = this.buildNormalMap();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0,
      metalness: 0.1,
      transparent: true,
      opacity: OPACITY,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      normalMap: this.normalMap,
      vertexColors: true,
      envMap: null,
    });

    const geo = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.InstancedMesh(geo, mat, POOL_SIZE);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;

    // Pre-allocate instance colors (black/invisible)
    const black = new THREE.Color(0x000000);
    for (let i = 0; i < POOL_SIZE; i++) {
      this.mesh.setColorAt(i, black);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    this.slots = Array.from({ length: POOL_SIZE }, () => ({ data: null, active: false }));

    scene.add(this.mesh);
  }

  private buildNormalMap(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const cx = size / 2;
    const cy = size / 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = Math.min(dist, 1.0);
        const tilt = t * t * 0.45; // quadratic falloff, ~26 deg at edge
        const nx = dx * tilt;
        const ny = dy * tilt;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const idx = (y * size + x) * 4;
        data[idx]     = Math.round((nx * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  addSplatter(s: PlacedSplatter): void {
    // O(1) free-slot allocation
    let slotIdx: number;
    if (this.freeSlots.length > 0) {
      slotIdx = this.freeSlots.pop()!;
    } else {
      // Pool full — evict oldest (circular fallback)
      slotIdx = this.nextSlot;
      this.nextSlot = (this.nextSlot + 1) % POOL_SIZE;
      this.activeCount--;
    }

    this._dummy.position.set(s.x, FLOOR_Y, s.z);
    this._dummy.rotation.set(-Math.PI / 2, 0, s.rotation);
    this._dummy.scale.set(s.radius * 2, s.radius * 2, 1);
    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(slotIdx, this._dummy.matrix);

    this._col.set(SPLATTER_COLORS[s.type]);
    this.mesh.setColorAt(slotIdx, this._col);

    this.slots[slotIdx] = { data: s, active: true };
    this.activeCount++;
    this.mesh.count = this.activeCount;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  removeSplatter(dataIdx: number): void {
    let count = 0;
    for (let i = 0; i < POOL_SIZE; i++) {
      if (this.slots[i].active) {
        if (count === dataIdx) {
          // Scale to zero to hide
          this._dummy.position.set(0, FLOOR_Y, 0);
          this._dummy.rotation.set(0, 0, 0);
          this._dummy.scale.set(0, 0, 0);
          this._dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this._dummy.matrix);
          this.slots[i] = { data: null, active: false };
          this.freeSlots.push(i);
          this.activeCount--;
          this.mesh.count = this.activeCount;
          this.mesh.instanceMatrix.needsUpdate = true;
          return;
        }
        count++;
      }
    }
  }

  removeAll(): void {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < POOL_SIZE; i++) {
      this.mesh.setMatrixAt(i, zero);
      this.slots[i] = { data: null, active: false };
    }
    this.freeSlots.length = 0;
    for (let i = POOL_SIZE - 1; i >= 0; i--) this.freeSlots.push(i);
    this.activeCount = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  getSplatters(): PlacedSplatter[] {
    return this.slots.filter(s => s.active).map(s => s.data!);
  }

  update(_dt: number): void {
    // no-op: splatters are permanent
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.MeshStandardMaterial).dispose();
    this.normalMap.dispose();
  }
}
