import * as THREE from "three";
import type {
  PlacedObject,
  PlacedSplatter,
  CarState,
  PhysicsTelemetry,
  PhysicsGroup,
  HazardZone,
} from "../types/game.js";
import { CAR_DEFINITIONS } from "../constants/cars.js";
import {
  PHYSICS,
  DRIFT_PHYSICS,
  CONTROLLER_PHYSICS,
  HAZARD_EFFECTS,
} from "../constants/physics.js";
import { CAMERA } from "../constants/camera.js";
import { LightingSetup } from "./scene/LightingSetup.js";
import { TableScene } from "./scene/TableScene.js";
import { CarFactory } from "./car/CarFactory.js";
import { CarPhysics } from "./car/CarPhysics.js";
import { CarController } from "./car/CarController.js";
import { InputManager } from "./InputManager.js";
import { TopDownCamera } from "./camera/TopDownCamera.js";
import { KITCHEN_ITEM_FACTORIES, OBJECT_COLLISION_RADII } from "./scene/KitchenItems.js";
import { TireMarkSystem } from "./scene/TireMarkSystem.js";
import { TireSmokeSystem } from "./effects/TireSmokeSystem.js";
import { HazardSplashSystem } from "./effects/HazardSplashSystem.js";
import { SplatterDecalSystem } from "./effects/SplatterDecalSystem.js";
import { RainHazardSystem } from "./effects/RainHazardSystem.js";
import { buildCircleHazardMesh } from "./track/HazardSystem.js";
import { HAZARD_HEX_COLORS } from "../constants/physics.js";

const BOUND_X = 600;
const BOUND_Z = 450;

export const PRACTICE_DEFAULT_OBJECTS: PlacedObject[] = [];

export interface PracticeHazard {
  type: HazardZone['type'];
  x: number;
  z: number;
  radius: number;
  alphaData?: Uint8ClampedArray;
  alphaSize?: number;
}

interface CarHazardState {
  inHazard: boolean;
  zoneType: string;
  drip: number;
  splashTimer: number;
}

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
  private practiceHazards: PracticeHazard[] = [];
  private hazardMeshes: THREE.Group[] = [];
  private tireMarks: TireMarkSystem;
  private tireSmoke: TireSmokeSystem;
  private hazardSplash: HazardSplashSystem;
  private splatterSystem: SplatterDecalSystem;
  private rainSystem: RainHazardSystem | null = null;
  private rainCircles: { x: number; z: number; radius: number }[] = [];
  private hazardState: CarHazardState = { inHazard: false, zoneType: '', drip: 0, splashTimer: 0 };
  private _axisXMarker!: THREE.Mesh;
  private _axisZMarker!: THREE.Mesh;
  private animFrameId = 0;
  private lastTime = 0;
  private paused = false;
  private disposed = false;
  private boundHandleResize: () => void;
  private readonly _overrideMirror = new Map<string, number>();
  private readonly _cameraOverrideMirror = new Map<string, number>();
  private readonly _hazardOverrideMirror = new Map<string, number>();

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

    const { group: axesGroup, xMarker, zMarker } = this._buildLabeledAxes();
    this.scene.add(axesGroup);
    this._axisXMarker = xMarker;
    this._axisZMarker = zMarker;

    this.tireMarks = new TireMarkSystem(this.scene);
    this.tireSmoke = new TireSmokeSystem(this.scene);
    this.hazardSplash = new HazardSplashSystem(this.scene);
    this.splatterSystem = new SplatterDecalSystem(this.scene, this.renderer);

    this.carPhysics = new CarPhysics();
    this.playerController = new CarController(this.carPhysics);
    this.inputManager = new InputManager();

    const carDef =
      CAR_DEFINITIONS.find((c) => c.id === selectedCarId) ?? CAR_DEFINITIONS[0];
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
      boostMultiplier: 1.0,
      boostDecayRate: 0,
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
    window.addEventListener("resize", this.boundHandleResize);

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
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    this.objects.splice(idx, 1);
    this.objectMeshes.splice(idx, 1);
  }

  removeAllObjects(): void {
    this.objectMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
    });
    this.objects = [];
    this.objectMeshes = [];
  }

  getObjects(): PlacedObject[] {
    return [...this.objects];
  }

  addHazard(h: PracticeHazard): void {
    const result = buildCircleHazardMesh(h.type, h.x, h.z, h.radius);
    this.scene.add(result.group);
    const hazard: PracticeHazard = { ...h, alphaData: result.alphaData, alphaSize: result.alphaSize };
    this.practiceHazards.push(hazard);
    this.hazardMeshes.push(result.group);
  }

  removeHazard(idx: number): void {
    if (idx < 0 || idx >= this.practiceHazards.length) return;
    const mesh = this.hazardMeshes[idx];
    this.scene.remove(mesh);
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    this.practiceHazards.splice(idx, 1);
    this.hazardMeshes.splice(idx, 1);
  }

  removeAllHazards(): void {
    this.hazardMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
    });
    this.practiceHazards = [];
    this.hazardMeshes = [];
  }

  getHazards(): PracticeHazard[] {
    return [...this.practiceHazards];
  }

  addRainZone(x: number, z: number, radius: number): void {
    if (!this.rainSystem) {
      this.rainSystem = new RainHazardSystem(this.scene);
    }
    this.rainSystem.addCircleZone(x, z, radius);
    this.rainCircles.push({ x, z, radius });
  }

  removeAllRainZones(): void {
    if (this.rainSystem) {
      this.rainSystem.dispose();
      this.rainSystem = null;
    }
    this.rainCircles = [];
  }

  getRainZones(): { x: number; z: number; radius: number }[] {
    return [...this.rainCircles];
  }

  addSplatter(s: PlacedSplatter): void {
    this.splatterSystem.addSplatter(s);
  }

  removeSplatter(idx: number): void {
    this.splatterSystem.removeSplatter(idx);
  }

  removeAllSplatters(): void {
    this.splatterSystem.removeAll();
  }

  getSplatters(): PlacedSplatter[] {
    return this.splatterSystem.getSplatters();
  }

  getSpeed(): number {
    return this.playerCar?.speed ?? 0;
  }

  getCarPosition(): { x: number; y: number; z: number } {
    const p = this.playerCar?.position;
    return p ? { x: p.x, y: p.y, z: p.z } : { x: 0, y: 0, z: 0 };
  }

  getMaxSpeed(): number {
    return this.playerCar?.definition.maxSpeed ?? 1;
  }

  screenToWorld(
    sx: number,
    sy: number,
    W: number,
    H: number,
  ): { x: number; z: number } {
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
    if (!car)
      return {
        speed: 0,
        speedRatio: 0,
        slipAngle: 0,
        lateralVelocity: 0,
        steeringAngle: 0,
        driftResidual: 0,
        gripFactor: 0,
        throttleBlend: 0,
        isSkidding: false,
        isBraking: false,
        burnoutTimer: 0,
      };
    const ds = this.carPhysics.debugState;
    return {
      speed: car.speed,
      speedRatio: ds.speedRatio,
      slipAngle: ds.slipAngle,
      lateralVelocity: car.lateralVelocity,
      steeringAngle: car.steeringAngle,
      driftResidual: ds.driftResidual,
      gripFactor: ds.gripFactor,
      throttleBlend: ds.throttleBlend,
      isSkidding: car.isSkidding,
      isBraking: car.isBraking,
      burnoutTimer: car.burnoutTimer,
    };
  }

  setHazardEffectOverride(type: string, key: string, value: number): void {
    if (HAZARD_EFFECTS[type]) {
      (HAZARD_EFFECTS[type] as unknown as Record<string, number>)[key] = value;
    }
    this._hazardOverrideMirror.set(`${type}:${key}`, value);
  }

  resetHazardEffects(): void {
    this._hazardOverrideMirror.clear();
  }

  setPhysicsOverride(group: PhysicsGroup, key: string, value: number): void {
    if (group === "controller") this.playerController.setOverride(key, value);
    else this.carPhysics.setOverride(group, key, value);
    this._overrideMirror.set(`${group}:${key}`, value);
  }

  resetPhysics(): void {
    this.carPhysics.resetOverrides();
    this.playerController.resetOverrides();
    this._overrideMirror.clear();
  }

  getPhysicsDefaults(): Record<PhysicsGroup, Record<string, number>> {
    return {
      physics: { ...PHYSICS },
      drift: { ...DRIFT_PHYSICS },
      controller: { ...CONTROLLER_PHYSICS },
    };
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
    const lines = Object.entries(merged)
      .map(([k, v]) => `  ${k}: ${v},`)
      .join("\n");
    return `export const CAMERA = {\n${lines}\n};\n`;
  }

  exportPhysicsTS(): string {
    const defaults = this.getPhysicsDefaults();
    const merged = (group: PhysicsGroup) => {
      const result: Record<string, number> = { ...defaults[group] };
      for (const [k, v] of this._overrideMirror) {
        const [g, key] = k.split(":");
        if (g === group) result[key] = v;
      }
      return result;
    };
    const fmt = (obj: Record<string, number>, name: string) =>
      `export const ${name} = {\n${Object.entries(obj)
        .map(([k, v]) => `  ${k}: ${v},`)
        .join("\n")}\n} as const;`;

    const mergedHazard = Object.fromEntries(
      Object.entries(HAZARD_EFFECTS).map(([type, base]) => {
        const e: Record<string, number> = { ...base };
        for (const [k, v] of this._hazardOverrideMirror) {
          const [t, prop] = k.split(":");
          if (t === type) e[prop] = v;
        }
        return [type, e];
      })
    );
    const hazardBlock = `export const HAZARD_EFFECTS: Record<string, HazardEffect> = {\n${
      Object.entries(mergedHazard)
        .map(([t, e]) => `  ${t}: { speedMultiplier: ${(e as Record<string, number>).speedMultiplier}, steeringMultiplier: ${(e as Record<string, number>).steeringMultiplier}, lateralDrift: ${(e as Record<string, number>).lateralDrift} },`)
        .join("\n")
    }\n}`;
    const aiBlock = `export const AI_CONFIG = {\n  lookAhead: 0.03,\n  steeringGain: 3.0,\n  brakeAngleThreshold: 0.5,\n  brakeFactor: 0.65,\n  lateralVariation: 1.5,\n  minSkillLevel: 0.7,\n  maxSkillLevel: 1.0,\n} as const;`;

    return [
      `import type { HazardEffect } from "../types/game.js";`,
      "",
      fmt(merged("physics"), "PHYSICS"),
      "",
      hazardBlock,
      "",
      fmt(merged("drift"), "DRIFT_PHYSICS"),
      "",
      fmt(merged("controller"), "CONTROLLER_PHYSICS"),
      "",
      aiBlock,
    ].join("\n");
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

      // Object collision (bounding sphere, XZ plane only)
      for (const obj of this.objects) {
        const colRadius = (OBJECT_COLLISION_RADII[obj.type] ?? 12) * obj.scale;
        const dx = car.position.x - obj.x;
        const dz = car.position.z - obj.z;
        const distSq = dx * dx + dz * dz;
        const minDist = PHYSICS.carBoundingRadius + colRadius;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          car.position.x += (dx / dist) * overlap;
          car.position.z += (dz / dist) * overlap;
          car.speed *= 0.5;
        }
      }

      // Decay hazard steer factor back to normal
      car.hazardSteerFactor = Math.min(1.0, car.hazardSteerFactor + dt * 3);

      // Hazard effects with proper state tracking + pixel-based collision
      let activeHazardType: string | null = null;
      for (const hz of this.practiceHazards) {
        const dx = car.position.x - hz.x;
        const dz = car.position.z - hz.z;
        let inZone = false;
        if (hz.alphaData && hz.alphaSize) {
          const u = dx / (hz.radius * 2) + 0.5;
          const v = 0.5 - dz / (hz.radius * 2);
          if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
            const s = hz.alphaSize;
            const px = Math.floor(u * s);
            const py = Math.floor(v * s);
            inZone = hz.alphaData[(py * s + px) * 4 + 3] > 32;
          }
        } else {
          inZone = dx * dx + dz * dz <= hz.radius * hz.radius;
        }
        if (inZone) {
          const effect = HAZARD_EFFECTS[hz.type];
          car.hazardSteerFactor = Math.min(car.hazardSteerFactor, effect.steeringMultiplier);
          car.speed = car.speed * (effect.speedMultiplier + (1 - effect.speedMultiplier) * Math.max(0, 1 - dt * 4));
          activeHazardType = hz.type;
          break;
        }
      }

      const hs = this.hazardState;
      if (activeHazardType) {
        const wasInHazard = hs.inHazard;
        hs.inHazard = true;
        hs.zoneType = activeHazardType;
        if (!wasInHazard) {
          hs.drip = 0;
          hs.splashTimer = 0;
          if (Math.abs(car.speed) >= car.definition.maxSpeed * 0.1) {
            this.hazardSplash.emit(car.position, HAZARD_HEX_COLORS[activeHazardType] ?? 0xffffff, car.speed, car.definition.maxSpeed);
          }
        } else if (Math.abs(car.speed) >= car.definition.maxSpeed * 0.1) {
          hs.splashTimer -= dt;
          if (hs.splashTimer <= 0) {
            hs.splashTimer = 0.25;
            this.hazardSplash.emit(car.position, HAZARD_HEX_COLORS[activeHazardType] ?? 0xffffff, car.speed, car.definition.maxSpeed, 25);
          }
        }
        this.tireMarks.addSubstanceMarks(car, hs.zoneType);
      } else {
        if (hs.inHazard) {
          hs.inHazard = false;
          hs.drip = 60;
        }
        if (hs.drip > 0) {
          this.tireMarks.addSubstanceMarks(car, hs.zoneType);
          hs.drip--;
        }
      }

      car.mesh.position.copy(car.position);
      car.mesh.rotation.y = car.rotation;

      // Update axis position markers
      this._axisXMarker.position.set(car.position.x, 1.5, 0);
      this._axisZMarker.position.set(0, 1.5, car.position.z);

      if (car.isSkidding || car.isBraking) this.tireMarks.addMarks(car);
      if (car.isSkidding) this.tireSmoke.emitForCar(car, dt);

      this.tireMarks.update(dt);
      this.tireSmoke.update(dt);
      this.hazardSplash.update(dt);
      this.rainSystem?.update(dt, [car]);

      this.cameraController.update(
        car.position,
        car.speed,
        car.definition.maxSpeed,
        car.rotation,
      );
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

  private _buildLabeledAxes(): {
    group: THREE.Group;
    xMarker: THREE.Mesh;
    zMarker: THREE.Mesh;
  } {
    const group = new THREE.Group();
    group.position.y = 1;

    const AXIS_LEN = 220;
    const TICK = 50;
    const TICK_H = 7;
    const LABEL_Y = 2;

    const makeSprite = (
      text: string,
      color: string,
      size = 1.0,
    ): THREE.Sprite => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 128, 64);
      ctx.font = "bold 40px monospace";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 64, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        depthTest: false,
        transparent: true,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(24 * size, 12 * size, 1);
      return sprite;
    };

    const addLines = (pts: number[], hex: number) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      group.add(
        new THREE.LineSegments(
          geo,
          new THREE.LineBasicMaterial({ color: hex, depthTest: false }),
        ),
      );
    };

    // X axis (red)
    {
      const c = "#ff5555";
      const h = 0xff5555;
      const pts: number[] = [-AXIS_LEN, 0, 0, AXIS_LEN, 0, 0];
      for (let t = -AXIS_LEN; t <= AXIS_LEN; t += TICK) {
        if (t === 0) continue;
        pts.push(t, -TICK_H, 0, t, TICK_H, 0);
        const s = makeSprite(String(t), c, 0.65);
        s.position.set(t, LABEL_Y, 22);
        group.add(s);
      }
      addLines(pts, h);
      const lbl = makeSprite("X", c, 1.6);
      lbl.position.set(AXIS_LEN + 28, LABEL_Y, 0);
      group.add(lbl);
    }

    // Z axis (blue)
    {
      const c = "#5588ff";
      const h = 0x5588ff;
      const pts: number[] = [0, 0, -AXIS_LEN, 0, 0, AXIS_LEN];
      for (let t = -AXIS_LEN; t <= AXIS_LEN; t += TICK) {
        if (t === 0) continue;
        pts.push(-TICK_H, 0, t, TICK_H, 0, t);
        const s = makeSprite(String(t), c, 0.65);
        s.position.set(22, LABEL_Y, t);
        group.add(s);
      }
      addLines(pts, h);
      const lbl = makeSprite("Z", c, 1.6);
      lbl.position.set(0, LABEL_Y, AXIS_LEN + 28);
      group.add(lbl);
    }

    // Y axis (green) — positive only, shorter
    {
      const c = "#44ee66";
      const h = 0x44ee66;
      const Y_LEN = 100;
      const pts: number[] = [0, 0, 0, 0, Y_LEN, 0];
      for (let t = TICK; t <= Y_LEN; t += TICK) {
        pts.push(-TICK_H, t, 0, TICK_H, t, 0);
        const s = makeSprite(String(t), c, 0.65);
        s.position.set(22, t, 0);
        group.add(s);
      }
      addLines(pts, h);
      const lbl = makeSprite("Y", c, 1.6);
      lbl.position.set(0, Y_LEN + 18, 0);
      group.add(lbl);
    }

    // Origin dot
    const originGeo = new THREE.SphereGeometry(3, 8, 8);
    const originMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
    });
    group.add(new THREE.Mesh(originGeo, originMat));

    // X position marker (bright red sphere on X axis)
    const markerGeo = new THREE.SphereGeometry(2, 8, 8);
    const xMarker = new THREE.Mesh(
      markerGeo,
      new THREE.MeshBasicMaterial({ color: 0xff2222, depthTest: false }),
    );
    xMarker.position.set(0, 1.5, 0);
    group.add(xMarker);

    // Z position marker (bright blue sphere on Z axis)
    const zMarker = new THREE.Mesh(
      markerGeo.clone(),
      new THREE.MeshBasicMaterial({ color: 0x2244ff, depthTest: false }),
    );
    zMarker.position.set(0, 1.5, 0);
    group.add(zMarker);

    return { group, xMarker, zMarker };
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener("resize", this.boundHandleResize);
    this.inputManager.dispose();
    this.tireMarks.dispose();
    this.tireSmoke.dispose();
    this.hazardSplash.dispose();
    this.rainSystem?.dispose();
    this.splatterSystem.dispose();
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material))
          obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
