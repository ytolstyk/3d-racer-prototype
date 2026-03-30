import type * as THREE from 'three';

export type RacePhase = 'menu' | 'trackSelect' | 'carSelect' | 'lapSelect' | 'racing' | 'finished';

export interface CarDefinition {
  id: string;
  name: string;
  color: number;
  accentColor: number;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  braking: number;
}

export interface CarState {
  id: string;
  definition: CarDefinition;
  mesh: THREE.Group;
  position: THREE.Vector3;
  rotation: number; // heading in radians
  velocityAngle: number; // direction of actual motion vector, in radians
  speed: number;
  lateralVelocity: number; // sideways slip velocity (derived each frame)
  isSkidding: boolean;
  isBraking: boolean;
  steeringAngle: number;
  currentT: number; // spline parameter 0-1
  previousT: number;
  hasPassedHalfway: boolean; // guard to prevent false lap on race start
  hasPassedQuarter: boolean; // additional guard for reverse cheating prevention
  completedLaps: number;
  bestLapTime: number;
  currentLapStart: number;
  totalTime: number;
  finished: boolean;
  finishTime: number;
  isPlayer: boolean;
  hazardSteerFactor: number; // 0-1, 1=normal, decays back each frame
  burnoutTimer: number;
  // Checkpoint state
  checkpointBests: number[];
  lastCheckpointTime: number;
  lastCheckpointSegmentTime: number;
  lastCheckpointBestTime: number;
  lastCheckpointCrossedAt: number;
}

export interface HazardZone {
  type: 'juice' | 'oil' | 'food' | 'milk' | 'butter';
  // T-range format (legacy, used for preset tracks)
  tStart?: number;
  tEnd?: number;
  lateralOffset?: number;
  width?: number;
  // Circle format (editor free placement)
  centerX?: number;
  centerZ?: number;
  radius?: number;
  mesh?: THREE.Object3D;
}

export interface HazardEffect {
  speedMultiplier: number;
  steeringMultiplier: number;
  lateralDrift: number;
}

export interface RaceResult {
  position: number;
  carId: string;
  name: string;
  color: number;
  totalTime: number;
  bestLap: number;
  isPlayer: boolean;
}

export interface GameState {
  playerSpeed: number;
  playerMaxSpeed: number;
  playerLap: number;
  totalLaps: number;
  playerBestLap: number;
  currentLapTime: number;
  playerPosition: number;
  totalCars: number;
  raceStarted: boolean;
  raceFinished: boolean;
  countdown: number; // 3,2,1,0 (0=GO)
  countdownActive: boolean;
  results: RaceResult[];
  carPositions: MinimapCar[];
  trackPoints: MinimapPoint[];
  playerFinished: boolean;
  // Checkpoint HUD
  checkpointSegmentTime: number;
  checkpointBestTime: number;
  checkpointFlashAge: number;
  isWrongWay: boolean;
}

export interface MinimapCar {
  x: number;
  z: number;
  color: number;
  isPlayer: boolean;
}

export interface MinimapPoint {
  x: number;
  z: number;
}

export interface ObstacleDef {
  type: string;
  position: THREE.Vector3;
  rotation?: number;
  scale?: number;
}

export type KitchenItemType =
  | 'mug' | 'spoon' | 'plate' | 'fork' | 'napkin'
  | 'saltShaker' | 'glass' | 'butterDish' | 'donut'
  | 'breadLoaf' | 'salami' | 'cheeseWedge' | 'apple'
  | 'berryCluster' | 'notepad' | 'pen' | 'pencil'
  | 'stickyNote' | 'cauliflower';

export interface PlacedObject {
  type: KitchenItemType;
  x: number;
  z: number;
  y?: number;
  rotation: number;
  scale: number;
}

export interface TunnelSection {
  tStart: number;
  tEnd: number;
}

export interface PhysicsTelemetry {
  speed: number;
  speedRatio: number;
  slipAngle: number;
  lateralVelocity: number;
  steeringAngle: number;
  driftResidual: number;
  gripFactor: number;
  throttleBlend: number;
  isSkidding: boolean;
  isBraking: boolean;
  burnoutTimer: number;
}

export type PhysicsGroup = 'physics' | 'drift' | 'controller';
