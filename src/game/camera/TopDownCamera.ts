import * as THREE from 'three';
import { CAMERA } from '../../constants/camera.js';

export class TopDownCamera {
  readonly camera: THREE.PerspectiveCamera;
  private targetPosition = new THREE.Vector3();
  private smoothLookAt = new THREE.Vector3();
  private currentHeight: number;
  private currentBack: number;
  private initialized = false;
  private overrides = new Map<string, number>();

  constructor(aspect: number) {
    this.currentHeight = CAMERA.baseHeight;
    this.currentBack = CAMERA.baseBack;
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
    this.camera.position.set(0, this.currentHeight, this.currentBack);
    this.camera.lookAt(0, 0, 0);
  }

  private cfg(key: keyof typeof CAMERA): number {
    return this.overrides.get(key) ?? CAMERA[key];
  }

  setOverride(key: string, value: number): void { this.overrides.set(key, value); }
  resetOverrides(): void { this.overrides.clear(); }
  getOverrides(): Map<string, number> { return this.overrides; }

  update(playerPosition: THREE.Vector3, speed = 0, maxSpeed = 80): void {
    const speedRatio = Math.min(Math.abs(speed) / maxSpeed, 1);

    const targetHeight = this.cfg('baseHeight') + (this.cfg('maxZoomHeight') - this.cfg('baseHeight')) * speedRatio;
    const targetBack = this.cfg('baseBack') + (this.cfg('maxZoomBack') - this.cfg('baseBack')) * speedRatio;

    this.currentHeight += (targetHeight - this.currentHeight) * this.cfg('heightLerp');
    this.currentBack += (targetBack - this.currentBack) * this.cfg('backLerp');

    // Fixed world-space offset — camera orientation never depends on car heading
    this.targetPosition.set(
      playerPosition.x,
      playerPosition.y + this.currentHeight,
      playerPosition.z + this.currentBack,
    );

    const posLerp = this.cfg('positionLerpBase') + (this.cfg('positionLerpMax') - this.cfg('positionLerpBase')) * speedRatio;
    this.camera.position.lerp(this.targetPosition, posLerp);

    // Derive look-at point from pitch angle.
    // angle=63° ≈ looks at car, 90°=straight down, lower=more horizon tilt.
    // Formula: at pitch θ, the ground-plane intersection of the camera ray is
    //   pz + (back - height / tan(θ))
    const angleDeg = Math.max(5, Math.min(89, this.cfg('angle')));
    const angleRad = angleDeg * (Math.PI / 180);
    const lookOffsetZ = this.currentBack - this.currentHeight / Math.tan(angleRad);
    const desiredLookAt = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z + lookOffsetZ);

    if (!this.initialized) {
      this.smoothLookAt.copy(desiredLookAt);
      this.initialized = true;
    } else {
      this.smoothLookAt.lerp(desiredLookAt, this.cfg('lookAtLerp'));
    }
    this.camera.lookAt(this.smoothLookAt);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
