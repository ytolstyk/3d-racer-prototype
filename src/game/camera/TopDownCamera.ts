import * as THREE from 'three';

const BASE_HEIGHT = 82;
const BASE_BACK = -41;
const MAX_ZOOM_HEIGHT = 131;
const MAX_ZOOM_BACK = -64;

export class TopDownCamera {
  readonly camera: THREE.PerspectiveCamera;
  private targetPosition = new THREE.Vector3();
  private smoothLookAt = new THREE.Vector3();
  private currentHeight = BASE_HEIGHT;
  private currentBack = BASE_BACK;
  private initialized = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1200);
    this.camera.position.set(0, BASE_HEIGHT, BASE_BACK);
    this.camera.lookAt(0, 0, 0);
  }

  update(playerPosition: THREE.Vector3, speed = 0, maxSpeed = 80, playerRotation = 0): void {
    const speedRatio = Math.min(Math.abs(speed) / maxSpeed, 1);
    const targetHeight = BASE_HEIGHT + (MAX_ZOOM_HEIGHT - BASE_HEIGHT) * speedRatio;
    const targetBack = BASE_BACK + (MAX_ZOOM_BACK - BASE_BACK) * speedRatio;

    this.currentHeight += (targetHeight - this.currentHeight) * 0.03;
    this.currentBack += (targetBack - this.currentBack) * 0.03;

    const offset = new THREE.Vector3(0, this.currentHeight, this.currentBack);
    this.targetPosition.copy(playerPosition).add(offset);
    this.camera.position.lerp(this.targetPosition, 0.05);

    // Smoothly track a point slightly ahead of the car
    const forward = new THREE.Vector3(Math.sin(playerRotation), 0, Math.cos(playerRotation));
    const desiredLookAt = playerPosition.clone().addScaledVector(forward, 12);
    if (!this.initialized) {
      this.smoothLookAt.copy(desiredLookAt);
      this.initialized = true;
    } else {
      this.smoothLookAt.lerp(desiredLookAt, 0.05);
    }
    this.camera.lookAt(this.smoothLookAt);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
