import * as THREE from 'three';
import type { CarState, VersusGameState, VersusRoundState, VersusStats } from '../types/game.js';
import { CAR_DEFINITIONS } from '../constants/cars.js';
import { TRACKS } from '../constants/track.js';
import type { TrackConfig } from '../constants/track.js';
import type { VersusStateEmitter } from '../state/VersusStateEmitter.js';
import { InputManager } from './InputManager.js';
import { TrackDefinition } from './track/TrackDefinition.js';
import { TrackBuilder } from './track/TrackBuilder.js';
import { HazardSystem } from './track/HazardSystem.js';
import { TableScene } from './scene/TableScene.js';
import { LightingSetup } from './scene/LightingSetup.js';
import { TopDownCamera } from './camera/TopDownCamera.js';
import { CarFactory } from './car/CarFactory.js';
import { CarPhysics } from './car/CarPhysics.js';
import { CarController } from './car/CarController.js';
import { CollisionSystem } from './collision/CollisionSystem.js';
import { StartSequence } from './race/StartSequence.js';
import { VersusRaceManager } from './race/VersusRaceManager.js';
import { TireMarkSystem } from './scene/TireMarkSystem.js';
import { CollisionParticleSystem } from './effects/CollisionParticleSystem.js';
import { TireSmokeSystem } from './effects/TireSmokeSystem.js';
import { HazardSplashSystem } from './effects/HazardSplashSystem.js';
import { RainHazardSystem } from './effects/RainHazardSystem.js';
import { Minimap } from './race/Minimap.js';
import { KITCHEN_ITEM_FACTORIES } from './scene/KitchenItems.js';
import { HAZARD_HEX_COLORS } from '../constants/physics.js';
import { SPEED_STRIP, BOOST_TRACK } from '../constants/effects.js';
import type { SpeedStrip, BoostTrack } from '../types/game.js';
import { AudioManager } from './audio/AudioManager.js';

interface CarHazardState {
  inHazard: boolean;
  zoneType: string;
  drip: number;
  splashTimer: number;
}

export class VersusGameEngine {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private cameraController: TopDownCamera;
  private track: TrackDefinition;
  private hazardSystem: HazardSystem;
  private p1Physics: CarPhysics;
  private p2Physics: CarPhysics;
  private p1Controller: CarController;
  private p2Controller: CarController;
  private collisionSystem: CollisionSystem;
  private versusRaceManager: VersusRaceManager;
  private startSequence: StartSequence;
  private inputManager: InputManager;
  private emitter: VersusStateEmitter;

  private car1: CarState | null = null;
  private car2: CarState | null = null;
  private cars: CarState[] = [];

  private minimap: Minimap | null = null;
  private tireMarks: TireMarkSystem | null = null;
  private collisionParticles: CollisionParticleSystem | null = null;
  private tireSmoke: TireSmokeSystem | null = null;
  private hazardSplash: HazardSplashSystem | null = null;
  private rainSystem: RainHazardSystem | null = null;
  private speedStrips: SpeedStrip[] = [];
  private boostTracks: BoostTrack[] = [];
  private trackGroup: THREE.Group | null = null;
  private carHazardState: Map<string, CarHazardState> = new Map();

  private p1Score = 0;
  private p2Score = 0;
  private readonly pointsToWin = 3;
  private roundState: VersusRoundState = 'countdown';
  private roundWinner: 1 | 2 | null = null;
  private matchWinner: 1 | 2 | null = null;
  private raceStarted = false;

  private pointScoredTimer = 0;
  private resettingTimer = 0;
  private offScreenCounter1 = 0;
  private offScreenCounter2 = 0;

  private readonly p1Name: string;
  private readonly p2Name: string;

  private stats: VersusStats = {
    p1TopSpeed: 0,
    p2TopSpeed: 0,
    p1TotalDrift: 0,
    p2TotalDrift: 0,
    p1TimeInLead: 0,
    p2TimeInLead: 0,
    closestGap: Infinity,
  };

  private audioManager: AudioManager | null = null;
  private animFrameId = 0;
  private lastTime = 0;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    trackId: string,
    p1CarId: string,
    p2CarId: string,
    p1Name: string,
    p2Name: string,
    emitter: VersusStateEmitter,
    reverse = false,
  ) {
    this.emitter = emitter;
    this.p1Name = p1Name;
    this.p2Name = p2Name;

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

    let trackConfig = TRACKS.find(t => t.id === trackId) ?? TRACKS[0];
    if (trackId === '__editor__') {
      const stored = sessionStorage.getItem('editor_track');
      if (stored) trackConfig = JSON.parse(stored) as TrackConfig;
    }
    this.track = new TrackDefinition(trackConfig, reverse);
    this.speedStrips = trackConfig.speedStrips ?? [];
    this.boostTracks = trackConfig.boostTracks ?? [];
    this.trackGroup = new TrackBuilder().build(this.track, trackConfig.tunnels ?? [], this.speedStrips, this.boostTracks);
    this.scene.add(this.trackGroup);

    this.hazardSystem = new HazardSystem(this.track);
    this.scene.add(this.hazardSystem.buildMeshes());

    for (const obj of (trackConfig.objects ?? [])) {
      const factory = KITCHEN_ITEM_FACTORIES[obj.type];
      if (!factory) continue;
      const item = factory();
      item.position.set(obj.x, obj.y ?? 0, obj.z);
      item.rotation.y = obj.rotation;
      item.scale.setScalar(obj.scale * 4);
      this.scene.add(item);
    }

    for (const light of (trackConfig.lights ?? [])) {
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

    this.p1Physics = new CarPhysics();
    this.p2Physics = new CarPhysics();
    this.p1Controller = new CarController(this.p1Physics);
    this.p2Controller = new CarController(this.p2Physics);

    this.setupCars(new CarFactory(), p1CarId, p2CarId);

    this.tireSmoke = new TireSmokeSystem(this.scene);
    // Use p1Physics for boundary collision — bounceFromBoundary only reads/writes CarState
    this.collisionSystem = new CollisionSystem(this.track, [], this.p1Physics);
    this.collisionParticles = new CollisionParticleSystem(this.scene, this.tireSmoke);
    this.collisionSystem.onCollision = (pos, dir, color, carVelocity) => {
      this.collisionParticles?.emit(pos, dir, color, carVelocity);
      this.audioManager?.onCollision(pos);
    };

    this.versusRaceManager = new VersusRaceManager(this.track);
    this.startSequence = new StartSequence();
    this.minimap = new Minimap(this.track);
    this.tireMarks = new TireMarkSystem(this.scene);
    this.hazardSplash = new HazardSplashSystem(this.scene);

    // Rain zones
    const rainZones = trackConfig.rainZones ?? [];
    if (rainZones.length > 0) {
      this.rainSystem = new RainHazardSystem(this.scene);
      for (const rz of rainZones) {
        this.rainSystem.addSplineZone(this.track, rz);
      }
    }

    this.inputManager = new InputManager();

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    // Audio
    this.audioManager = new AudioManager(this.cameraController.camera);
    if (this.car1) this.audioManager.addCar(this.car1, true);
    if (this.car2) this.audioManager.addCar(this.car2, true);
    const resumeOnce = () => { this.audioManager?.resumeAudio(); window.removeEventListener('click', resumeOnce); };
    window.addEventListener('click', resumeOnce);

    this.startRound();

    this.lastTime = performance.now();
    this.loop();
  }

  private setupCars(factory: CarFactory, p1CarId: string, p2CarId: string): void {
    const trackLength = this.track.getLength();

    let p1Def = CAR_DEFINITIONS.find(c => c.id === p1CarId) ?? CAR_DEFINITIONS[0];
    let p2Def = CAR_DEFINITIONS.find(c => c.id === p2CarId) ?? CAR_DEFINITIONS[0];

    // If same car, give distinct colors — never mutate CAR_DEFINITIONS
    if (p1CarId === p2CarId) {
      p1Def = { ...p1Def, color: 0x1565C0, accentColor: 0x90caf9 };
      p2Def = { ...p2Def, color: 0xB71C1C, accentColor: 0xef9a9a };
    }

    const lateralSpacing = 14;
    const staggerDist = 11;
    const t1 = ((0 - staggerDist / trackLength) % 1 + 1) % 1;
    const t2 = ((0 - (staggerDist * 2) / trackLength) % 1 + 1) % 1;

    const numCheckpoints = this.track.checkpoints.length;

    const makeCar = (def: typeof p1Def, t: number, side: number, carId: string): CarState => {
      const splinePos = this.track.getPointAt(t);
      const splineTangent = this.track.getTangentAt(t);
      const splineNormal = this.track.getNormalAt(t);
      const carRotation = Math.atan2(splineTangent.x, splineTangent.z);
      const pos = splinePos.clone().add(splineNormal.clone().multiplyScalar(side * lateralSpacing / 2));
      pos.y = 0.01;

      const carMesh = factory.createCar(def);
      carMesh.position.copy(pos);
      carMesh.rotation.y = carRotation;
      this.scene.add(carMesh);

      return {
        id: carId,
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
        currentT: t,
        previousT: t,
        hasPassedHalfway: false,
        hasPassedQuarter: false,
        hasPassedThreeQuarter: false,
        completedLaps: 0,
        bestLapTime: 0,
        currentLapStart: 0,
        totalTime: 0,
        finished: false,
        finishTime: 0,
        isPlayer: true,
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
    };

    this.car1 = makeCar(p1Def, t1, -1, 'player1');
    this.car1.mesh.add(factory.createNameplate(this.p1Name, p1Def.color));
    this.car2 = makeCar(p2Def, t2, 1, 'player2');
    this.car2.mesh.add(factory.createNameplate(this.p2Name, p2Def.color));
    this.cars = [this.car1, this.car2];
    this.carHazardState.set('player1', { inHazard: false, zoneType: '', drip: 0, splashTimer: 0 });
    this.carHazardState.set('player2', { inHazard: false, zoneType: '', drip: 0, splashTimer: 0 });
  }

  private startRound(): void {
    this.roundState = 'countdown';
    this.roundWinner = null;
    this.raceStarted = false;
    this.offScreenCounter1 = 0;
    this.offScreenCounter2 = 0;
    this.startSequence = new StartSequence();
    this.startSequence.start(() => {
      this.raceStarted = true;
      this.roundState = 'racing';
    });
  }

  private isOffScreen(worldPos: THREE.Vector3): boolean {
    const ndc = worldPos.clone().project(this.cameraController.camera);
    return Math.abs(ndc.x) > 1.05 || Math.abs(ndc.y) > 1.05;
  }

  private resetCarsToMidpoint(): void {
    if (!this.car1 || !this.car2) return;
    const [spawn1, spawn2] = this.versusRaceManager.getRoundResetPositions(this.car1, this.car2);

    const resetCar = (car: CarState, spawn: { pos: THREE.Vector3; rot: number }) => {
      car.position.copy(spawn.pos);
      car.rotation = spawn.rot;
      car.velocityAngle = spawn.rot;
      car.speed = 0;
      car.lateralVelocity = 0;
      car.steeringAngle = 0;
      car.mesh.position.copy(spawn.pos);
      car.mesh.rotation.y = spawn.rot;
      car.currentT = this.track.getClosestT(spawn.pos);
      car.previousT = car.currentT;
      car.hasPassedHalfway = false;
      car.hasPassedQuarter = false;
      car.hasPassedThreeQuarter = false;
    };

    resetCar(this.car1, spawn1);
    resetCar(this.car2, spawn2);
    this.inputManager.clearKeys();
  }

  private awardPoint(player: 1 | 2): void {
    if (player === 1) this.p1Score++;
    else this.p2Score++;
    this.roundWinner = player;
    this.roundState = 'point_scored';
    this.pointScoredTimer = 2.0;
    this.offScreenCounter1 = 0;
    this.offScreenCounter2 = 0;

    if (this.p1Score >= this.pointsToWin) this.matchWinner = 1;
    else if (this.p2Score >= this.pointsToWin) this.matchWinner = 2;
  }

  private updateStats(dt: number): void {
    if (!this.car1 || !this.car2) return;
    this.stats.p1TopSpeed = Math.max(this.stats.p1TopSpeed, Math.abs(this.car1.speed));
    this.stats.p2TopSpeed = Math.max(this.stats.p2TopSpeed, Math.abs(this.car2.speed));
    if (this.car1.isSkidding) this.stats.p1TotalDrift += Math.abs(this.car1.lateralVelocity) * dt;
    if (this.car2.isSkidding) this.stats.p2TotalDrift += Math.abs(this.car2.lateralVelocity) * dt;
    const gap = this.car1.position.distanceTo(this.car2.position);
    if (gap < this.stats.closestGap) this.stats.closestGap = gap;
    if (this.versusRaceManager.getBackCar(this.car1, this.car2) === 1) {
      this.stats.p2TimeInLead += dt * 1000;
    } else {
      this.stats.p1TimeInLead += dt * 1000;
    }
  }

  private updateBoosts(dt: number): void {
    for (const car of this.cars) {
      for (const strip of this.speedStrips) {
        const crossed = (car.previousT < strip.t && car.currentT >= strip.t) ||
          (car.previousT > 0.9 && car.currentT < 0.1 && strip.t < car.currentT);
        if (crossed) {
          car.boostMultiplier = Math.max(car.boostMultiplier, SPEED_STRIP.maxSpeedCap);
          car.boostDecayRate = SPEED_STRIP.capDecayRate;
          car.accelBoostTimer = SPEED_STRIP.accelBoostDuration;
          car.accelBoostMultiplier = SPEED_STRIP.accelMultiplier;
        }
      }
      let onBoostTrack = false;
      for (const bt of this.boostTracks) {
        const inTRange = bt.tStart <= bt.tEnd
          ? (car.currentT >= bt.tStart && car.currentT <= bt.tEnd)
          : (car.currentT >= bt.tStart || car.currentT <= bt.tEnd);
        if (!inTRange) continue;
        const center = this.track.getPointAt(car.currentT);
        const normal = this.track.getNormalAt(car.currentT);
        const lateralPos = (car.position.x - center.x) * normal.x + (car.position.z - center.z) * normal.z;
        const sideSign = bt.side === 'left' ? 1 : -1;
        const laneCenter = (this.track.width / 2 - this.track.width * BOOST_TRACK.widthFraction / 2) * sideSign;
        if (Math.abs(lateralPos - laneCenter) < this.track.width * BOOST_TRACK.widthFraction / 2) {
          onBoostTrack = true;
          car.boostMultiplier = Math.max(car.boostMultiplier, BOOST_TRACK.speedMultiplier);
          car.boostDecayRate = 0;
          break;
        }
      }
      if (!onBoostTrack && car.boostMultiplier > 1.0 && car.boostDecayRate > 0) {
        car.boostMultiplier = Math.max(1.0, car.boostMultiplier - car.boostDecayRate * dt);
      }
    }
  }

  private updateCarHazard(car: CarState, dt: number): void {
    const hs = this.carHazardState.get(car.id);
    if (!hs) return;
    const effect = this.hazardSystem.getEffect(car.position, car.currentT);
    if (effect) {
      const physics = car.id === 'player1' ? this.p1Physics : this.p2Physics;
      physics.applyHazardEffect(car, effect, dt);
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
          if (car.id === 'player1') this.audioManager?.onSplash();
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

  private loop = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const countdown = this.startSequence.update();

    switch (this.roundState) {
      case 'countdown':
        // raceStarted is set by startSequence callback, which also sets roundState='racing'
        break;

      case 'racing': {
        if (this.car1 && this.car2) {
          this.versusRaceManager.updateT(this.car1);
          this.versusRaceManager.updateT(this.car2);
          this.versusRaceManager.updateWrongWay(this.car1, dt);
          this.versusRaceManager.updateWrongWay(this.car2, dt);

          this.p1Controller.update(this.car1, this.inputManager.getStateP1(), dt);
          this.p2Controller.update(this.car2, this.inputManager.getStateP2(), dt);

          this.updateCarHazard(this.car1, dt);
          this.updateCarHazard(this.car2, dt);

          // Boost detection
          this.updateBoosts(dt);

          // Rain
          this.rainSystem?.update(dt, this.cars);

          for (const car of this.cars) {
            if (car.isSkidding || car.isBraking) this.tireMarks?.addMarks(car);
            if (car.isSkidding) this.tireSmoke?.emitForCar(car, dt);
            if (car.accelBoostTimer > 0) this.tireMarks?.addFireMarks(car);
          }
          this.tireMarks?.update(dt);
          this.tireSmoke?.update(dt);
          this.collisionParticles?.update(dt);
          this.hazardSplash?.update(dt);
          this.collisionSystem.update(this.cars, dt);

          this.audioManager?.update(this.cars, this.car1, this.cameraController.camera);

          this.updateStats(dt);

          const car1Off = this.isOffScreen(this.car1.position);
          const car2Off = this.isOffScreen(this.car2.position);

          if (car1Off || car2Off) {
            // Front car wins whenever either car leaves the screen
            const backCar = this.versusRaceManager.getBackCar(this.car1, this.car2);
            if (backCar === 1) { this.offScreenCounter1++; this.offScreenCounter2 = 0; }
            else { this.offScreenCounter2++; this.offScreenCounter1 = 0; }
          } else {
            this.offScreenCounter1 = 0;
            this.offScreenCounter2 = 0;
          }

          const HYSTERESIS = 2;
          if (this.offScreenCounter1 >= HYSTERESIS) this.awardPoint(2);
          else if (this.offScreenCounter2 >= HYSTERESIS) this.awardPoint(1);
        }
        break;
      }

      case 'point_scored':
        this.pointScoredTimer -= dt;
        if (this.pointScoredTimer <= 0) {
          if (this.matchWinner) {
            this.roundState = 'match_over';
          } else {
            this.roundState = 'resetting';
            this.resettingTimer = 0.5;
          }
        }
        break;

      case 'resetting':
        this.resettingTimer -= dt;
        if (this.resettingTimer <= 0) {
          this.resetCarsToMidpoint();
          this.startRound();
        }
        break;

      case 'match_over':
        break;
    }

    if (this.car1 && this.car2) {
      this.cameraController.updateVersus(
        this.car1.position, this.car2.position,
        this.car1.speed, this.car1.definition.maxSpeed,
        this.car2.speed, this.car2.definition.maxSpeed,
      );
    }

    // Update animated track materials
    if (this.trackGroup) {
      TrackBuilder.updateAnimatedMaterials(this.trackGroup, now / 1000);
    }

    this.renderer.render(this.scene, this.cameraController.camera);
    this.emitState(countdown);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private emitState(countdown: number): void {
    if (!this.car1 || !this.car2) return;
    const state: VersusGameState = {
      p1Speed: Math.abs(this.car1.speed),
      p2Speed: Math.abs(this.car2.speed),
      p1MaxSpeed: this.car1.definition.maxSpeed,
      p2MaxSpeed: this.car2.definition.maxSpeed,
      p1Score: this.p1Score,
      p2Score: this.p2Score,
      pointsToWin: this.pointsToWin,
      roundState: this.roundState,
      roundWinner: this.roundWinner,
      matchWinner: this.matchWinner,
      countdown,
      countdownActive: this.startSequence.isActive(),
      raceStarted: this.raceStarted,
      p1Name: this.p1Name,
      p2Name: this.p2Name,
      p1Color: this.car1.definition.color,
      p2Color: this.car2.definition.color,
      stats: { ...this.stats },
      carPositions: this.minimap?.getCarPositions(this.cars) ?? [],
      trackPoints: this.minimap?.getTrackPoints() ?? [],
      p1WrongWay: this.versusRaceManager.isWrongWay(this.car1.id),
      p2WrongWay: this.versusRaceManager.isWrongWay(this.car2.id),
      startFinish: this.minimap?.getStartFinish() ?? null,
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
