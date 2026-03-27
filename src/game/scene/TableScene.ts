import * as THREE from "three";
import { makeFloorTileTexture } from "./ProceduralTextures.js";

export class TableScene {
  build(): THREE.Group {
    const group = new THREE.Group();

    const loader = new THREE.TextureLoader();

    const colorMap = loader.load("/wood_color.jpg");
    const normalMap = loader.load("/wood_normal.jpg");
    const roughnessMap = loader.load("/wood_roughness.jpg");

    // Tile the wood texture across the large surface
    const tilesX = 4;
    const tilesY = 3;
    for (const tex of [colorMap, normalMap, roughnessMap]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(tilesX, tilesY);
    }
    colorMap.colorSpace = THREE.SRGBColorSpace;

    // Wooden table surface (with thickness so edges are visible)
    const TABLE_THICKNESS = 20;
    const TABLE_W = 1200;
    const TABLE_D = 900;

    // Top face: tiled wood grain
    const topMat = new THREE.MeshStandardMaterial({
      map: colorMap,
      normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap,
      roughness: 1.0,
      metalness: 0.0,
    });

    // Side/bottom faces: same wood but scaled to show a single plank width
    const sideColorMap = loader.load("/wood_color.jpg");
    const sideNormalMap = loader.load("/wood_normal.jpg");
    const sideRoughnessMap = loader.load("/wood_roughness.jpg");
    for (const tex of [sideColorMap, sideNormalMap, sideRoughnessMap]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    sideColorMap.colorSpace = THREE.SRGBColorSpace;
    // Scale edge texture so grain runs along the long dimension
    sideColorMap.repeat.set(12, 1);
    sideNormalMap.repeat.set(12, 1);
    sideRoughnessMap.repeat.set(12, 1);
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideColorMap,
      normalMap: sideNormalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: sideRoughnessMap,
      roughness: 1.0,
      metalness: 0.0,
    });

    // BoxGeometry face order: +X, -X, +Y (top), -Y (bottom), +Z, -Z
    const tableGeo = new THREE.BoxGeometry(TABLE_W, TABLE_THICKNESS, TABLE_D);
    const table = new THREE.Mesh(tableGeo, [
      sideMat, // +X right edge
      sideMat, // -X left edge
      topMat,  // +Y top surface
      sideMat, // -Y bottom
      sideMat, // +Z front edge
      sideMat, // -Z back edge
    ]);
    // Keep top surface at y≈0; center box so top face aligns with original position
    table.position.set(0, -TABLE_THICKNESS / 2 - 0.02, 0);
    table.receiveShadow = true;
    table.castShadow = true;
    group.add(table);

    // Floor below table — tiled blue/white polished surface
    const floorTex = makeFloorTileTexture();
    floorTex.repeat.set(40, 40);
    const floorGeo = new THREE.PlaneGeometry(8000, 8000);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.3,
      metalness: 0.05,
      emissive: new THREE.Color(0x0a1525),
      emissiveIntensity: 1.0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -48, 0);
    floor.receiveShadow = true;
    group.add(floor);

    return group;
  }
}
