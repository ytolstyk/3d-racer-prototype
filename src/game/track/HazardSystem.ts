import * as THREE from "three";
import type { TrackDefinition } from "./TrackDefinition.js";
import type { HazardZone, HazardEffect } from "../../types/game.js";
import { HAZARD_EFFECTS } from "../../constants/physics.js";
import {
  makeOilSplatTexture,
  makeJuiceSplatTexture,
  makeFoodSplatTexture,
  makeMilkSplatTexture,
  makeButterSplatTexture,
} from "../scene/ProceduralTextures.js";

export interface HazardEffectWithZone extends HazardEffect {
  zoneType: string;
}

function makeSplatMat(
  texture: THREE.CanvasTexture,
  color: number,
  roughness: number,
  metalness: number,
  opacity = 1,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: texture,
    color,
    transparent: true,
    alphaTest: 0.01,
    depthWrite: false,
    roughness,
    metalness,
    opacity,
  });
}

function hazardMaterials(
  type: HazardZone["type"],
  texture: THREE.CanvasTexture,
  color: number,
) {
  const [rough, metal] = type === "food" ? [0.35, 0.15] : [0.04, 0.55];
  return {
    primary: makeSplatMat(texture, color, rough, metal, 1.2),
    secondary: makeSplatMat(texture, color, rough, metal, 0.85),
  };
}

export interface CircleHazardMeshResult {
  group: THREE.Group;
  alphaData: Uint8ClampedArray;
  alphaSize: number;
}

export function buildCircleHazardMesh(
  type: HazardZone["type"],
  x: number,
  z: number,
  radius: number,
): CircleHazardMeshResult {
  let splatResult: ReturnType<typeof makeJuiceSplatTexture>;
  let color: number;
  switch (type) {
    case "juice":
      splatResult = makeJuiceSplatTexture();
      color = 0xff8800;
      break;
    case "oil":
      splatResult = makeOilSplatTexture();
      color = 0x444400;
      break;
    case "food":
      splatResult = makeFoodSplatTexture();
      color = 0x88cc44;
      break;
    case "milk":
      splatResult = makeMilkSplatTexture();
      color = 0xdde8ff;
      break;
    case "butter":
      splatResult = makeButterSplatTexture();
      color = 0xf5d020;
      break;
  }

  const { texture, alphaData, size: alphaSize } = splatResult;
  const splatSize = radius * 2;
  const mats = hazardMaterials(type, texture, color);

  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const primaryMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(splatSize, splatSize),
    mats.primary,
  );
  primaryMesh.rotation.x = -Math.PI / 2;
  primaryMesh.position.y = 0.075;
  primaryMesh.renderOrder = 1;
  group.add(primaryMesh);

  const secondaryMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(splatSize * 0.7, splatSize * 0.7),
    mats.secondary,
  );
  secondaryMesh.rotation.x = -Math.PI / 2;
  secondaryMesh.rotation.z = Math.PI / 6;
  secondaryMesh.position.y = 0.076;
  secondaryMesh.renderOrder = 1;
  group.add(secondaryMesh);

  const light = new THREE.PointLight(color, 0.6, 25);
  light.position.y = 5;
  group.add(light);

  return { group, alphaData, alphaSize };
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
      position = new THREE.Vector3(zone.centerX, 0, zone.centerZ);
      splatSize = (zone.radius ?? 10) * 2;
      rotationZ = zone.rotation ?? 0;
    } else if (zone.tStart !== undefined && zone.tEnd !== undefined) {
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

    let splatResult: ReturnType<typeof makeJuiceSplatTexture>;
    let color: number;
    switch (zone.type) {
      case "juice":
        splatResult = makeJuiceSplatTexture();
        color = 0xff8800;
        break;
      case "oil":
        splatResult = makeOilSplatTexture();
        color = 0x444400;
        break;
      case "food":
        splatResult = makeFoodSplatTexture();
        color = 0x88cc44;
        break;
      case "milk":
        splatResult = makeMilkSplatTexture();
        color = 0xdde8ff;
        break;
      case "butter":
        splatResult = makeButterSplatTexture();
        color = 0xf5d020;
        break;
    }

    const { texture, alphaData, size: alphaSize } = splatResult;

    // Store pixel-based collision alpha for circle zones
    if (zone.centerX !== undefined && zone.centerZ !== undefined) {
      zone.collisionAlpha = { data: alphaData, size: alphaSize, rotation: rotationZ };
    }

    const mats = hazardMaterials(zone.type, texture, color);

    const group = new THREE.Group();
    group.position.set(position.x, 0, position.z);

    const primaryMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(splatSize, splatSize),
      mats.primary,
    );
    primaryMesh.rotation.x = -Math.PI / 2;
    primaryMesh.rotation.z = rotationZ;
    primaryMesh.position.y = 0.075;
    primaryMesh.renderOrder = 3;
    group.add(primaryMesh);

    const secondaryMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(splatSize * 0.7, splatSize * 0.7),
      mats.secondary,
    );
    secondaryMesh.rotation.x = -Math.PI / 2;
    secondaryMesh.rotation.z = rotationZ + Math.PI / 6;
    secondaryMesh.position.y = 0.076;
    secondaryMesh.renderOrder = 3;
    group.add(secondaryMesh);

    const light = new THREE.PointLight(color, 0.6, 25);
    light.position.y = 5;
    group.add(light);

    return group;
  }

  getEffect(
    carPosition: THREE.Vector3,
    carT: number,
  ): HazardEffectWithZone | null {
    for (const zone of this.zones) {
      const base = HAZARD_EFFECTS[zone.type];

      if (
        zone.centerX !== undefined &&
        zone.centerZ !== undefined &&
        zone.radius !== undefined
      ) {
        const dx = carPosition.x - zone.centerX;
        const dz = carPosition.z - zone.centerZ;
        const alpha = zone.collisionAlpha;
        if (alpha) {
          const rot = -(alpha.rotation);
          const rx = dx * Math.cos(rot) - dz * Math.sin(rot);
          const rz = dx * Math.sin(rot) + dz * Math.cos(rot);
          const u = rx / (zone.radius * 2) + 0.5;
          const v = 0.5 - rz / (zone.radius * 2);
          if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
            const s = alpha.size;
            const px = Math.floor(u * s);
            const py = Math.floor(v * s);
            if (alpha.data[(py * s + px) * 4 + 3] > 32) {
              return { ...base, zoneType: zone.type };
            }
          }
        } else if (Math.sqrt(dx * dx + dz * dz) <= zone.radius) {
          return { ...base, zoneType: zone.type };
        }
        continue;
      }

      if (zone.tStart === undefined || zone.tEnd === undefined) continue;

      let inRange = false;
      if (zone.tStart <= zone.tEnd) {
        inRange = carT >= zone.tStart && carT <= zone.tEnd;
      } else {
        inRange = carT >= zone.tStart || carT <= zone.tEnd;
      }

      if (!inRange) continue;

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
