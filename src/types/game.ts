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
  speed: number;
  lateralVelocity: number; // sideways slip velocity
  isSkidding: boolean;
  isBraking: boolean;
  steeringAngle: number;
  currentT: number; // spline parameter 0-1
  previousT: number;
  completedLaps: number;
  bestLapTime: number;
  currentLapStart: number;
  totalTime: number;
  finished: boolean;
  finishTime: number;
  isPlayer: boolean;
}

export interface HazardZone {
  type: 'juice' | 'oil' | 'food';
  tStart: number;
  tEnd: number;
  lateralOffset: number;
  width: number;
  mesh?: THREE.Mesh;
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
