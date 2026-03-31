import * as THREE from 'three';
import type { PlacedObject, CarState, PhysicsTelemetry, PhysicsGroup } from '../types/game.js';
import { CAR_DEFINITIONS } from '../constants/cars.js';
import { PHYSICS, DRIFT_PHYSICS, CONTROLLER_PHYSICS } from '../constants/physics.js';
import { CAMERA } from '../constants/camera.js';
import { LightingSetup } from './scene/LightingSetup.js';
import { TableScene } from './scene/TableScene.js';
import { CarFactory } from './car/CarFactory.js';
import { CarPhysics } from './car/CarPhysics.js';
import { CarController } from './car/CarController.js';
import { InputManager } from './InputManager.js';
import { TopDownCamera } from './camera/TopDownCamera.js';
import { KITCHEN_ITEM_FACTORIES } from './scene/KitchenItems.js';
import { TireMarkSystem } from './scene/TireMarkSystem.js';
import { TireSmokeSystem } from './effects/TireSmokeSystem.js';

const BOUND_X = 600;
const BOUND_Z = 450;

export const PRACTICE_DEFAULT_OBJECTS: PlacedObject[] = [];

export class PracticeEngine {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private cameraController: TopDownCamera;
  private carPhysics: CarPhysics;
  private playerController: CarController;
  private inputManager: InputManager;
  private playerCar: CarState | null = null;
  private objects: PlacedObject[] = [];
  private objectMeshes: THREE.Group[] = [];
  private tireMarks: TireMarkSystem;
  private tireSmoke: TireSmokeSystem;
  private animFrameId = 0;
  private lastTime = 0;
  private paused = false;
  private disposed = false;
  private boundHandleResize: () => void;
  private readonly _overrideMirror = new Map<string, number>();
  private readonly _cameraOverrideMirror = new Map<string, number>();

  constructor(
    canvas: HTMLCanvasElement,
    selectedCarId: string,
    initialObjects: PlacedObject[] = PRACTICE_DEFAULT_OBJECTS,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87c1e8);
    this.scene.fog = new THREE.Fog(0x87c1e8, 400, 750);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.cameraController = new TopDownCamera(aspect);

    new LightingSetup().setup(this.scene);
    this.scene.add(new TableScene().build());

    this.tireMarks = new TireMarkSystem(this.scene);
    this.tireSmoke = new TireSmokeSystem(this.scene);

    this.carPhysics = new CarPhysics();
    this.playerController = new CarController(this.carPhysics);
    this.inputManager = new InputManager();

    const carDef = CAR_DEFINITIONS.find(c => c.id === selectedCarId) ?? CAR_DEFINITIONS[0];
    const carMesh = new CarFactory().createCar(carDef);
    carMesh.position.set(0, 0.01, 0);
    this.scene.add(carMesh);

    this.playerCar = {
      id: carDef.id,
      definition: carDef,
      mesh: carMesh,
      position: new THREE.Vector3(0, 0.01, 0),
      rotation: 0,
      velocityAngle: 0,
      speed: 0,
      lateralVelocity: 0,
      isSkidding: false,
      isBraking: false,
      steeringAngle: 0,
      currentT: 0,
      previousT: 0,
      hasPassedHalfway: false,
      hasPassedQuarter: false,
      completedLaps: 0,
      bestLapTime: 0,
      currentLapStart: 0,
      totalTime: 0,
      finished: false,
      finishTime: 0,
      isPlayer: true,
      hazardSteerFactor: 1.0,
      burnoutTimer: 0,
      checkpointBests: [],
      lastCheckpointTime: 0,
      lastCheckpointSegmentTime: 0,
      lastCheckpointBestTime: 0,
      lastCheckpointCrossedAt: 0,
    };

    for (const obj of initialObjects) {
      this._spawnObject(obj);
    }

    this.boundHandleResize = this._handleResize.bind(this);
    window.addEventListener('resize', this.boundHandleResize);

    this.lastTime = performance.now();
    this._loop();
  }

  private _spawnObject(obj: PlacedObject): void {
    const factory = KITCHEN_ITEM_FACTORIES[obj.type];
    if (!factory) return;
    const item = factory();
    item.position.set(obj.x, obj.y ?? 0, obj.z);
    item.rotation.y = obj.rotation;
    item.scale.setScalar(obj.scale * 4);
    this.scene.add(item);
    this.objects.push(obj);
    this.objectMeshes.push(item);
  }

  addObject(obj: PlacedObject): void {
    this._spawnObject(obj);
  }

  removeObject(idx: number): void {
    if (idx < 0 || idx >= this.objects.length) return;
    const mesh = this.objectMeshes[idx];
    this.scene.remove(mesh);
    mesh.traverse(child => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    this.objects.splice(idx, 1);
    this.objectMeshes.splice(idx, 1);
  }

  removeAllObjects(): void {
    this.objectMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.traverse(child => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
    });
    this.objects = [];
    this.objectMeshes = [];
  }

  getObjects(): PlacedObject[] {
    return [...this.objects];
  }

  getSpeed(): number {
    return this.playerCar?.speed ?? 0;
  }

  getMaxSpeed(): number {
    return this.playerCar?.definition.maxSpeed ?? 1;
  }

  screenToWorld(sx: number, sy: number, W: number, H: number): { x: number; z: number } {
    const camera = this.cameraController.camera;
    const ndcX = (sx / W) * 2 - 1;
    const ndcY = -(sy / H) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, target)) {
      return { x: target.x, z: target.z };
    }
    return { x: 0, z: 0 };
  }

  getTelemetry(): PhysicsTelemetry {
    const car = this.playerCar;
    if (!car) return {
      speed: 0, speedRatio: 0, slipAngle: 0, lateralVelocity: 0,
      steeringAngle: 0, driftResidual: 0, gripFactor: 0, throttleBlend: 0,
      isSkidding: false, isBraking: false, burnoutTimer: 0,
    };
    const ds = this.carPhysics.debugState;
    return {
      speed: car.speed, speedRatio: ds.speedRatio, slipAngle: ds.slipAngle,
      lateralVelocity: car.lateralVelocity, steeringAngle: car.steeringAngle,
      driftResidual: ds.driftResidual, gripFactor: ds.gripFactor,
      throttleBlend: ds.throttleBlend, isSkidding: car.isSkidding,
      isBraking: car.isBraking, burnoutTimer: car.burnoutTimer,
    };
  }

  setPhysicsOverride(group: PhysicsGroup, key: string, value: number): void {
    if (group === 'controller') this.playerController.setOverride(key, value);
    else this.carPhysics.setOverride(group, key, value);
    this._overrideMirror.set(`${group}:${key}`, value);
  }

  resetPhysics(): void {
    this.carPhysics.resetOverrides();
    this.playerController.resetOverrides();
    this._overrideMirror.clear();
  }

  getPhysicsDefaults(): Record<PhysicsGroup, Record<string, number>> {
    return { physics: { ...PHYSICS }, drift: { ...DRIFT_PHYSICS }, controller: { ...CONTROLLER_PHYSICS } };
  }

  getCameraDefaults(): Record<string, number> {
    return { ...CAMERA };
  }

  setCameraOverride(key: string, value: number): void {
    this.cameraController.setOverride(key, value);
    this._cameraOverrideMirror.set(key, value);
  }

  resetCamera(): void {
    this.cameraController.resetOverrides();
    this._cameraOverrideMirror.clear();
  }

  exportCameraTS(): string {
    const merged: Record<string, number> = { ...CAMERA };
    for (const [k, v] of this._cameraOverrideMirror) merged[k] = v;
    const lines = Object.entries(merged).map(([k, v]) => `  ${k}: ${v},`).join('\n');
    return `export const CAMERA = {\n${lines}\n};\n`;
  }

  exportPhysicsTS(): string {
    const defaults = this.getPhysicsDefaults();
    const merged = (group: PhysicsGroup) => {
      const result: Record<string, number> = { ...defaults[group] };
      for (const [k, v] of this._overrideMirror) {
        const [g, key] = k.split(':');
        if (g === group) result[key] = v;
      }
      return result;
    };
    const fmt = (obj: Record<string, number>, name: string) =>
      `export const ${name} = {\n${Object.entries(obj).map(([k, v]) => `  ${k}: ${v},`).join('\n')}\n} as const;`;

    const hazardBlock = `export const HAZARD_EFFECTS: Record<string, HazardEffect> = {
  juice: { speedMultiplier: 0.5, steeringMultiplier: 1.0, lateralDrift: 0 },
  oil: { speedMultiplier: 1.0, steeringMultiplier: 0.3, lateralDrift: 0.5 },
  food: { speedMultiplier: 0.7, steeringMultiplier: 1.0, lateralDrift: 0 },
  milk: { speedMultiplier: 0.65, steeringMultiplier: 0.8, lateralDrift: 0.2 },
  butter: { speedMultiplier: 0.9, steeringMultiplier: 0.15, lateralDrift: 1.2 },
};`;
    const aiBlock = `export const AI_CONFIG = {\n  lookAhead: 0.03,\n  steeringGain: 3.0,\n  brakeAngleThreshold: 0.5,\n  brakeFactor: 0.65,\n  lateralVariation: 1.5,\n  minSkillLevel: 0.7,\n  maxSkillLevel: 1.0,\n} as const;`;

    return [
      `import type { HazardEffect } from "../types/game.js";`,
      '',
      fmt(merged('physics'), 'PHYSICS'),
      '',
      hazardBlock,
      '',
      fmt(merged('drift'), 'DRIFT_PHYSICS'),
      '',
      fmt(merged('controller'), 'CONTROLLER_PHYSICS'),
      '',
      aiBlock,
    ].join('\n');
  }

  pause(): void {
    this.paused = true;
    this.inputManager.clearKeys();
  }

  resume(): void {
    this.paused = false;
    this.lastTime = performance.now();
  }

  private _loop = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.paused && this.playerCar) {
      const input = this.inputManager.getState();
      this.playerController.update(this.playerCar, input, dt);

      // Table boundary clamp
      const car = this.playerCar;
      if (Math.abs(car.position.x) > BOUND_X) {
        car.position.x = Math.sign(car.position.x) * BOUND_X;
        car.speed *= 0.4;
      }
      if (Math.abs(car.position.z) > BOUND_Z) {
        car.position.z = Math.sign(car.position.z) * BOUND_Z;
        car.speed *= 0.4;
      }

      car.mesh.position.copy(car.position);
      car.mesh.rotation.y = car.rotation;

      if (car.isSkidding || car.isBraking) this.tireMarks.addMarks(car);
      if (car.isSkidding) this.tireSmoke.emitForCar(car, dt);

      this.tireMarks.update(dt);
      this.tireSmoke.update(dt);

      this.cameraController.update(car.position, car.speed, car.definition.maxSpeed, car.rotation);
    }

    this.renderer.render(this.scene, this.cameraController.camera);
    this.animFrameId = requestAnimationFrame(this._loop);
  };

  private _handleResize(): void {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h);
    this.cameraController.resize(w / h);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.boundHandleResize);
    this.inputManager.dispose();
    this.tireMarks.dispose();
    this.tireSmoke.dispose();
    this.renderer.dispose();
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
