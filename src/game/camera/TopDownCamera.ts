import * as THREE from 'three';
import { CAMERA } from '../../constants/camera.js';

export class TopDownCamera {
  readonly camera: THREE.PerspectiveCamera;
  private currentHeight: number;
  private smoothedLeadX = 0;
  private smoothedLeadZ = 0;
  private smoothedFocusX = 0;
  private smoothedFocusZ = 0;
  private focusInitialized = false;
  private overrides = new Map<string, number>();

  constructor(aspect: number) {
    this.currentHeight = CAMERA.baseHeight;
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
    const initAngle = CAMERA.angle * Math.PI / 180;
    this.camera.position.set(0, this.currentHeight, this.currentHeight / Math.tan(initAngle));
    this.camera.rotation.set(-initAngle, 0, 0);
  }

  private cfg(key: keyof typeof CAMERA): number {
    return this.overrides.get(key) ?? CAMERA[key];
  }

  setOverride(key: string, value: number): void { this.overrides.set(key, value); }
  resetOverrides(): void { this.overrides.clear(); }
  getOverrides(): Map<string, number> { return this.overrides; }

  update(playerPosition: THREE.Vector3, speed = 0, maxSpeed = 80, heading = 0): void {
    const speedRatio = Math.min(Math.abs(speed) / maxSpeed, 1);

    // Height zoom
    const targetHeight = this.cfg('baseHeight') + (this.cfg('maxZoomHeight') - this.cfg('baseHeight')) * speedRatio;
    this.currentHeight += (targetHeight - this.currentHeight) * this.cfg('heightLerp');

    // Lead panning — shift camera in car's forward direction
    const leadDist = this.cfg('leadDist') * speedRatio;
    const targetLeadX = Math.sin(heading) * leadDist;
    const targetLeadZ = Math.cos(heading) * leadDist;
    const lerpFactor = this.cfg('leadLerp');
    this.smoothedLeadX += (targetLeadX - this.smoothedLeadX) * lerpFactor;
    this.smoothedLeadZ += (targetLeadZ - this.smoothedLeadZ) * lerpFactor;

    // Place camera behind+above so the car stays centered at the given pitch angle.
    // With pitch = angle, the camera must be height/tan(angle) units behind in Z.
    const angleRad = this.cfg('angle') * Math.PI / 180;
    const zBack = this.currentHeight / Math.tan(angleRad);

    this.camera.position.set(
      playerPosition.x + this.smoothedLeadX,
      playerPosition.y + this.currentHeight,
      playerPosition.z + zBack + this.smoothedLeadZ,
    );
    // Fixed orientation — pitch only, no yaw, never rotates with the car
    this.camera.rotation.set(-angleRad, 0, 0);
  }

  updateVersus(frontPos: THREE.Vector3, backPos: THREE.Vector3, spd1: number, max1: number, spd2: number, max2: number): void {
    const midpoint = frontPos.clone().add(backPos).multiplyScalar(0.5);
    // Bias the target focus 30% toward the front car so it always has space to navigate ahead
    const targetFocusX = midpoint.x + (frontPos.x - midpoint.x) * 0.3;
    const targetFocusZ = midpoint.z + (frontPos.z - midpoint.z) * 0.3;

    // Snap on first call, then lerp so camera slides smoothly when cars swap lead
    if (!this.focusInitialized) {
      this.smoothedFocusX = targetFocusX;
      this.smoothedFocusZ = targetFocusZ;
      this.focusInitialized = true;
    } else {
      this.smoothedFocusX += (targetFocusX - this.smoothedFocusX) * 0.01;
      this.smoothedFocusZ += (targetFocusZ - this.smoothedFocusZ) * 0.01;
    }

    const dist = frontPos.distanceTo(backPos);
    const spreadRatio = Math.min(dist / 80, 1);
    const topSpeed = Math.max(Math.abs(spd1), Math.abs(spd2));
    const maxSpeed = Math.max(max1, max2);
    const speedRatio = Math.min(topSpeed / maxSpeed, 1);
    const targetHeight = this.cfg('baseHeight') + (this.cfg('maxZoomHeight') - this.cfg('baseHeight')) * Math.max(speedRatio, spreadRatio);
    this.currentHeight += (targetHeight - this.currentHeight) * this.cfg('heightLerp');
    const angleRad = this.cfg('angle') * Math.PI / 180;
    const zBack = this.currentHeight / Math.tan(angleRad);
    this.camera.position.set(this.smoothedFocusX, this.currentHeight, this.smoothedFocusZ + zBack);
    this.camera.rotation.set(-angleRad, 0, 0);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
