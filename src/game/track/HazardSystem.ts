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
      const zoneGroup = this.createHazardGroup(zone);
      if (zoneGroup) {
        group.add(zoneGroup);
        zone.mesh = zoneGroup;
      }
    }

    return group;
  }

  private createHazardGroup(zone: HazardZone): THREE.Group | null {
    let position: THREE.Vector3;
    let splatSize: number;
    let rotationZ = 0;

    if (zone.centerX !== undefined && zone.centerZ !== undefined) {
      // Circle format — absolute position
      position = new THREE.Vector3(zone.centerX, 0, zone.centerZ);
      splatSize = (zone.radius ?? 10) * 2;
    } else if (zone.tStart !== undefined && zone.tEnd !== undefined) {
      // Legacy t-range format
      const tMid = (zone.tStart + zone.tEnd) / 2;
      const center = this.track.getPointAt(tMid);
      const normal = this.track.getNormalAt(tMid);
      const offset = normal.clone().multiplyScalar(zone.lateralOffset ?? 0);
      position = center.clone().add(offset);

      const length = this.track.getLength() * (zone.tEnd - zone.tStart);
      splatSize = Math.max(zone.width ?? 10, length) * 1.2;

      const tangent = this.track.getTangentAt(tMid);
      rotationZ = -Math.atan2(tangent.x, tangent.z);
    } else {
      return null;
    }

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

    const group = new THREE.Group();
    group.position.set(position.x, 0, position.z);

    // Primary splat
    const primaryMat = new THREE.MeshStandardMaterial({
      map: texture,
      color,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      roughness: 0.7,
      emissive: color,
      emissiveIntensity: 0.12,
    });
    const primaryMesh = new THREE.Mesh(new THREE.PlaneGeometry(splatSize, splatSize), primaryMat);
    primaryMesh.rotation.x = -Math.PI / 2;
    primaryMesh.rotation.z = rotationZ;
    primaryMesh.position.y = 0.07;
    group.add(primaryMesh);

    // Secondary splat layer — smaller, slightly offset, 30° rotation
    const secondaryMat = new THREE.MeshStandardMaterial({
      map: texture,
      color,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      roughness: 0.7,
      opacity: 0.4,
    });
    const secondaryMesh = new THREE.Mesh(new THREE.PlaneGeometry(splatSize * 0.7, splatSize * 0.7), secondaryMat);
    secondaryMesh.rotation.x = -Math.PI / 2;
    secondaryMesh.rotation.z = rotationZ + Math.PI / 6;
    secondaryMesh.position.y = 0.08;
    group.add(secondaryMesh);

    // Point light above hazard for glow effect
    const light = new THREE.PointLight(color, 0.6, 25);
    light.position.y = 5;
    group.add(light);

    return group;
  }

  getEffect(carPosition: THREE.Vector3, carT: number): HazardEffectWithZone | null {
    for (const zone of this.zones) {
      const base = HAZARD_EFFECTS[zone.type];

      // Circle format
      if (zone.centerX !== undefined && zone.centerZ !== undefined && zone.radius !== undefined) {
        const dx = carPosition.x - zone.centerX;
        const dz = carPosition.z - zone.centerZ;
        if (Math.sqrt(dx * dx + dz * dz) <= zone.radius) {
          return { ...base, zoneType: zone.type };
        }
        continue;
      }

      // Legacy t-range format
      if (zone.tStart === undefined || zone.tEnd === undefined) continue;

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
      const hazardCenter = zone.lateralOffset ?? 0;
      const halfWidth = (zone.width ?? 10) / 2;

      if (Math.abs(lateralDist - hazardCenter) <= halfWidth) {
        return { ...base, zoneType: zone.type };
      }
    }

    return null;
  }
}
