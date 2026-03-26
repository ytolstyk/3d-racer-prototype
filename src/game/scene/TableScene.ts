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

    // Wooden table surface
    const tableGeo = new THREE.PlaneGeometry(1200, 900);
    const tableMat = new THREE.MeshStandardMaterial({
      map: colorMap,
      normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap,
      roughness: 1.0,
      metalness: 0.0,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.set(0, -0.02, 0);
    table.receiveShadow = true;
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
