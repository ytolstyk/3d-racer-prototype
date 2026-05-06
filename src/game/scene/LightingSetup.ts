import * as THREE from 'three';
import { HEMI_LIGHT, SUN_LIGHT, FILL_LIGHT } from '../../constants/lighting.js';

export class LightingSetup {
  setup(scene: THREE.Scene): { sun: THREE.DirectionalLight } {
    const hemi = new THREE.HemisphereLight(HEMI_LIGHT.skyColor, HEMI_LIGHT.groundColor, HEMI_LIGHT.intensity);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(SUN_LIGHT.color, SUN_LIGHT.intensity);
    sun.position.set(SUN_LIGHT.posX, SUN_LIGHT.posY, SUN_LIGHT.posZ);
    sun.castShadow = true;
    sun.shadow.mapSize.width = SUN_LIGHT.shadowMapSize;
    sun.shadow.mapSize.height = SUN_LIGHT.shadowMapSize;
    sun.shadow.camera.near = SUN_LIGHT.shadowNear;
    sun.shadow.camera.far = SUN_LIGHT.shadowFar;
    sun.shadow.camera.left = SUN_LIGHT.shadowLeft;
    sun.shadow.camera.right = SUN_LIGHT.shadowRight;
    sun.shadow.camera.top = SUN_LIGHT.shadowTop;
    sun.shadow.camera.bottom = SUN_LIGHT.shadowBottom;
    sun.shadow.bias = SUN_LIGHT.shadowBias;
    scene.add(sun);
    scene.add(sun.target);

    const fill = new THREE.DirectionalLight(FILL_LIGHT.color, FILL_LIGHT.intensity);
    fill.position.set(FILL_LIGHT.posX, FILL_LIGHT.posY, FILL_LIGHT.posZ);
    scene.add(fill);

    return { sun };
  }
}
