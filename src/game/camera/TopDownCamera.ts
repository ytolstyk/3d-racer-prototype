import * as THREE from 'three';
import { CAMERA } from '../../constants/camera.js';

export class TopDownCamera {
  readonly camera: THREE.PerspectiveCamera;
  private smoothLookAt = new THREE.Vector3();
  private currentHeight: number;
  private currentBack: number;
  private smoothedAngle = 0;
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

  update(playerPosition: THREE.Vector3, speed = 0, maxSpeed = 80, velocityAngle = 0): void {
    const speedRatio = Math.min(Math.abs(speed) / maxSpeed, 1);

    const targetHeight = this.cfg('baseHeight') + (this.cfg('maxZoomHeight') - this.cfg('baseHeight')) * speedRatio;
    const targetBack = this.cfg('baseBack') + (this.cfg('maxZoomBack') - this.cfg('baseBack')) * speedRatio;

    this.currentHeight += (targetHeight - this.currentHeight) * this.cfg('heightLerp');
    this.currentBack += (targetBack - this.currentBack) * this.cfg('backLerp');

    // Smooth the velocity angle via shortest-arc interpolation so the camera
    // orbits around the car rather than lerping through it in world space.
    if (!this.initialized) {
      this.smoothedAngle = velocityAngle;
      this.initialized = true;
    } else {
      let diff = velocityAngle - this.smoothedAngle;
      // Wrap to [-π, π] so we always take the short way around
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      this.smoothedAngle += diff * this.cfg('rotationLerp');
    }

    // Backward direction from car (opposite of velocity forward)
    // Convention: forward = (sin(angle), 0, cos(angle))
    const backX = -Math.sin(this.smoothedAngle);
    const backZ = -Math.cos(this.smoothedAngle);

    // Camera sits behind the car at the smoothed angle
    this.camera.position.set(
      playerPosition.x + backX * this.currentBack,
      playerPosition.y + this.currentHeight,
      playerPosition.z + backZ * this.currentBack,
    );

    // Look-at point: offset from car along back axis.
    // angle=55° → lookOffset ≈ -11.5 → look-at is ~11.5 units ahead of car.
    const angleDeg = Math.max(5, Math.min(89, this.cfg('angle')));
    const angleRad = angleDeg * (Math.PI / 180);
    const lookOffset = this.currentBack - this.currentHeight / Math.tan(angleRad);

    const desiredLookAt = new THREE.Vector3(
      playerPosition.x + backX * lookOffset,
      playerPosition.y,
      playerPosition.z + backZ * lookOffset,
    );

    this.smoothLookAt.lerp(desiredLookAt, this.cfg('lookAtLerp'));
    this.camera.lookAt(this.smoothLookAt);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
