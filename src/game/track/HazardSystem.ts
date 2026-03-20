import * as THREE from 'three';
import type { TrackDefinition } from './TrackDefinition.js';
import type { HazardZone, HazardEffect } from '../../types/game.js';
import { HAZARD_EFFECTS } from '../../constants/physics.js';
import { makeOilSplatTexture, makeJuiceSplatTexture, makeFoodSplatTexture, makeMilkSplatTexture, makeButterSplatTexture } from '../scene/ProceduralTextures.js';

export interface HazardEffectWithZone extends HazardEffect {
  zoneType: string;
}

export class HazardSystem {
  private zones: HazardZone[];
  private track: TrackDefinition;

  constructor(track: TrackDefinition) {
    this.track = track;
    this.zones = track.hazardZones;
  }

  buildMeshes(): THREE.Group {
    const group = new THREE.Group();

    for (const zone of this.zones) {
      const mesh = this.createHazardMesh(zone);
      if (mesh) {
        group.add(mesh);
        zone.mesh = mesh;
      }
    }

    return group;
  }

  private createHazardMesh(zone: HazardZone): THREE.Mesh {
    const tMid = (zone.tStart + zone.tEnd) / 2;
    const center = this.track.getPointAt(tMid);
    const normal = this.track.getNormalAt(tMid);
    const offset = normal.clone().multiplyScalar(zone.lateralOffset);
    const position = center.clone().add(offset);

    const length = this.track.getLength() * (zone.tEnd - zone.tStart);
    const splatSize = Math.max(zone.width, length) * 1.2;
    const geometry = new THREE.PlaneGeometry(splatSize, splatSize);

    let texture: THREE.CanvasTexture;
    let color: number;
    switch (zone.type) {
      case 'juice':
        texture = makeJuiceSplatTexture();
        color = 0xff8800;
        break;
      case 'oil':
        texture = makeOilSplatTexture();
        color = 0x444400;
        break;
      case 'food':
        texture = makeFoodSplatTexture();
        color = 0x88cc44;
        break;
      case 'milk':
        texture = makeMilkSplatTexture();
        color = 0xdde8ff;
        break;
      case 'butter':
        texture = makeButterSplatTexture();
        color = 0xf5d020;
        break;
    }

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      roughness: 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.07, position.z);

    const tangent = this.track.getTangentAt(tMid);
    const angle = Math.atan2(tangent.x, tangent.z);
    mesh.rotation.z = -angle;

    return mesh;
  }

  getEffect(carPosition: THREE.Vector3, carT: number): HazardEffectWithZone | null {
    for (const zone of this.zones) {
      // Check t range (handle wrapping)
      let inRange = false;
      if (zone.tStart <= zone.tEnd) {
        inRange = carT >= zone.tStart && carT <= zone.tEnd;
      } else {
        inRange = carT >= zone.tStart || carT <= zone.tEnd;
      }

      if (!inRange) continue;

      // Check lateral distance
      const center = this.track.getPointAt(carT);
      const normal = this.track.getNormalAt(carT);
      const tocar = new THREE.Vector3().subVectors(carPosition, center);
      const lateralDist = tocar.dot(normal);
      const hazardCenter = zone.lateralOffset;
      const halfWidth = zone.width / 2;

      if (Math.abs(lateralDist - hazardCenter) <= halfWidth) {
        const base = HAZARD_EFFECTS[zone.type];
        return { ...base, zoneType: zone.type };
      }
    }

    return null;
  }
}
