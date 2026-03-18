import * as THREE from 'three';

export class LightingSetup {
  setup(scene: THREE.Scene): void {
    // Sky/ground hemisphere — blue sky above, warm green below
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x6db33f, 0.55);
    scene.add(hemi);

    // Main afternoon sun — low angle from upper-left for long diagonal shadows
    const sun = new THREE.DirectionalLight(0xfff0cc, 1.4);
    sun.position.set(-60, 80, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -180;
    sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 140;
    sun.shadow.camera.bottom = -140;
    sun.shadow.bias = -0.0003;
    scene.add(sun);

    // Soft fill from opposite side — cooler blue to simulate sky bounce
    const fill = new THREE.DirectionalLight(0xb0c8e8, 0.25);
    fill.position.set(40, 30, -30);
    scene.add(fill);
  }
}
