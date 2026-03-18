import type { HazardZone } from '../types/game.js';

export interface TrackConfig {
  id: string;
  name: string;
  controlPoints: [number, number, number][];
  hazards: HazardZone[];
  width: number;
}

export const TRACK_SAMPLES = 600;

export const TRACKS: TrackConfig[] = [
  {
    id: 'silverstone',
    name: 'Silverstone',
    controlPoints: [
      [0, 0, -80], [40, 0, -85], [80, 0, -88], [115, 0, -75], [130, 0, -50],
      [125, 0, -20], [110, 0, 5], [120, 0, 25], [135, 0, 45], [120, 0, 65],
      [90, 0, 75], [40, 0, 80], [-20, 0, 78], [-80, 0, 68], [-120, 0, 40],
      [-140, 0, 10], [-135, 0, -20], [-110, 0, -40], [-75, 0, -55], [-40, 0, -65],
      [-10, 0, -60], [20, 0, -70], [30, 0, -80],
    ],
    hazards: [
      { type: 'juice', tStart: 0.15, tEnd: 0.20, lateralOffset: 1, width: 4 },
      { type: 'oil', tStart: 0.35, tEnd: 0.39, lateralOffset: -1, width: 3 },
      { type: 'food', tStart: 0.55, tEnd: 0.60, lateralOffset: 0, width: 5 },
      { type: 'oil', tStart: 0.82, tEnd: 0.86, lateralOffset: -1.5, width: 3 },
    ],
    width: 32,
  },
  {
    id: 'monaco',
    name: 'Monaco',
    controlPoints: [
      [0, 0, -40], [35, 0, -50], [65, 0, -50], [80, 0, -35], [85, 0, -10],
      [75, 0, 15], [55, 0, 30], [40, 0, 40], [20, 0, 45], [5, 0, 35],
      [-10, 0, 20], [-20, 0, 5], [-22, 0, -10], [-12, 0, -22], [10, 0, -30], [30, 0, -38],
    ],
    hazards: [
      { type: 'oil', tStart: 0.20, tEnd: 0.25, lateralOffset: 0, width: 3 },
      { type: 'juice', tStart: 0.55, tEnd: 0.60, lateralOffset: 1, width: 4 },
      { type: 'food', tStart: 0.80, tEnd: 0.85, lateralOffset: -1, width: 3 },
    ],
    width: 22,
  },
  {
    id: 'spa',
    name: 'Spa',
    controlPoints: [
      [0, 0, -100], [30, 0, -110], [60, 0, -100], [75, 0, -80], [70, 0, -55],
      [55, 0, -35], [65, 0, -15], [60, 0, 15], [30, 0, 30], [-10, 0, 35],
      [-50, 0, 25], [-80, 0, 10], [-100, 0, 25], [-120, 0, 50], [-130, 0, 75],
      [-115, 0, 95], [-80, 0, 105], [-30, 0, 110], [20, 0, 100],
      [60, 0, 80], [80, 0, 60], [65, 0, 45], [30, 0, -40], [10, 0, -70],
    ],
    hazards: [
      { type: 'oil', tStart: 0.12, tEnd: 0.17, lateralOffset: -2, width: 4 },
      { type: 'juice', tStart: 0.40, tEnd: 0.45, lateralOffset: 1, width: 5 },
      { type: 'food', tStart: 0.70, tEnd: 0.75, lateralOffset: 0, width: 4 },
    ],
    width: 34,
  },
  {
    id: 'monza',
    name: 'Monza',
    controlPoints: [
      [0, 0, -130], [50, 0, -140], [90, 0, -138],
      [120, 0, -120], [140, 0, -100], [125, 0, -80],
      [150, 0, -55], [155, 0, -20], [155, 0, 20],
      [145, 0, 50], [125, 0, 65], [140, 0, 80],
      [130, 0, 100], [100, 0, 120],
      [60, 0, 130], [20, 0, 128], [-20, 0, 118],
      [-60, 0, 98], [-80, 0, 65],
      [-100, 0, 65], [-125, 0, 25], [-135, 0, -20],
      [-120, 0, -70], [-75, 0, -115], [-40, 0, -135],
    ],
    hazards: [
      { type: 'juice', tStart: 0.10, tEnd: 0.15, lateralOffset: 2, width: 4 },
      { type: 'oil', tStart: 0.35, tEnd: 0.40, lateralOffset: -1, width: 3 },
      { type: 'food', tStart: 0.60, tEnd: 0.65, lateralOffset: 0, width: 5 },
      { type: 'oil', tStart: 0.85, tEnd: 0.90, lateralOffset: 1, width: 3 },
    ],
    width: 36,
  },
  {
    id: 'suzuka',
    name: 'Suzuka',
    controlPoints: [
      [0, 0, -90], [30, 0, -100], [65, 0, -95],
      [95, 0, -80], [110, 0, -60], [95, 0, -40],
      [75, 0, -20], [55, 0, 0],
      [35, 0, 15], [20, 0, 30], [35, 0, 45], [55, 0, 55], [65, 0, 70], [50, 0, 85],
      [20, 0, 90], [-10, 0, 85],
      [-35, 0, 70], [-50, 0, 55], [-40, 0, 40],
      [-55, 0, 20], [-80, 0, 5], [-100, 0, -20], [-95, 0, -50],
      [-70, 0, -65], [-45, 0, -75], [-20, 0, -80],
    ],
    hazards: [
      { type: 'oil', tStart: 0.15, tEnd: 0.20, lateralOffset: 0, width: 3 },
      { type: 'juice', tStart: 0.45, tEnd: 0.50, lateralOffset: -2, width: 4 },
      { type: 'food', tStart: 0.75, tEnd: 0.80, lateralOffset: 1, width: 3 },
    ],
    width: 28,
  },
  {
    id: 'interlagos',
    name: 'Interlagos',
    controlPoints: [
      [0, 0, -70], [-30, 0, -80],
      [-65, 0, -75], [-90, 0, -60], [-80, 0, -40], [-60, 0, -30],
      [-40, 0, -10], [-30, 0, 20], [-50, 0, 45],
      [-70, 0, 65], [-75, 0, 85], [-60, 0, 100],
      [-25, 0, 110], [20, 0, 105],
      [60, 0, 85], [85, 0, 55], [95, 0, 20], [85, 0, -20],
      [60, 0, -50], [30, 0, -65],
    ],
    hazards: [
      { type: 'juice', tStart: 0.18, tEnd: 0.23, lateralOffset: 1, width: 4 },
      { type: 'oil', tStart: 0.50, tEnd: 0.55, lateralOffset: -1, width: 3 },
      { type: 'food', tStart: 0.78, tEnd: 0.82, lateralOffset: 0, width: 4 },
    ],
    width: 30,
  },
  {
    id: 'cota',
    name: 'COTA',
    controlPoints: [
      [0, 0, -100], [-40, 0, -115], [-80, 0, -118],
      [-115, 0, -100], [-135, 0, -70],
      [-140, 0, -40], [-125, 0, -15], [-145, 0, 10], [-130, 0, 35], [-150, 0, 55],
      [-135, 0, 80], [-110, 0, 95], [-80, 0, 90],
      [-45, 0, 80], [-10, 0, 75],
      [25, 0, 65], [60, 0, 55], [80, 0, 35], [75, 0, 10],
      [55, 0, -15], [40, 0, -50], [20, 0, -80],
    ],
    hazards: [
      { type: 'oil', tStart: 0.10, tEnd: 0.15, lateralOffset: -2, width: 3 },
      { type: 'juice', tStart: 0.38, tEnd: 0.43, lateralOffset: 1, width: 5 },
      { type: 'food', tStart: 0.65, tEnd: 0.70, lateralOffset: 0, width: 4 },
      { type: 'oil', tStart: 0.88, tEnd: 0.92, lateralOffset: 2, width: 3 },
    ],
    width: 32,
  },
  {
    id: 'nurburgring',
    name: 'Nurburgring',
    controlPoints: [
      [0, 0, -90], [30, 0, -105], [65, 0, -108],
      [100, 0, -95], [120, 0, -70], [110, 0, -45],
      [90, 0, -25], [110, 0, -5],
      [105, 0, 20], [85, 0, 35], [95, 0, 55], [75, 0, 70],
      [45, 0, 85], [15, 0, 90], [-15, 0, 80],
      [-45, 0, 65], [-65, 0, 45], [-55, 0, 25],
      [-70, 0, 5], [-85, 0, -20], [-75, 0, -50],
      [-50, 0, -75], [-20, 0, -90],
    ],
    hazards: [
      { type: 'juice', tStart: 0.12, tEnd: 0.17, lateralOffset: 0, width: 4 },
      { type: 'oil', tStart: 0.42, tEnd: 0.47, lateralOffset: -1, width: 3 },
      { type: 'food', tStart: 0.72, tEnd: 0.77, lateralOffset: 2, width: 4 },
    ],
    width: 30,
  },
];

// Backwards-compatible exports for any remaining direct imports
export const TRACK_CONTROL_POINTS = TRACKS[0].controlPoints;
export const TRACK_WIDTH = TRACKS[0].width;
export const HAZARD_ZONES: HazardZone[] = TRACKS[0].hazards;
