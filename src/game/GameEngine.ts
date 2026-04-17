import * as THREE from 'three';
import type { CarDefinition, CarState, GameState, Difficulty } from '../types/game.js';
import { CAR_DEFINITIONS } from '../constants/cars.js';
import { TRACKS } from '../constants/track.js';
import type { TrackConfig } from '../constants/track.js';
import { GameStateEmitter } from '../state/GameStateEmitter.js';
import { InputManager } from './InputManager.js';
import { TrackDefinition } from './track/TrackDefinition.js';
import { TrackBuilder } from './track/TrackBuilder.js';
import { HazardSystem } from './track/HazardSystem.js';
import { TableScene } from './scene/TableScene.js';
import type { ObstacleInfo } from './scene/ObstacleFactory.js';
import { LightingSetup } from './scene/LightingSetup.js';
import { TopDownCamera } from './camera/TopDownCamera.js';
import { CarFactory } from './car/CarFactory.js';
import { CarPhysics } from './car/CarPhysics.js';
import { CarController } from './car/CarController.js';
import { AIManager } from './ai/AIManager.js';
import { CollisionSystem } from './collision/CollisionSystem.js';
import { RaceManager } from './race/RaceManager.js';
import { StartSequence } from './race/StartSequence.js';
import { Minimap } from './race/Minimap.js';
import { TireMarkSystem } from './scene/TireMarkSystem.js';
import { CollisionParticleSystem } from './effects/CollisionParticleSystem.js';
import { TireSmokeSystem } from './effects/TireSmokeSystem.js';
import { HazardSplashSystem } from './effects/HazardSplashSystem.js';
import { RainHazardSystem } from './effects/RainHazardSystem.js';
import { KITCHEN_ITEM_FACTORIES } from './scene/KitchenItems.js';
import { HAZARD_HEX_COLORS } from '../constants/physics.js';
import { DIFFICULTY_CONFIG } from '../constants/aiRacer.js';
import { SPEED_STRIP, BOOST_TRACK } from '../constants/effects.js';
import type { SpeedStrip, BoostTrack } from '../types/game.js';
import { AudioManager } from './audio/AudioManager.js';

interface CarHazardState {
  inHazard: boolean;
  zoneType: string;
  drip: number;
  splashTimer: number;
}


export class GameEngine {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private cameraController: TopDownCamera;
  private track: TrackDefinition;
  private trackConfig: TrackConfig;
  private hazardSystem: HazardSystem;
  private carPhysics: CarPhysics;
  private playerController: CarController;
  private aiManager: AIManager | null = null;
  private collisionSystem: CollisionSystem;
  private raceManager: RaceManager;
  private startSequence: StartSequence;
  private minimap: Minimap;
  private inputManager: InputManager;
  private emitter: GameStateEmitter;

  private cars: CarState[] = [];
  private playerCar: CarState | null = null;
  private obstacles: ObstacleInfo[] = [];
  private tireMarks: TireMarkSystem | null = null;
  private collisionParticles: CollisionParticleSystem | null = null;
  private tireSmoke: TireSmokeSystem | null = null;
  private hazardSplash: HazardSplashSystem | null = null;
  private rainSystem: RainHazardSystem | null = null;
  private speedStrips: SpeedStrip[] = [];
  private boostTracks: BoostTrack[] = [];
  private trackGroup: THREE.Group | null = null;
  private carHazardState: Map<string, CarHazardState> = new Map();
  private audioManager: AudioManager | null = null;
  private animFrameId = 0;
  private lastTime = 0;
  private raceStarted = false;
  private playerFinished = false;
  private disposed = false;
  private paused = false;

  private readonly difficulty: Difficulty;

  constructor(
    canvas: HTMLCanvasElement,
    selectedTrackId: string,
    selectedCarId: string,
    totalLaps: number,
    difficulty: Difficulty,
    emitter: GameStateEmitter,
    reverse = false,
  ) {
    this.difficulty = difficulty;
    this.emitter = emitter;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87c1e8);
    this.scene.fog = new THREE.Fog(0x87c1e8, 400, 750);

    // Camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.cameraController = new TopDownCamera(aspect);

    // Lighting
    new LightingSetup().setup(this.scene);

    // Table
    const tableScene = new TableScene();
    this.scene.add(tableScene.build());

    // Track — look up config by ID, fallback to first track
    let trackConfig = TRACKS.find(t => t.id === selectedTrackId) ?? TRACKS[0];
    if (selectedTrackId === '__editor__') {
      const stored = sessionStorage.getItem('editor_track');
      if (stored) trackConfig = JSON.parse(stored) as typeof TRACKS[0];
    }
    this.trackConfig = trackConfig;
    this.track = new TrackDefinition(trackConfig, reverse);
    this.speedStrips = trackConfig.speedStrips ?? [];
    this.boostTracks = trackConfig.boostTracks ?? [];
    const trackBuilder = new TrackBuilder();
    this.trackGroup = trackBuilder.build(this.track, this.trackConfig.tunnels ?? [], this.speedStrips, this.boostTracks);
    this.scene.add(this.trackGroup);

    // Hazards
    this.hazardSystem = new HazardSystem(this.track);
    this.scene.add(this.hazardSystem.buildMeshes());

    // Placed objects from track config (editor-placed items)
    for (const obj of (this.trackConfig.objects ?? [])) {
      const factory = KITCHEN_ITEM_FACTORIES[obj.type];
      if (!factory) continue;
      const item = factory();
      item.position.set(obj.x, obj.y ?? 0, obj.z);
      item.rotation.y = obj.rotation;
      item.scale.setScalar(obj.scale * 4);
      this.scene.add(item);
    }

    // Placed lights from track config
    for (const light of (this.trackConfig.lights ?? [])) {
      if (light.type === 'point') {
        const pl = new THREE.PointLight(light.color, light.intensity, light.distance);
        pl.position.set(light.x, light.y, light.z);
        this.scene.add(pl);
      } else if (light.type === 'spot') {
        const sl = new THREE.SpotLight(light.color, light.intensity, light.distance,
          light.angle ?? 0.4, light.penumbra ?? 0.2);
        sl.position.set(light.x, light.y, light.z);
        const target = new THREE.Object3D();
        target.position.set(light.targetX ?? light.x, 0, light.targetZ ?? light.z);
        this.scene.add(target);
        sl.target = target;
        this.scene.add(sl);
      }
    }

    // No obstacles
    this.obstacles = [];

    // Cars
    this.carPhysics = new CarPhysics();
    this.playerController = new CarController(this.carPhysics);

    // AI manager (before setupCars so addCar can register vehicles)
    this.aiManager = new AIManager(this.track, this.carPhysics, this.difficulty, this.obstacles, this.track.hazardZones);

    const carFactory = new CarFactory();
    this.setupCars(carFactory, selectedCarId);

    // Link AI vehicles for SeparationBehavior (one-time setup)
    this.aiManager.linkNeighbors();

    // Tire smoke (created before collision particles so it can be passed in)
    this.tireSmoke = new TireSmokeSystem(this.scene);

    // Collision
    this.collisionSystem = new CollisionSystem(this.track, this.obstacles, this.carPhysics);

    // Collision particles (uses TireSmokeSystem for smoke)
    this.collisionParticles = new CollisionParticleSystem(this.scene, this.tireSmoke);
    this.collisionSystem.onCollision = (pos, dir, color, carVelocity) => {
      this.collisionParticles?.emit(pos, dir, color, carVelocity);
      this.audioManager?.onCollision(pos);
    };

    // Audio
    this.audioManager = new AudioManager(this.cameraController.camera);
    for (const car of this.cars) this.audioManager.addCar(car, car.isPlayer);
    const resumeOnce = () => { this.audioManager?.resumeAudio(); window.removeEventListener('click', resumeOnce); };
    window.addEventListener('click', resumeOnce);

    // Race
    this.raceManager = new RaceManager(this.track, totalLaps);
    this.startSequence = new StartSequence();
    this.minimap = new Minimap(this.track);

    // Tire marks
    this.tireMarks = new TireMarkSystem(this.scene);

    // Hazard splash particles
    this.hazardSplash = new HazardSplashSystem(this.scene);

    // Rain zones
    const rainZones = trackConfig.rainZones ?? [];
    if (rainZones.length > 0) {
      this.rainSystem = new RainHazardSystem(this.scene);
      for (const rz of rainZones) {
        this.rainSystem.addSplineZone(this.track, rz);
      }
    }

    // Input
    this.inputManager = new InputManager();

    // Resize handler
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    // Start countdown
    this.startSequence.start(() => {
      this.raceStarted = true;
      this.raceManager.start();
      const now = performance.now();
      for (const car of this.cars) {
        car.currentLapStart = now;
        car.lastCheckpointTime = now;
      }
    });

    // Start render loop
    this.lastTime = performance.now();
    this.loop();
  }

  private setupCars(factory: CarFactory, selectedCarId: string): void {
    const trackLength = this.track.getLength();

    const playerDef = CAR_DEFINITIONS.find((c) => c.id === selectedCarId) ?? CAR_DEFINITIONS[0];
    const aiDefs = CAR_DEFINITIONS.filter((c) => c.id !== selectedCarId);

    const allDefs: { def: CarDefinition; isPlayer: boolean }[] = aiDefs.map((def) => ({ def, isPlayer: false }));
    const slot = Math.floor(Math.random() * (allDefs.length + 1));
    allDefs.splice(slot, 0, { def: playerDef, isPlayer: true });

    const rowSpacing = 22;
    const staggerOffset = 11;
    const lateralSpacing = 16;

    for (let i = 0; i < allDefs.length; i++) {
      const { def, isPlayer } = allDefs[i];
      const col = i % 2;
      const row = Math.floor(i / 2);

      const carMesh = factory.createCar(def);

      const backDist = row * rowSpacing + col * staggerOffset;
      const tOffset = backDist / trackLength;
      const carT = ((0 - tOffset) % 1 + 1) % 1;

      const splinePos = this.track.getPointAt(carT);
      const splineTangent = this.track.getTangentAt(carT);
      const splineNormal = this.track.getNormalAt(carT);
      const carRotation = Math.atan2(splineTangent.x, splineTangent.z);

      const sideOffset = splineNormal.clone().multiplyScalar((col - 0.5) * lateralSpacing);
      const pos = splinePos.clone().add(sideOffset);
      pos.y = 0.01;

      carMesh.position.copy(pos);
      carMesh.rotation.y = carRotation;
      this.scene.add(carMesh);

      if (!isPlayer) {
        const nameplate = factory.createNameplate(def.name, def.color);
        carMesh.add(nameplate);
      }

      const numCheckpoints = this.track.checkpoints.length;
      const car: CarState = {
        id: def.id,
        definition: def,
        mesh: carMesh,
        position: pos.clone(),
        rotation: carRotation,
        velocityAngle: carRotation,
        speed: 0,
        lateralVelocity: 0,
        isSkidding: false,
        isBraking: false,
        steeringAngle: 0,
        currentT: carT,
        previousT: carT,
        hasPassedHalfway: false,
        hasPassedQuarter: false,
        hasPassedThreeQuarter: false,
        completedLaps: 0,
        bestLapTime: 0,
        currentLapStart: 0,
        totalTime: 0,
        finished: false,
        finishTime: 0,
        isPlayer,
        checkpointBests: new Array(numCheckpoints).fill(0),
        lastCheckpointTime: 0,
        lastCheckpointSegmentTime: 0,
        lastCheckpointBestTime: 0,
        lastCheckpointCrossedAt: 0,
        hazardSteerFactor: 1.0,
        burnoutTimer: 0,
        boostMultiplier: 1.0,
        boostDecayRate: 0,
        accelBoostTimer: 0,
        accelBoostMultiplier: 1.0,
        pushVelocityX: 0,
        pushVelocityZ: 0,
      };

      this.cars.push(car);
      this.carHazardState.set(def.id, { inHazard: false, zoneType: '', drip: 0, splashTimer: 0 });

      if (isPlayer) {
        this.playerCar = car;
      } else {
        const diffParams = DIFFICULTY_CONFIG[this.difficulty];
        const [minSkill, maxSkill] = diffParams.skillRange;
        const skill = minSkill + Math.random() * (maxSkill - minSkill);
        this.aiManager!.addCar(def.id, skill, diffParams);
      }
    }
  }

  pause(): void {
    this.paused = true;
    this.inputManager.clearKeys();
  }

  resume(): void {
    this.paused = false;
    this.lastTime = performance.now();
  }

  getTrackConfig(): TrackConfig {
    return this.trackConfig;
  }

  private loop = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    // Update countdown
    const countdown = this.startSequence.update();

    if (this.paused) {
      this.renderer.render(this.scene, this.cameraController.camera);
      this.animFrameId = requestAnimationFrame(this.loop);
      return;
    }

    if (this.raceStarted) {
      // Player input
      if (this.playerCar && !this.playerCar.finished) {
        const input = this.inputManager.getState();
        this.playerController.update(this.playerCar, input, dt);
        this.updateCarHazard(this.playerCar, dt);
      }

      // Race management (must run before AI so currentT is fresh)
      this.raceManager.update(this.cars, dt);

      // AI updates
      this.aiManager?.update(this.cars, dt);
      for (const car of this.cars) {
        if (!car.isPlayer) this.updateCarHazard(car, dt);
      }

      // Boost detection (speed strips + boost tracks)
      this.updateBoosts(dt);

      // Rain
      this.rainSystem?.update(dt, this.cars);

      // Tire marks and smoke for skidding or braking cars
      for (const car of this.cars) {
        if (car.isSkidding || car.isBraking) this.tireMarks?.addMarks(car);
        if (car.isSkidding) this.tireSmoke?.emitForCar(car, dt);
        if (car.accelBoostTimer > 0) this.tireMarks?.addFireMarks(car);
      }

      // Update tire mark fading
      this.tireMarks?.update(dt);

      // Update tire smoke
      this.tireSmoke?.update(dt);

      // Update collision particles
      this.collisionParticles?.update(dt);

      // Update hazard splash particles
      this.hazardSplash?.update(dt);

      // Collisions
      this.collisionSystem.update(this.cars, dt);

      // Audio
      this.audioManager?.update(this.cars, this.playerCar ?? null, this.cameraController.camera);

      // Check if player just finished
      if (this.playerCar?.finished && !this.playerFinished) {
        this.playerFinished = true;
      }
    }

    // Camera follows player
    if (this.playerCar) {
      this.cameraController.update(this.playerCar.position, this.playerCar.speed, this.playerCar.definition.maxSpeed, this.playerCar.rotation);
    }

    // Update animated track materials
    if (this.trackGroup) {
      TrackBuilder.updateAnimatedMaterials(this.trackGroup, now / 1000);
    }

    // Render
    this.renderer.render(this.scene, this.cameraController.camera);

    // Emit state to React
    this.emitState(countdown);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private updateBoosts(dt: number): void {
    for (const car of this.cars) {
      // Speed strip crossing detection
      for (const strip of this.speedStrips) {
        const crossed = (car.previousT < strip.t && car.currentT >= strip.t) ||
          (car.previousT > 0.9 && car.currentT < 0.1 && strip.t < car.currentT) ||
          (car.previousT > strip.t - 0.01 && car.currentT > strip.t && car.previousT < strip.t);
        if (crossed) {
          car.boostMultiplier = Math.max(car.boostMultiplier, SPEED_STRIP.maxSpeedCap);
          car.boostDecayRate = SPEED_STRIP.capDecayRate;
          car.accelBoostTimer = SPEED_STRIP.accelBoostDuration;
          car.accelBoostMultiplier = SPEED_STRIP.accelMultiplier;
        }
      }

      // Boost track lane detection
      let onBoostTrack = false;
      for (const bt of this.boostTracks) {
        const inTRange = bt.tStart <= bt.tEnd
          ? (car.currentT >= bt.tStart && car.currentT <= bt.tEnd)
          : (car.currentT >= bt.tStart || car.currentT <= bt.tEnd);
        if (!inTRange) continue;

        // Check lateral position
        const center = this.track.getPointAt(car.currentT);
        const normal = this.track.getNormalAt(car.currentT);
        const tocar = car.position.x - center.x;
        const tocarz = car.position.z - center.z;
        const lateralPos = tocar * normal.x + tocarz * normal.z;
        const sideSign = bt.side === 'left' ? 1 : -1;
        const laneCenter = (this.track.width / 2 - this.track.width * BOOST_TRACK.widthFraction / 2) * sideSign;
        const laneHalfWidth = this.track.width * BOOST_TRACK.widthFraction / 2;
        if (Math.abs(lateralPos - laneCenter) < laneHalfWidth) {
          onBoostTrack = true;
          car.boostMultiplier = Math.max(car.boostMultiplier, BOOST_TRACK.speedMultiplier);
          car.boostDecayRate = 0; // Don't decay while on track
          break;
        }
      }

      // Decay boost back to 1.0
      if (!onBoostTrack && car.boostMultiplier > 1.0) {
        if (car.boostDecayRate > 0) {
          car.boostMultiplier = Math.max(1.0, car.boostMultiplier - car.boostDecayRate * dt);
        }
      }
    }
  }

  private updateCarHazard(car: CarState, dt: number): void {
    const hs = this.carHazardState.get(car.id);
    if (!hs) return;

    const effect = this.hazardSystem.getEffect(car.position, car.currentT);

    if (effect) {
      this.carPhysics.applyHazardEffect(car, effect, dt);
      const wasInHazard = hs.inHazard;
      hs.inHazard = true;
      hs.zoneType = effect.zoneType;
      const color = HAZARD_HEX_COLORS[effect.zoneType] ?? 0xffffff;
      const sinR = Math.sin(car.rotation);
      const cosR = Math.cos(car.rotation);
      const frontX = car.position.x + sinR * 2.5;
      const frontZ = car.position.z + cosR * 2.5;
      const leftPos = new THREE.Vector3(frontX + cosR * 1.2, car.position.y, frontZ - sinR * 1.2);
      const rightPos = new THREE.Vector3(frontX - cosR * 1.2, car.position.y, frontZ + sinR * 1.2);
      if (!wasInHazard) {
        hs.drip = 0;
        hs.splashTimer = 0;
        if (Math.abs(car.speed) >= car.definition.maxSpeed * 0.1) {
          this.hazardSplash?.emit(leftPos, color, car.speed, car.definition.maxSpeed, 28, car.rotation);
          this.hazardSplash?.emit(rightPos, color, car.speed, car.definition.maxSpeed, 27, car.rotation);
          if (car.isPlayer) this.audioManager?.onSplash();
        }
      } else if (Math.abs(car.speed) >= car.definition.maxSpeed * 0.1) {
        hs.splashTimer -= dt;
        if (hs.splashTimer <= 0) {
          hs.splashTimer = 0.06;
          this.hazardSplash?.emit(leftPos, color, car.speed, car.definition.maxSpeed, 4, car.rotation);
          this.hazardSplash?.emit(rightPos, color, car.speed, car.definition.maxSpeed, 4, car.rotation);
        }
      }
      this.tireMarks?.addSubstanceMarks(car, hs.zoneType);
    } else {
      if (hs.inHazard) {
        hs.inHazard = false;
        hs.drip = 60;
      }
      if (hs.drip > 0) {
        this.tireMarks?.addSubstanceMarks(car, hs.zoneType);
        hs.drip--;
      }
    }
  }

  private emitState(countdown: number): void {
    if (!this.playerCar) return;

    const positions = this.raceManager.getPositions(this.cars);
    const playerIndex = positions.findIndex((c) => c.isPlayer);
    const now = performance.now();

    const flashAge = this.playerCar.lastCheckpointCrossedAt > 0
      ? now - this.playerCar.lastCheckpointCrossedAt
      : Infinity;

    const state: GameState = {
      playerSpeed: Math.abs(this.playerCar.speed),
      playerMaxSpeed: this.playerCar.definition.maxSpeed,
      playerLap: this.playerCar.completedLaps + 1,
      totalLaps: this.raceManager.getTotalLaps(),
      playerBestLap: this.playerCar.bestLapTime,
      currentLapTime: this.playerCar.currentLapStart > 0
        ? now - this.playerCar.currentLapStart
        : 0,
      playerPosition: playerIndex + 1,
      totalCars: this.cars.length,
      raceStarted: this.raceStarted,
      raceFinished: !this.raceManager.isActive() && this.raceStarted,
      countdown,
      countdownActive: this.startSequence.isActive(),
      results: this.raceManager.getResults(this.cars),
      carPositions: this.minimap.getCarPositions(this.cars),
      trackPoints: this.minimap.getTrackPoints(),
      startFinish: this.minimap.getStartFinish(),
      playerFinished: this.playerFinished,
      checkpointSegmentTime: this.playerCar.lastCheckpointSegmentTime,
      checkpointBestTime: this.playerCar.lastCheckpointBestTime,
      checkpointFlashAge: flashAge,
      isWrongWay: this.raceManager.isWrongWay(this.playerCar.id),
    };

    this.emitter.emit(state, countdown >= 0);
  }

  private handleResize(): void {
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
    window.removeEventListener('resize', this.handleResize);
    this.inputManager.dispose();
    this.audioManager?.dispose();
    this.tireMarks?.dispose();
    this.tireSmoke?.dispose();
    this.collisionParticles?.dispose();
    this.hazardSplash?.dispose();
    this.rainSystem?.dispose();
    this.aiManager?.dispose();
    this.emitter.clear();
    this.renderer.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      if (obj instanceof THREE.Sprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });
  }
}
