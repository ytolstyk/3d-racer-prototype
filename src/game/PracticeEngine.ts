import * as THREE from 'three';
import type { PlacedObject, CarState } from '../types/game.js';
import { CAR_DEFINITIONS } from '../constants/cars.js';
import { LightingSetup } from './scene/LightingSetup.js';
import { TableScene } from './scene/TableScene.js';
import { CarFactory } from './car/CarFactory.js';
import { CarPhysics } from './car/CarPhysics.js';
import { CarController } from './car/CarController.js';
import { InputManager } from './InputManager.js';
import { TopDownCamera } from './camera/TopDownCamera.js';
import { KITCHEN_ITEM_FACTORIES } from './scene/KitchenItems.js';

const BOUND_X = 600;
const BOUND_Z = 450;

export const PRACTICE_DEFAULT_OBJECTS: PlacedObject[] = [
  // 7 salt shakers for slalom along X at Z=0
  ...Array.from({ length: 7 }, (_, i): PlacedObject => ({
    type: 'saltShaker',
    x: (i - 3) * 100,
    z: 0,
    rotation: 0,
    scale: 1.0,
  })),
  // 5 bread loaves as wall at X=200
  ...Array.from({ length: 5 }, (_, i): PlacedObject => ({
    type: 'breadLoaf',
    x: 200,
    z: (i - 2) * 100,
    rotation: 0,
    scale: 1.0,
  })),
  // 12 mugs in an ellipse 150×120 units
  ...Array.from({ length: 12 }, (_, i): PlacedObject => ({
    type: 'mug',
    x: Math.round(150 * Math.cos((i / 12) * Math.PI * 2)),
    z: Math.round(120 * Math.sin((i / 12) * Math.PI * 2)),
    rotation: 0,
    scale: 1.0,
  })),
];

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
  private animFrameId = 0;
  private lastTime = 0;
  private paused = false;
  private disposed = false;
  private boundHandleResize: () => void;

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

  getObjects(): PlacedObject[] {
    return [...this.objects];
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
