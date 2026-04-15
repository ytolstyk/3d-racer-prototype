import * as THREE from 'three';
import type { CarState, RainZone } from '../../types/game.js';
import type { TrackDefinition } from '../track/TrackDefinition.js';
import { RAIN_HAZARD } from '../../constants/effects.js';

interface RainDrop {
  active: boolean;
  phase: 'shadow' | 'falling' | 'done';
  timer: number;
  x: number;
  z: number;
  shadowIdx: number;
  dropIdx: number;
}

interface SplineZone {
  kind: 'spline';
  tStart: number;
  tEnd: number;
  track: TrackDefinition;
}

interface CircleZone {
  kind: 'circle';
  x: number;
  z: number;
  radius: number;
}

type Zone = SplineZone | CircleZone;

export class RainHazardSystem {
  private scene: THREE.Scene;
  private zones: Zone[] = [];
  private drops: RainDrop[][] = []; // per zone
  private spawnTimers: number[] = [];

  private shadowMesh: THREE.InstancedMesh;
  private dropMesh: THREE.InstancedMesh;
  private totalSlots: number;
  private dummy = new THREE.Object3D();

  private nextShadowSlot = 0;
  private nextDropSlot = 0;

  constructor(scene: THREE.Scene, maxTotalDrops = 100) {
    this.scene = scene;
    this.totalSlots = maxTotalDrops;

    // Shadow circles on ground
    const shadowGeo = new THREE.CircleGeometry(1, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: RAIN_HAZARD.shadowColor,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.InstancedMesh(shadowGeo, shadowMat, maxTotalDrops);
    this.shadowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shadowMesh.frustumCulled = false;
    this.shadowMesh.renderOrder = 2;
    scene.add(this.shadowMesh);

    // Drop spheres
    const dropGeo = new THREE.SphereGeometry(1.5, 8, 6);
    const dropMat = new THREE.MeshStandardMaterial({
      color: RAIN_HAZARD.dropColor,
      transparent: true,
      opacity: 0.7,
      roughness: 0.2,
      metalness: 0.3,
    });
    this.dropMesh = new THREE.InstancedMesh(dropGeo, dropMat, maxTotalDrops);
    this.dropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dropMesh.frustumCulled = false;
    scene.add(this.dropMesh);

    // Hide all initially
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < maxTotalDrops; i++) {
      this.shadowMesh.setMatrixAt(i, this.dummy.matrix);
      this.dropMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.shadowMesh.instanceMatrix.needsUpdate = true;
    this.dropMesh.instanceMatrix.needsUpdate = true;
  }

  addSplineZone(track: TrackDefinition, zone: RainZone): void {
    this.zones.push({ kind: 'spline', tStart: zone.tStart, tEnd: zone.tEnd, track });
    this.drops.push([]);
    this.spawnTimers.push(0);
  }

  addCircleZone(x: number, z: number, radius: number): void {
    this.zones.push({ kind: 'circle', x, z, radius });
    this.drops.push([]);
    this.spawnTimers.push(0);
  }

  private getRandomPosition(zone: Zone): { x: number; z: number } {
    if (zone.kind === 'circle') {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * zone.radius;
      return { x: zone.x + Math.cos(angle) * r, z: zone.z + Math.sin(angle) * r };
    }
    // Spline zone: random t within range, random lateral offset
    const t = zone.tStart + Math.random() * (zone.tEnd - zone.tStart);
    const center = zone.track.getPointAt(t);
    const normal = zone.track.getNormalAt(t);
    const lateralOffset = (Math.random() - 0.5) * zone.track.width;
    return {
      x: center.x + normal.x * lateralOffset,
      z: center.z + normal.z * lateralOffset,
    };
  }

  private allocShadowSlot(): number {
    const slot = this.nextShadowSlot;
    this.nextShadowSlot = (this.nextShadowSlot + 1) % this.totalSlots;
    return slot;
  }

  private allocDropSlot(): number {
    const slot = this.nextDropSlot;
    this.nextDropSlot = (this.nextDropSlot + 1) % this.totalSlots;
    return slot;
  }

  update(dt: number, cars: CarState[]): void {
    let shadowDirty = false;
    let dropDirty = false;

    for (let zi = 0; zi < this.zones.length; zi++) {
      const zone = this.zones[zi];
      const zoneDrops = this.drops[zi];

      // Spawn new drops
      this.spawnTimers[zi] -= dt;
      if (this.spawnTimers[zi] <= 0 && zoneDrops.length < RAIN_HAZARD.maxActiveDrops) {
        this.spawnTimers[zi] = RAIN_HAZARD.dropInterval;
        const pos = this.getRandomPosition(zone);
        const drop: RainDrop = {
          active: true,
          phase: 'shadow',
          timer: RAIN_HAZARD.shadowGrowDuration,
          x: pos.x,
          z: pos.z,
          shadowIdx: this.allocShadowSlot(),
          dropIdx: this.allocDropSlot(),
        };
        zoneDrops.push(drop);
      }

      // Update existing drops
      for (let di = zoneDrops.length - 1; di >= 0; di--) {
        const drop = zoneDrops[di];
        if (!drop.active) continue;
        drop.timer -= dt;

        if (drop.phase === 'shadow') {
          // Growing shadow
          const progress = 1 - drop.timer / RAIN_HAZARD.shadowGrowDuration;
          const radius = RAIN_HAZARD.maxShadowRadius * progress;
          this.dummy.position.set(drop.x, 0.08, drop.z);
          this.dummy.scale.set(radius, 1, radius);
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.updateMatrix();
          this.shadowMesh.setMatrixAt(drop.shadowIdx, this.dummy.matrix);
          shadowDirty = true;

          if (drop.timer <= 0) {
            drop.phase = 'falling';
            drop.timer = RAIN_HAZARD.dropFallDuration;
          }
        } else if (drop.phase === 'falling') {
          // Falling sphere
          const fallProgress = 1 - drop.timer / RAIN_HAZARD.dropFallDuration;
          const y = RAIN_HAZARD.dropHeight * (1 - fallProgress);
          this.dummy.position.set(drop.x, y, drop.z);
          this.dummy.scale.set(1, 1, 1);
          this.dummy.updateMatrix();
          this.dropMesh.setMatrixAt(drop.dropIdx, this.dummy.matrix);
          dropDirty = true;

          if (drop.timer <= 0) {
            // Impact!
            drop.phase = 'done';
            drop.active = false;

            // Hide meshes
            this.dummy.scale.set(0, 0, 0);
            this.dummy.updateMatrix();
            this.shadowMesh.setMatrixAt(drop.shadowIdx, this.dummy.matrix);
            this.dropMesh.setMatrixAt(drop.dropIdx, this.dummy.matrix);
            shadowDirty = true;
            dropDirty = true;

            // Check car hit
            for (const car of cars) {
              const dx = car.position.x - drop.x;
              const dz = car.position.z - drop.z;
              if (dx * dx + dz * dz < RAIN_HAZARD.maxShadowRadius * RAIN_HAZARD.maxShadowRadius) {
                // Slow down
                car.speed *= RAIN_HAZARD.slowFactor;
                // Random push
                const pushAngle = Math.random() * Math.PI * 2;
                car.position.x += Math.cos(pushAngle) * RAIN_HAZARD.pushForce;
                car.position.z += Math.sin(pushAngle) * RAIN_HAZARD.pushForce;
                // Random rotation deviation
                const deviation = (RAIN_HAZARD.angleDeviationMin +
                  Math.random() * (RAIN_HAZARD.angleDeviationMax - RAIN_HAZARD.angleDeviationMin)) *
                  (Math.PI / 180) * (Math.random() > 0.5 ? 1 : -1);
                car.rotation += deviation;
                car.velocityAngle += deviation * 0.5;
                // Sync mesh
                car.mesh.position.copy(car.position);
                car.mesh.rotation.y = car.rotation;
              }
            }

            // Remove from list
            zoneDrops.splice(di, 1);
          }
        }
      }
    }

    if (shadowDirty) this.shadowMesh.instanceMatrix.needsUpdate = true;
    if (dropDirty) this.dropMesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.shadowMesh.geometry.dispose();
    (this.shadowMesh.material as THREE.Material).dispose();
    this.dropMesh.geometry.dispose();
    (this.dropMesh.material as THREE.Material).dispose();
    this.scene.remove(this.shadowMesh);
    this.scene.remove(this.dropMesh);
  }
}
