import { useReducer, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TrackConfig } from '../../constants/track.js';
import { TRACKS } from '../../constants/track.js';
import type { KitchenItemType, PlacedObject, TunnelSection, PlacedLight, LightType } from '../../types/game.js';
import { OBJECT_HEIGHTS } from '../../game/scene/KitchenItems.js';

type Tool = 'pen' | 'line' | 'eraser' | 'move' | 'startPoint' | 'insert' | 'object' | 'tunnel' | 'hazard' | 'light';

type HazardType = 'juice' | 'milk' | 'oil' | 'butter';

interface HazardDef {
  type: HazardType;
  centerX?: number;
  centerZ?: number;
  radius?: number;
  rotation?: number;
  tStart?: number;
  tEnd?: number;
  lateralOffset?: number;
  width?: number;
}

const LIGHT_COLOR_PRESETS = [
  { label: 'White', hex: 0xffffff, css: '#ffffff' },
  { label: 'Warm',  hex: 0xfff0cc, css: '#fff0cc' },
  { label: 'Cool',  hex: 0x88aaff, css: '#88aaff' },
  { label: 'Red',   hex: 0xff4444, css: '#ff4444' },
  { label: 'Green', hex: 0x44ff88, css: '#44ff88' },
  { label: 'Yel',   hex: 0xffdd44, css: '#ffdd44' },
];

const HAZARD_COLORS: Record<HazardType, string> = {
  juice:  'rgba(255, 136,   0, 0.55)',
  milk:   'rgba(210, 220, 255, 0.55)',
  oil:    'rgba( 60,  60,  10, 0.70)',
  butter: 'rgba(245, 208,  32, 0.55)',
};

const KITCHEN_ITEM_TYPES: KitchenItemType[] = [
  'mug', 'spoon', 'plate', 'fork', 'napkin',
  'saltShaker', 'glass', 'butterDish', 'donut',
  'breadLoaf', 'salami', 'cheeseWedge', 'apple',
  'berryCluster', 'notepad', 'pen', 'pencil',
  'stickyNote', 'cauliflower',
];

const OBJECT_LABELS: Record<KitchenItemType, string> = {
  mug: 'Mug', spoon: 'Spoon', plate: 'Plate', fork: 'Fork', napkin: 'Napkin',
  saltShaker: 'Salt Sh.', glass: 'Glass', butterDish: 'Butter D.', donut: 'Donut',
  breadLoaf: 'Bread', salami: 'Salami', cheeseWedge: 'Cheese', apple: 'Apple',
  berryCluster: 'Berries', notepad: 'Notepad', pen: 'Pen', pencil: 'Pencil',
  stickyNote: 'Sticky', cauliflower: 'Caulifl.',
};

const OBJECT_ABBREVS: Record<KitchenItemType, string> = {
  mug: 'Mg', spoon: 'Sp', plate: 'Pl', fork: 'Fk', napkin: 'Nk',
  saltShaker: 'SS', glass: 'Gl', butterDish: 'BD', donut: 'Do',
  breadLoaf: 'BL', salami: 'Sm', cheeseWedge: 'Ch', apple: 'Ap',
  berryCluster: 'Be', notepad: 'Nt', pen: 'Pn', pencil: 'Pc',
  stickyNote: 'SN', cauliflower: 'Ca',
};

const OBJECT_FOOTPRINTS: Record<KitchenItemType, { w: number; d: number; shape: 'rect' | 'oval' }> = {
  mug:         { w: 24,  d: 24,  shape: 'oval' },
  spoon:       { w: 4,   d: 32,  shape: 'rect' },
  plate:       { w: 40,  d: 40,  shape: 'oval' },
  fork:        { w: 6,   d: 40,  shape: 'rect' },
  napkin:      { w: 32,  d: 20,  shape: 'rect' },
  saltShaker:  { w: 12,  d: 12,  shape: 'oval' },
  glass:       { w: 20,  d: 20,  shape: 'oval' },
  butterDish:  { w: 36,  d: 20,  shape: 'rect' },
  donut:       { w: 28,  d: 28,  shape: 'oval' },
  breadLoaf:   { w: 36,  d: 20,  shape: 'rect' },
  salami:      { w: 24,  d: 24,  shape: 'oval' },
  cheeseWedge: { w: 28,  d: 20,  shape: 'rect' },
  apple:       { w: 16,  d: 16,  shape: 'oval' },
  berryCluster:{ w: 32,  d: 32,  shape: 'oval' },
  notepad:     { w: 28,  d: 20,  shape: 'rect' },
  pen:         { w: 3.2, d: 48,  shape: 'rect' },
  pencil:      { w: 3.2, d: 40,  shape: 'rect' },
  stickyNote:  { w: 24,  d: 24,  shape: 'rect' },
  cauliflower: { w: 40,  d: 40,  shape: 'oval' },
};

interface UndoSnapshot {
  points: [number, number][];
  objects: PlacedObject[];
  hazards: HazardDef[];
  lights: PlacedLight[];
}

interface EditorState {
  points: [number, number][];
  startIndex: number;
  activeTool: Tool;
  trackName: string;
  trackWidth: number;
  showDirectionArrows: boolean;
  past: UndoSnapshot[];
  hazards: HazardDef[];
  loopClosed: boolean;
  objects: PlacedObject[];
  selectedObjectIndex: number;
  activeObjectType: KitchenItemType;
  tunnels: TunnelSection[];
  selectedHazardIndex: number;
  activeHazardType: HazardType;
  activeHazardRadius: number;
  lights: PlacedLight[];
  selectedLightIndex: number;
  activeLightType: LightType;
  activeLightColor: number;
  activeLightIntensity: number;
  activeLightDistance: number;
  activeLightHeight: number;
  activeLightAngle: number;
  activeLightPenumbra: number;
}

type EditorAction =
  | { type: 'ADD_POINT'; point: [number, number] }
  | { type: 'ADD_LINE_SEGMENT'; start: [number, number]; end: [number, number] }
  | { type: 'DELETE_POINT'; index: number }
  | { type: 'MOVE_POINT'; index: number; point: [number, number] }
  | { type: 'SET_START'; index: number }
  | { type: 'SMOOTH' }
  | { type: 'SET_TOOL'; tool: Tool }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_WIDTH'; width: number }
  | { type: 'PUSH_HISTORY' }
  | { type: 'UNDO' }
  | { type: 'REVERSE' }
  | { type: 'TOGGLE_DIRECTION_ARROWS' }
  | { type: 'CLEAR' }
  | { type: 'INSERT_POINT'; afterIndex: number; point: [number, number] }
  | { type: 'DELETE_HAZARD'; index: number }
  | { type: 'CLOSE_LOOP' }
  | { type: 'OPEN_LOOP' }
  | { type: 'LOAD_STATE'; points: [number, number][]; trackName: string; trackWidth: number; hazards?: HazardDef[]; loopClosed?: boolean; objects?: PlacedObject[]; tunnels?: TunnelSection[]; lights?: PlacedLight[] }
  | { type: 'ADD_OBJECT'; object: PlacedObject }
  | { type: 'DELETE_OBJECT'; index: number }
  | { type: 'MOVE_OBJECT'; index: number; x: number; z: number }
  | { type: 'ROTATE_OBJECT'; index: number; delta: number }
  | { type: 'SCALE_OBJECT'; index: number; delta: number }
  | { type: 'SELECT_OBJECT'; index: number }
  | { type: 'SET_ACTIVE_OBJECT_TYPE'; objectType: KitchenItemType }
  | { type: 'ADD_TUNNEL'; tStart: number; tEnd: number }
  | { type: 'DELETE_TUNNEL'; index: number }
  | { type: 'SET_OBJECT_SCALE'; index: number; scale: number }
  | { type: 'SET_OBJECT_ROTATION'; index: number; rotation: number }
  | { type: 'ADD_HAZARD'; hazard: HazardDef }
  | { type: 'SELECT_HAZARD'; index: number }
  | { type: 'MOVE_HAZARD'; index: number; centerX: number; centerZ: number }
  | { type: 'SET_HAZARD_RADIUS'; index: number; radius: number }
  | { type: 'SET_HAZARD_ROTATION'; index: number; rotation: number }
  | { type: 'SET_ACTIVE_HAZARD_TYPE'; hazardType: HazardType }
  | { type: 'SET_ACTIVE_HAZARD_RADIUS'; radius: number }
  | { type: 'ADD_LIGHT'; light: PlacedLight }
  | { type: 'DELETE_LIGHT'; index: number }
  | { type: 'MOVE_LIGHT'; index: number; x: number; z: number }
  | { type: 'SET_LIGHT_TARGET'; index: number; targetX: number; targetZ: number }
  | { type: 'SET_LIGHT_DISTANCE'; index: number; distance: number }
  | { type: 'SET_LIGHT_COLOR'; index: number; color: number }
  | { type: 'SELECT_LIGHT'; index: number }
  | { type: 'SET_ACTIVE_LIGHT_TYPE'; lightType: LightType }
  | { type: 'SET_ACTIVE_LIGHT_COLOR'; color: number }
  | { type: 'SET_ACTIVE_LIGHT_INTENSITY'; intensity: number }
  | { type: 'SET_ACTIVE_LIGHT_DISTANCE'; distance: number }
  | { type: 'SET_ACTIVE_LIGHT_HEIGHT'; height: number }
  | { type: 'SET_ACTIVE_LIGHT_ANGLE'; angle: number }
  | { type: 'SET_ACTIVE_LIGHT_PENUMBRA'; penumbra: number };

const initialState: EditorState = {
  points: [],
  startIndex: 0,
  activeTool: 'pen',
  trackName: 'My Track',
  trackWidth: 28,
  showDirectionArrows: true,
  past: [],
  hazards: [],
  loopClosed: false,
  objects: [],
  selectedObjectIndex: -1,
  activeObjectType: 'mug',
  tunnels: [],
  selectedHazardIndex: -1,
  activeHazardType: 'oil',
  activeHazardRadius: 15,
  lights: [],
  selectedLightIndex: -1,
  activeLightType: 'point',
  activeLightColor: 0xffffff,
  activeLightIntensity: 1.0,
  activeLightDistance: 80,
  activeLightHeight: 8,
  activeLightAngle: 0.4,
  activeLightPenumbra: 0.2,
};

function getInitialState(): EditorState {
  try {
    const practiceObjects = sessionStorage.getItem('practice_objects');
    if (practiceObjects) {
      sessionStorage.removeItem('practice_objects');
      const objects = JSON.parse(practiceObjects) as PlacedObject[];
      return { ...initialState, objects };
    }
  } catch { /* ignore */ }
  try {
    const stored = sessionStorage.getItem('editor_draft');
    if (stored) {
      const draft = JSON.parse(stored) as {
        points: [number, number][];
        trackName: string;
        trackWidth: number;
        hazards?: HazardDef[];
        loopClosed?: boolean;
        objects?: PlacedObject[];
        tunnels?: TunnelSection[];
        lights?: PlacedLight[];
      };
      return {
        ...initialState,
        points: draft.points,
        trackName: draft.trackName,
        trackWidth: draft.trackWidth,
        hazards: draft.hazards ?? [],
        loopClosed: draft.loopClosed ?? false,
        objects: draft.objects ?? [],
        tunnels: draft.tunnels ?? [],
        lights: draft.lights ?? [],
      };
    }
  } catch { /* ignore */ }
  return initialState;
}

function makeSnapshot(state: EditorState): UndoSnapshot {
  return { points: state.points, objects: state.objects, hazards: state.hazards, lights: state.lights };
}

function pushHistory(state: EditorState): UndoSnapshot[] {
  const past = [...state.past, makeSnapshot(state)];
  if (past.length > 20) past.shift();
  return past;
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_POINT':
      return { ...state, past: pushHistory(state), points: [...state.points, action.point] };

    case 'ADD_LINE_SEGMENT': {
      const pts = [...state.points];
      const startClose = pts.findIndex(
        p => Math.hypot(p[0] - action.start[0], p[1] - action.start[1]) < 10
      );
      if (startClose === -1) pts.push(action.start);
      const endClose = pts.findIndex(
        p => Math.hypot(p[0] - action.end[0], p[1] - action.end[1]) < 10
      );
      if (endClose === -1) pts.push(action.end);
      return { ...state, past: pushHistory(state), points: pts };
    }

    case 'DELETE_POINT':
      return {
        ...state,
        past: pushHistory(state),
        points: state.points.filter((_, i) => i !== action.index),
        loopClosed: false,
      };

    case 'MOVE_POINT': {
      const pts = [...state.points];
      pts[action.index] = action.point;
      return { ...state, points: pts };
    }

    case 'PUSH_HISTORY':
      return { ...state, past: pushHistory(state) };

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const past = [...state.past];
      const snap = past.pop()!;
      return { ...state, past, points: snap.points, objects: snap.objects, hazards: snap.hazards, lights: snap.lights, selectedObjectIndex: -1, selectedHazardIndex: -1, selectedLightIndex: -1 };
    }

    case 'SET_START': {
      if (state.points.length === 0) return state;
      const idx = action.index;
      const rotated = [
        ...state.points.slice(idx),
        ...state.points.slice(0, idx),
      ] as [number, number][];
      return { ...state, past: pushHistory(state), points: rotated, startIndex: 0 };
    }

    case 'REVERSE':
      return { ...state, past: pushHistory(state), points: [...state.points].reverse() as [number, number][] };

    case 'TOGGLE_DIRECTION_ARROWS':
      return { ...state, showDirectionArrows: !state.showDirectionArrows };

    case 'SMOOTH': {
      if (state.points.length < 3) return state;
      const pts = state.points;
      const n = pts.length;
      const result: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        result.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
        result.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
      }
      return { ...state, past: pushHistory(state), points: result };
    }

    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, selectedObjectIndex: -1, selectedHazardIndex: -1, selectedLightIndex: -1 };

    case 'SET_NAME':
      return { ...state, trackName: action.name };

    case 'SET_WIDTH':
      return { ...state, trackWidth: action.width };

    case 'CLEAR':
      return {
        ...initialState,
        past: pushHistory(state),
        trackName: state.trackName,
        trackWidth: state.trackWidth,
        showDirectionArrows: state.showDirectionArrows,
        loopClosed: false,
      };

    case 'CLOSE_LOOP':
      return { ...state, loopClosed: true };

    case 'OPEN_LOOP':
      return { ...state, loopClosed: false };

    case 'INSERT_POINT': {
      const pts = [...state.points];
      pts.splice(action.afterIndex + 1, 0, action.point);
      return { ...state, past: pushHistory(state), points: pts };
    }

    case 'DELETE_HAZARD':
      return { ...state, hazards: state.hazards.filter((_, i) => i !== action.index) };

    case 'LOAD_STATE':
      return {
        ...initialState,
        past: pushHistory(state),
        points: action.points,
        trackName: action.trackName,
        trackWidth: action.trackWidth,
        hazards: action.hazards ?? [],
        loopClosed: action.loopClosed ?? true,
        objects: action.objects ?? [],
        tunnels: action.tunnels ?? [],
        lights: action.lights ?? [],
      };

    case 'ADD_OBJECT': {
      const newObj: PlacedObject = { ...action.object };
      const fp = OBJECT_FOOTPRINTS[action.object.type];
      const newR = fp ? Math.max(fp.w, fp.d) / 2 * newObj.scale : 6;
      let maxTopY = 0;
      for (const existing of state.objects) {
        const efp = OBJECT_FOOTPRINTS[existing.type];
        const existR = efp ? Math.max(efp.w, efp.d) / 2 * existing.scale : 6;
        const dist = Math.hypot(newObj.x - existing.x, newObj.z - existing.z);
        if (dist < newR + existR) {
          const top = (existing.y ?? 0) + OBJECT_HEIGHTS[existing.type] * existing.scale;
          if (top > maxTopY) maxTopY = top;
        }
      }
      if (maxTopY > 0) newObj.y = maxTopY;
      return { ...state, past: pushHistory(state), objects: [...state.objects, newObj], selectedObjectIndex: state.objects.length };
    }

    case 'DELETE_OBJECT':
      return {
        ...state,
        past: pushHistory(state),
        objects: state.objects.filter((_, i) => i !== action.index),
        selectedObjectIndex: -1,
      };

    case 'MOVE_OBJECT': {
      const objects = [...state.objects];
      objects[action.index] = { ...objects[action.index], x: action.x, z: action.z };
      return { ...state, objects };
    }

    case 'ROTATE_OBJECT': {
      const objects = [...state.objects];
      objects[action.index] = {
        ...objects[action.index],
        rotation: objects[action.index].rotation + action.delta,
      };
      return { ...state, past: pushHistory(state), objects };
    }

    case 'SCALE_OBJECT': {
      const objects = [...state.objects];
      const newScale = Math.max(0.5, Math.min(3.0, objects[action.index].scale + action.delta));
      objects[action.index] = { ...objects[action.index], scale: Math.round(newScale * 10) / 10 };
      return { ...state, past: pushHistory(state), objects };
    }

    case 'SELECT_OBJECT':
      return { ...state, selectedObjectIndex: action.index };

    case 'SET_ACTIVE_OBJECT_TYPE':
      return { ...state, activeObjectType: action.objectType };

    case 'ADD_TUNNEL':
      return { ...state, tunnels: [...state.tunnels, { tStart: action.tStart, tEnd: action.tEnd }] };

    case 'DELETE_TUNNEL':
      return { ...state, tunnels: state.tunnels.filter((_, i) => i !== action.index) };

    case 'SET_OBJECT_SCALE': {
      const objs = [...state.objects];
      objs[action.index] = { ...objs[action.index], scale: Math.max(0.5, Math.min(3.0, action.scale)) };
      return { ...state, objects: objs };
    }

    case 'SET_OBJECT_ROTATION': {
      const objs = [...state.objects];
      objs[action.index] = { ...objs[action.index], rotation: action.rotation };
      return { ...state, objects: objs };
    }

    case 'ADD_HAZARD':
      return {
        ...state,
        past: pushHistory(state),
        hazards: [...state.hazards, action.hazard],
        selectedHazardIndex: state.hazards.length,
      };

    case 'SELECT_HAZARD':
      return { ...state, selectedHazardIndex: action.index };

    case 'MOVE_HAZARD': {
      const hazards = [...state.hazards];
      hazards[action.index] = { ...hazards[action.index], centerX: action.centerX, centerZ: action.centerZ };
      return { ...state, hazards };
    }

    case 'SET_HAZARD_RADIUS': {
      const hazards = [...state.hazards];
      hazards[action.index] = { ...hazards[action.index], radius: Math.max(5, action.radius) };
      return { ...state, hazards };
    }

    case 'SET_HAZARD_ROTATION': {
      const hazards = [...state.hazards];
      hazards[action.index] = { ...hazards[action.index], rotation: action.rotation };
      return { ...state, hazards };
    }

    case 'SET_ACTIVE_HAZARD_TYPE':
      return { ...state, activeHazardType: action.hazardType };

    case 'SET_ACTIVE_HAZARD_RADIUS':
      return { ...state, activeHazardRadius: action.radius };

    case 'ADD_LIGHT':
      return { ...state, past: pushHistory(state), lights: [...state.lights, action.light], selectedLightIndex: state.lights.length };

    case 'DELETE_LIGHT':
      return { ...state, past: pushHistory(state), lights: state.lights.filter((_, i) => i !== action.index), selectedLightIndex: -1 };

    case 'MOVE_LIGHT': {
      const lights = [...state.lights];
      lights[action.index] = { ...lights[action.index], x: action.x, z: action.z };
      return { ...state, lights };
    }

    case 'SET_LIGHT_TARGET': {
      const lights = [...state.lights];
      lights[action.index] = { ...lights[action.index], targetX: action.targetX, targetZ: action.targetZ };
      return { ...state, lights };
    }

    case 'SET_LIGHT_DISTANCE': {
      const lights = [...state.lights];
      lights[action.index] = { ...lights[action.index], distance: Math.max(20, action.distance) };
      return { ...state, lights };
    }

    case 'SET_LIGHT_COLOR': {
      const lights = [...state.lights];
      lights[action.index] = { ...lights[action.index], color: action.color };
      return { ...state, lights };
    }

    case 'SELECT_LIGHT':
      return { ...state, selectedLightIndex: action.index };

    case 'SET_ACTIVE_LIGHT_TYPE':
      return { ...state, activeLightType: action.lightType };

    case 'SET_ACTIVE_LIGHT_COLOR':
      return { ...state, activeLightColor: action.color };

    case 'SET_ACTIVE_LIGHT_INTENSITY':
      return { ...state, activeLightIntensity: action.intensity };

    case 'SET_ACTIVE_LIGHT_DISTANCE':
      return { ...state, activeLightDistance: action.distance };

    case 'SET_ACTIVE_LIGHT_HEIGHT':
      return { ...state, activeLightHeight: action.height };

    case 'SET_ACTIVE_LIGHT_ANGLE':
      return { ...state, activeLightAngle: action.angle };

    case 'SET_ACTIVE_LIGHT_PENUMBRA':
      return { ...state, activeLightPenumbra: action.penumbra };

    default:
      return state;
  }
}

// Pure 2D CatmullRom interpolation
function catmullRomPoints(
  pts: [number, number][],
  closed: boolean,
  segments: number
): [number, number][] {
  if (pts.length < 2) return pts;
  const result: [number, number][] = [];
  const n = pts.length;
  const count = closed ? n : n - 1;

  for (let i = 0; i < count; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      result.push([x, y]);
    }
  }
  if (!closed) result.push(pts[n - 1]);
  return result;
}

function gameToCanvas(
  gx: number,
  gz: number,
  originX: number,
  originY: number
): [number, number] {
  return [originX - gx, originY - gz];
}

function canvasToGame(
  cx: number,
  cy: number,
  originX: number,
  originY: number
): [number, number, number] {
  return [-(cx - originX), 0, -(cy - originY)];
}

export function TrackEditor() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(editorReducer, undefined, getInitialState);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  const dragIndexRef = useRef<number>(-1);
  const dragHazardIndexRef = useRef<number>(-1);
  const dragHazardOffsetRef = useRef<[number, number]>([0, 0]);
  const dragObjectIndexRef = useRef<number>(-1);
  const dragObjectOffsetRef = useRef<[number, number]>([0, 0]);
  const cornerDragRef = useRef<{ idx: number; startDist: number; startScale: number } | null>(null);
  const rotateDragRef = useRef<{ idx: number; lastAngle: number } | null>(null);
  const lineStartRef = useRef<[number, number] | null>(null);
  const hoverPointRef = useRef<[number, number] | null>(null);
  const isDraggingRef = useRef(false);
  const isSpaceDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const panLastRef = useRef<{ x: number; y: number } | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });
  const viewInitializedRef = useRef(false);
  const splineSamplesRef = useRef<[number, number][]>([]);
  const tunnelStartRef = useRef<number | null>(null);
  const hazardMoveRef = useRef<{ idx: number; offX: number; offZ: number } | null>(null);
  const hazardEdgeRef = useRef<{ idx: number } | null>(null);
  const hazardRotateRef = useRef<{ idx: number; lastAngle: number } | null>(null);
  const lightMoveRef = useRef<{ idx: number; offX: number; offZ: number } | null>(null);
  const lightTargetRef = useRef<{ idx: number } | null>(null);
  const lightDistanceRef = useRef<{ idx: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pan = panRef.current;
    const zoom = zoomRef.current;
    const invZoom = 1 / zoom;
    const originX = W / 2;
    const originY = H / 2;
    const { points, trackWidth, activeTool, showDirectionArrows, hazards, loopClosed, objects, selectedObjectIndex, tunnels, selectedHazardIndex, activeHazardType, activeHazardRadius, lights, selectedLightIndex, activeLightType, activeLightDistance, activeLightColor, activeLightAngle } = stateRef.current;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a0a04';
    ctx.fillRect(0, 0, W, H);

    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);

    const worldLeft = (-pan.x) * invZoom;
    const worldTop = (-pan.y) * invZoom;
    const worldRight = (W - pan.x) * invZoom;
    const worldBottom = (H - pan.y) * invZoom;

    // Grid
    const gridStep = 50;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = invZoom;
    const gx0 = Math.floor(worldLeft / gridStep) * gridStep;
    for (let x = gx0; x <= worldRight; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, worldTop);
      ctx.lineTo(x, worldBottom);
      ctx.stroke();
    }
    const gy0 = Math.floor(worldTop / gridStep) * gridStep;
    for (let y = gy0; y <= worldBottom; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(worldLeft, y);
      ctx.lineTo(worldRight, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = invZoom;
    ctx.beginPath();
    ctx.moveTo(originX, worldTop);
    ctx.lineTo(originX, worldBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(worldLeft, originY);
    ctx.lineTo(worldRight, originY);
    ctx.stroke();

    // Table boundary
    const tableW = 1200;
    const tableH = 900;
    const tableX = originX - tableW / 2;
    const tableY = originY - tableH / 2;
    ctx.fillStyle = 'rgba(139, 90, 43, 0.06)';
    ctx.fillRect(tableX, tableY, tableW, tableH);
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.55)';
    ctx.lineWidth = 2 * invZoom;
    ctx.setLineDash([8 * invZoom, 5 * invZoom]);
    ctx.strokeRect(tableX, tableY, tableW, tableH);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(139, 90, 43, 0.7)';
    ctx.font = `${11 * invZoom}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('table edge', tableX + 6 * invZoom, tableY + 14 * invZoom);

    // Car silhouettes as scale reference
    const carW = 5;
    const carL = 9;
    const carGridStep = 100;
    const cg0x = Math.floor(worldLeft / carGridStep) * carGridStep;
    const cg0y = Math.floor(worldTop / carGridStep) * carGridStep;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = invZoom;
    for (let cx2 = cg0x; cx2 <= worldRight; cx2 += carGridStep) {
      for (let cy2 = cg0y; cy2 <= worldBottom; cy2 += carGridStep) {
        ctx.beginPath();
        ctx.rect(cx2 - carL / 2, cy2 - carW / 2, carL, carW);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Track corridor and spline
    if (points.length >= 2) {
      const curve = catmullRomPoints(points, loopClosed, 20);
      splineSamplesRef.current = curve;

      if (curve.length > 1) {
        const hw = trackWidth / 2;
        const left: [number, number][] = [];
        const right: [number, number][] = [];

        for (let i = 0; i < curve.length; i++) {
          const prev = curve[(i - 1 + curve.length) % curve.length];
          const next = curve[(i + 1) % curve.length];
          const dx = next[0] - prev[0];
          const dy = next[1] - prev[1];
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          left.push([curve[i][0] + nx * hw, curve[i][1] + ny * hw]);
          right.push([curve[i][0] - nx * hw, curve[i][1] - ny * hw]);
        }

        ctx.beginPath();
        ctx.moveTo(left[0][0], left[0][1]);
        for (const p of left) ctx.lineTo(p[0], p[1]);
        for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
        if (loopClosed) ctx.closePath();
        ctx.fillStyle = 'rgba(255,210,63,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,210,63,0.35)';
        ctx.lineWidth = invZoom;
        ctx.stroke();
      }

      // Draw existing hazards
      for (let hi = 0; hi < hazards.length; hi++) {
        const hz = hazards[hi];
        const isHazSel = hi === selectedHazardIndex && activeTool === 'hazard';
        if (hz.centerX !== undefined && hz.centerZ !== undefined && hz.radius !== undefined) {
          const [cx2, cy2] = gameToCanvas(hz.centerX, hz.centerZ, originX, originY);
          ctx.beginPath();
          ctx.arc(cx2, cy2, hz.radius, 0, Math.PI * 2);
          ctx.fillStyle = HAZARD_COLORS[hz.type];
          ctx.fill();
          ctx.strokeStyle = isHazSel ? '#ffffff' : 'rgba(255,255,255,0.4)';
          ctx.lineWidth = (isHazSel ? 2.5 : 1) * invZoom;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = `${9 * invZoom}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(hz.type, cx2, cy2 - hz.radius - 4 * invZoom);

          if (isHazSel) {
            const rot = hz.rotation ?? 0;
            const handleR = 5 * invZoom;
            const handleOutset = 16 * invZoom;

            // Edge handle (east side) — drag to resize
            const ehx = cx2 + hz.radius;
            ctx.beginPath();
            ctx.arc(ehx, cy2, handleR, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#64c8ff';
            ctx.lineWidth = 1.5 * invZoom;
            ctx.stroke();

            // Rotation handle — drag to rotate
            const rhDist = hz.radius + handleOutset;
            const rhx = cx2 + Math.cos(rot) * rhDist;
            const rhy = cy2 + Math.sin(rot) * rhDist;
            ctx.beginPath();
            ctx.moveTo(cx2 + Math.cos(rot) * hz.radius, cy2 + Math.sin(rot) * hz.radius);
            ctx.lineTo(rhx, rhy);
            ctx.strokeStyle = 'rgba(255,210,63,0.8)';
            ctx.lineWidth = 1.5 * invZoom;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(rhx, rhy, handleR, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd23f';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5 * invZoom;
            ctx.stroke();

            // Radius label
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = `${8 * invZoom}px monospace`;
            ctx.fillText(`r=${hz.radius.toFixed(0)}`, cx2, cy2 + hz.radius + 11 * invZoom);
          }
        } else if (hz.tStart !== undefined && hz.tEnd !== undefined) {
          const curve2 = catmullRomPoints(points, loopClosed, 20);
          const totalSamples = curve2.length;
          const startI = Math.round(hz.tStart * totalSamples);
          const endI = Math.round(hz.tEnd * totalSamples);
          if (endI <= startI + 1) continue;
          const hw = (hz.width ?? 10) / 2;
          const lo = hz.lateralOffset ?? 0;
          const left2: [number, number][] = [];
          const right2: [number, number][] = [];
          for (let i = startI; i <= endI; i++) {
            const ii = Math.min(i, totalSamples - 1);
            const prev = curve2[(ii - 1 + totalSamples) % totalSamples];
            const next = curve2[(ii + 1) % totalSamples];
            const dx = next[0] - prev[0];
            const dy = next[1] - prev[1];
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            left2.push([curve2[ii][0] + nx * (lo + hw), curve2[ii][1] + ny * (lo + hw)]);
            right2.push([curve2[ii][0] + nx * (lo - hw), curve2[ii][1] + ny * (lo - hw)]);
          }
          ctx.beginPath();
          ctx.moveTo(left2[0][0], left2[0][1]);
          for (const p of left2) ctx.lineTo(p[0], p[1]);
          for (let i = right2.length - 1; i >= 0; i--) ctx.lineTo(right2[i][0], right2[i][1]);
          ctx.closePath();
          ctx.fillStyle = HAZARD_COLORS[hz.type];
          ctx.fill();
        }
      }

      // Draw placed lights
      for (let li = 0; li < lights.length; li++) {
        const lt = lights[li];
        const [lx, ly] = gameToCanvas(lt.x, lt.z, originX, originY);
        const isLightSel = li === selectedLightIndex && activeTool === 'light';
        const r = ((lt.color >> 16) & 0xff);
        const g = ((lt.color >> 8) & 0xff);
        const b = (lt.color & 0xff);
        const cssColor = `rgb(${r},${g},${b})`;

        if (lt.type === 'spot') {
          const targetCx = lt.targetX !== undefined ? gameToCanvas(lt.targetX, lt.targetZ!, originX, originY)[0] : lx;
          const targetCy = lt.targetZ !== undefined ? gameToCanvas(lt.targetX!, lt.targetZ!, originX, originY)[1] : ly + 50;
          const halfAngle = lt.angle ?? 0.4;
          const aimAngle = Math.atan2(targetCy - ly, targetCx - lx);
          const coneLen = lt.distance;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.arc(lx, ly, coneLen, aimAngle - halfAngle, aimAngle + halfAngle);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r},${g},${b},0.12)`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`;
          ctx.lineWidth = invZoom;
          ctx.stroke();
          // Dashed line to target
          ctx.setLineDash([4 * invZoom, 3 * invZoom]);
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(targetCx, targetCy);
          ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
          ctx.lineWidth = invZoom;
          ctx.stroke();
          ctx.setLineDash([]);
          // Target handle for selected spot
          if (isLightSel) {
            ctx.beginPath();
            ctx.arc(targetCx, targetCy, 5 * invZoom, 0, Math.PI * 2);
            ctx.fillStyle = '#ffdd00';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5 * invZoom;
            ctx.stroke();
          }
        } else {
          // Point light: translucent circle
          ctx.beginPath();
          ctx.arc(lx, ly, lt.distance, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},0.06)`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
          ctx.lineWidth = invZoom;
          ctx.stroke();
          // Radiating lines
          for (let ri = 0; ri < 8; ri++) {
            const a = (ri / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(lx + Math.cos(a) * 6 * invZoom, ly + Math.sin(a) * 6 * invZoom);
            ctx.lineTo(lx + Math.cos(a) * 12 * invZoom, ly + Math.sin(a) * 12 * invZoom);
            ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
            ctx.lineWidth = invZoom;
            ctx.stroke();
          }
        }

        // Center dot
        ctx.beginPath();
        ctx.arc(lx, ly, 5 * invZoom, 0, Math.PI * 2);
        ctx.fillStyle = cssColor;
        ctx.fill();
        ctx.strokeStyle = isLightSel ? '#fff' : 'rgba(0,0,0,0.5)';
        ctx.lineWidth = (isLightSel ? 2 : 1) * invZoom;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${8 * invZoom}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(lt.type === 'spot' ? 'SP' : 'PT', lx, ly - 8 * invZoom);

        // Distance handle (east side) for selected
        if (isLightSel) {
          const dhx = lx + lt.distance;
          ctx.beginPath();
          ctx.arc(dhx, ly, 5 * invZoom, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#64c8ff';
          ctx.lineWidth = 1.5 * invZoom;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = `${7 * invZoom}px monospace`;
          ctx.fillText(`d=${lt.distance.toFixed(0)}`, dhx + 14 * invZoom, ly);
        }
      }

      // Light ghost preview
      const hover = hoverPointRef.current;
      if (activeTool === 'light' && hover) {
        const [r2, g2, b2] = [((activeLightColor >> 16) & 0xff), ((activeLightColor >> 8) & 0xff), (activeLightColor & 0xff)];
        if (activeLightType === 'point') {
          ctx.beginPath();
          ctx.arc(hover[0], hover[1], activeLightDistance, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r2},${g2},${b2},0.4)`;
          ctx.lineWidth = invZoom;
          ctx.setLineDash([4 * invZoom, 3 * invZoom]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const aimAngle = Math.PI / 2;
          const halfAngle = activeLightAngle;
          ctx.beginPath();
          ctx.moveTo(hover[0], hover[1]);
          ctx.arc(hover[0], hover[1], activeLightDistance, aimAngle - halfAngle, aimAngle + halfAngle);
          ctx.closePath();
          ctx.strokeStyle = `rgba(${r2},${g2},${b2},0.4)`;
          ctx.lineWidth = invZoom;
          ctx.setLineDash([4 * invZoom, 3 * invZoom]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw placed objects with footprint shapes
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const [cx2, cy2] = gameToCanvas(obj.x, obj.z, originX, originY);
        const isSelected = i === selectedObjectIndex;
        const fp = OBJECT_FOOTPRINTS[obj.type] ?? { w: 12, d: 12, shape: 'oval' as const };
        const hw = fp.w * 0.5 * obj.scale;
        const hd = fp.d * 0.5 * obj.scale;

        ctx.save();
        ctx.translate(cx2, cy2);
        ctx.rotate(obj.rotation);
        ctx.beginPath();
        if (fp.shape === 'oval') {
          ctx.ellipse(0, 0, hw, hd, 0, 0, Math.PI * 2);
        } else {
          const r = Math.min(hw, hd) * 0.3;
          ctx.roundRect(-hw, -hd, hw * 2, hd * 2, r);
        }
        ctx.fillStyle = isSelected ? 'rgba(100, 200, 255, 0.75)' : 'rgba(60, 180, 100, 0.65)';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#64c8ff' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = (isSelected ? 2.5 : 1.5) * invZoom;
        ctx.stroke();
        ctx.restore();

        // Corner handles for selected object
        if (isSelected) {
          ctx.save();
          ctx.translate(cx2, cy2);
          ctx.rotate(obj.rotation);
          for (const [hcx, hcy] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as [number, number][]) {
            ctx.beginPath();
            ctx.arc(hcx, hcy, 5 * invZoom, 0, Math.PI * 2);
            ctx.fillStyle = '#64c8ff';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5 * invZoom;
            ctx.stroke();
          }
          ctx.restore();
        }

        // Label (unrotated)
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${9 * invZoom}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(OBJECT_ABBREVS[obj.type], cx2, cy2);
        ctx.textBaseline = 'alphabetic';
        if (isSelected && obj.scale !== 1.0) {
          const displayR = Math.max(hw, hd);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = `${8 * invZoom}px monospace`;
          ctx.fillText(`×${obj.scale.toFixed(1)}`, cx2, cy2 + displayR + 10 * invZoom);
        }
      }

      // Draw tunnels as semi-transparent cyan band along centerline
      for (let ti = 0; ti < tunnels.length; ti++) {
        const tunnel = tunnels[ti];
        const samples = splineSamplesRef.current;
        if (samples.length < 2) continue;
        const n = samples.length;
        const startI = Math.round(tunnel.tStart * (n - 1));
        const endI = Math.round(tunnel.tEnd * (n - 1));
        const s = Math.min(startI, endI);
        const e = Math.max(startI, endI);
        if (e <= s + 1) continue;
        ctx.beginPath();
        ctx.moveTo(samples[s][0], samples[s][1]);
        for (let ii = s + 1; ii <= e; ii++) ctx.lineTo(samples[ii][0], samples[ii][1]);
        ctx.strokeStyle = 'rgba(100,200,255,0.35)';
        ctx.lineWidth = trackWidth * 0.8 * invZoom;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt';
        // Tunnel index label
        const midI = Math.floor((s + e) / 2);
        ctx.fillStyle = 'rgba(100,200,255,0.9)';
        ctx.font = `bold ${9 * invZoom}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`T${ti + 1}`, samples[midI][0], samples[midI][1]);
        ctx.textBaseline = 'alphabetic';
      }

      // Tunnel start indicator (pending first click)
      if (activeTool === 'tunnel' && tunnelStartRef.current !== null) {
        const samples = splineSamplesRef.current;
        if (samples.length > 1) {
          const si = Math.round(tunnelStartRef.current * (samples.length - 1));
          const sp = samples[Math.min(si, samples.length - 1)];
          ctx.beginPath();
          ctx.arc(sp[0], sp[1], 8 * invZoom, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(100,200,255,0.9)';
          ctx.lineWidth = 2 * invZoom;
          ctx.stroke();
        }
      }

      // CatmullRom centerline
      ctx.beginPath();
      ctx.moveTo(curve[0][0], curve[0][1]);
      for (const p of curve) ctx.lineTo(p[0], p[1]);
      if (loopClosed) ctx.closePath();
      ctx.strokeStyle = 'rgba(255,210,63,0.85)';
      ctx.lineWidth = 2 * invZoom;
      ctx.stroke();
    }

    // Control points
    const ptR = 6 * invZoom;
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      ctx.beginPath();
      ctx.arc(x, y, ptR, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#e84040' : '#ffd23f';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5 * invZoom;
      ctx.stroke();

      // Point index label
      const fontSize = Math.max(9, 11 * invZoom);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = i === 0 ? '#fff' : '#000';
      ctx.fillText(String(i), x, y);
    }

    // Highlight ring on first point when pen can close loop
    if (activeTool === 'pen' && !loopClosed && points.length >= 3) {
      const [fx, fy] = points[0];
      ctx.beginPath();
      ctx.arc(fx, fy, ptR * 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(80, 255, 80, 0.85)';
      ctx.lineWidth = 2.5 * invZoom;
      ctx.stroke();
    }

    // Direction arrows along centerline
    if (showDirectionArrows && points.length >= 2) {
      const arrowCurve = catmullRomPoints(points, loopClosed, 20);
      const arrowSpacing = 80;
      const headLen = Math.max(6, trackWidth * 0.35) * invZoom;
      const headAngle = Math.PI / 5;
      let accumulated = arrowSpacing / 2;

      ctx.strokeStyle = 'rgba(100,220,255,0.75)';
      ctx.lineWidth = 2 * invZoom;

      for (let i = 1; i < arrowCurve.length; i++) {
        const dx = arrowCurve[i][0] - arrowCurve[i - 1][0];
        const dy = arrowCurve[i][1] - arrowCurve[i - 1][1];
        const segLen = Math.hypot(dx, dy);
        accumulated += segLen;
        if (accumulated >= arrowSpacing) {
          accumulated -= arrowSpacing;
          const angle = Math.atan2(dy, dx);
          const mx = arrowCurve[i][0];
          const my = arrowCurve[i][1];
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx - headLen * Math.cos(angle - headAngle), my - headLen * Math.sin(angle - headAngle));
          ctx.moveTo(mx, my);
          ctx.lineTo(mx - headLen * Math.cos(angle + headAngle), my - headLen * Math.sin(angle + headAngle));
          ctx.stroke();
        }
      }
    }

    // Ghost previews
    const hover = hoverPointRef.current;

    if (activeTool === 'pen' && hover) {
      ctx.beginPath();
      ctx.arc(hover[0], hover[1], ptR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,210,63,0.5)';
      ctx.lineWidth = 2 * invZoom;
      ctx.stroke();
    }

    if (activeTool === 'line' && lineStartRef.current && hover) {
      ctx.beginPath();
      ctx.moveTo(lineStartRef.current[0], lineStartRef.current[1]);
      ctx.lineTo(hover[0], hover[1]);
      ctx.setLineDash([6 * invZoom, 4 * invZoom]);
      ctx.strokeStyle = 'rgba(255,210,63,0.6)';
      ctx.lineWidth = 2 * invZoom;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Object ghost preview when hovering in object tool
    if (activeTool === 'object' && hover) {
      const objR2 = 12 * invZoom;
      ctx.beginPath();
      ctx.arc(hover[0], hover[1], objR2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,200,255,0.5)';
      ctx.lineWidth = 2 * invZoom;
      ctx.stroke();
    }

    // Hazard ghost preview when hovering in hazard tool (not over an existing hazard)
    if (activeTool === 'hazard' && hover) {
      ctx.beginPath();
      ctx.arc(hover[0], hover[1], activeHazardRadius, 0, Math.PI * 2);
      ctx.fillStyle = HAZARD_COLORS[activeHazardType].replace('0.55', '0.25').replace('0.70', '0.30');
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5 * invZoom;
      ctx.setLineDash([4 * invZoom, 3 * invZoom]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Origin crosshair
    const ch = 8 * invZoom;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = invZoom;
    ctx.beginPath();
    ctx.moveTo(originX - ch, originY);
    ctx.lineTo(originX + ch, originY);
    ctx.moveTo(originX, originY - ch);
    ctx.lineTo(originX, originY + ch);
    ctx.stroke();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, []);

  // Redraw on state change
  useEffect(() => {
    draw();
  }, [state, draw]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (!viewInitializedRef.current) {
        viewInitializedRef.current = true;
        const W = canvas.width;
        const H = canvas.height;
        const padding = 80;
        const zoom = Math.min(W / (1200 + padding * 2), H / (900 + padding * 2));
        zoomRef.current = zoom;
        panRef.current = { x: W / 2 * (1 - zoom), y: H / 2 * (1 - zoom) };
      }
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  // Wheel zoom (or object rotation when object selected)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Normal zoom
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const oldZoom = zoomRef.current;
      const factor = Math.pow(1.1, -e.deltaY / 120);
      const newZoom = Math.max(0.1, Math.min(10, oldZoom * factor));
      const wx = (sx - panRef.current.x) / oldZoom;
      const wy = (sy - panRef.current.y) / oldZoom;
      panRef.current = { x: sx - wx * newZoom, y: sy - wy * newZoom };
      zoomRef.current = newZoom;
      draw();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [draw]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const { selectedObjectIndex, selectedHazardIndex, selectedLightIndex, activeTool, lights } = stateRef.current;
        const delta = e.key === '[' ? -Math.PI / 12 : Math.PI / 12;
        if (activeTool === 'light' && selectedLightIndex !== -1) {
          const lt = lights[selectedLightIndex];
          if (lt.type === 'spot' && lt.targetX !== undefined && lt.targetZ !== undefined) {
            const dist = Math.hypot(lt.targetX - lt.x, lt.targetZ - lt.z);
            const angle = Math.atan2(lt.targetZ - lt.z, lt.targetX - lt.x) + delta;
            dispatch({ type: 'SET_LIGHT_TARGET', index: selectedLightIndex,
              targetX: lt.x + Math.cos(angle) * dist, targetZ: lt.z + Math.sin(angle) * dist });
          }
          return;
        }
        if (activeTool === 'hazard' && selectedHazardIndex !== -1) {
          const hz = stateRef.current.hazards[selectedHazardIndex];
          dispatch({ type: 'SET_HAZARD_ROTATION', index: selectedHazardIndex, rotation: (hz.rotation ?? 0) + delta });
        } else if (selectedObjectIndex !== -1) {
          dispatch({ type: 'ROTATE_OBJECT', index: selectedObjectIndex, delta });
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        isSpaceDownRef.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        return;
      }

      // Delete/Backspace: remove selected object, hazard, or light
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (stateRef.current.activeTool === 'object' && stateRef.current.selectedObjectIndex !== -1) {
          e.preventDefault();
          dispatch({ type: 'DELETE_OBJECT', index: stateRef.current.selectedObjectIndex });
          return;
        }
        if (stateRef.current.activeTool === 'hazard' && stateRef.current.selectedHazardIndex !== -1) {
          e.preventDefault();
          dispatch({ type: 'DELETE_HAZARD', index: stateRef.current.selectedHazardIndex });
          return;
        }
        if (stateRef.current.activeTool === 'light' && stateRef.current.selectedLightIndex !== -1) {
          e.preventDefault();
          dispatch({ type: 'DELETE_LIGHT', index: stateRef.current.selectedLightIndex });
          return;
        }
      }

      // H key: reset view to table-fit
      if (e.key.toLowerCase() === 'h') {
        const canvas = canvasRef.current;
        if (canvas) {
          const W = canvas.width;
          const H2 = canvas.height;
          const padding = 80;
          const zoom = Math.min(W / (1200 + padding * 2), H2 / (900 + padding * 2));
          zoomRef.current = zoom;
          panRef.current = { x: W / 2 * (1 - zoom), y: H2 / 2 * (1 - zoom) };
          draw();
        }
        return;
      }

      const map: Record<string, Tool> = {
        p: 'pen', l: 'line', e: 'eraser', m: 'move', s: 'startPoint', i: 'insert', o: 'object', t: 'tunnel', x: 'hazard', v: 'light',
      };
      const tool = map[e.key.toLowerCase()];
      if (tool) {
        dispatch({ type: 'SET_TOOL', tool });
        if (tool !== 'tunnel') tunnelStartRef.current = null;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDownRef.current = false;
        isPanningRef.current = false;
        panLastRef.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return [
      (sx - panRef.current.x) / zoomRef.current,
      (sy - panRef.current.y) / zoomRef.current,
    ];
  };

  const findNearestPoint = (pos: [number, number], screenRadius: number): number => {
    const worldR = screenRadius / zoomRef.current;
    const pts = stateRef.current.points;
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(pts[i][0] - pos[0], pts[i][1] - pos[1]) < worldR) return i;
    }
    return -1;
  };

  const findNearestSegment = (pos: [number, number]): { afterIndex: number; px: number; py: number } | null => {
    const pts = stateRef.current.points;
    if (pts.length < 2) return null;
    let bestDist = Infinity;
    let best: { afterIndex: number; px: number; py: number } | null = null;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const lenSq = dx * dx + dy * dy;
      let t = lenSq > 0 ? ((pos[0] - a[0]) * dx + (pos[1] - a[1]) * dy) / lenSq : 0;
      t = Math.max(0, Math.min(1, t));
      const px = a[0] + t * dx;
      const py = a[1] + t * dy;
      const dist = Math.hypot(pos[0] - px, pos[1] - py);
      if (dist < bestDist) {
        bestDist = dist;
        best = { afterIndex: i, px, py };
      }
    }
    return best;
  };

  const findNearestHazard = (pos: [number, number]): number => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const hazards = stateRef.current.hazards;
    for (let i = 0; i < hazards.length; i++) {
      const hz = hazards[i];
      if (hz.centerX === undefined || hz.centerZ === undefined || hz.radius === undefined) continue;
      const [hx, hy] = gameToCanvas(hz.centerX, hz.centerZ, originX, originY);
      if (Math.hypot(pos[0] - hx, pos[1] - hy) <= hz.radius) return i;
    }
    return -1;
  };

  // Returns 'edge', 'rotate', 'body', or null for the selected hazard at pos
  const hitHazardHandle = (pos: [number, number], idx: number): 'edge' | 'rotate' | 'body' | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const hz = stateRef.current.hazards[idx];
    if (hz.centerX === undefined || hz.centerZ === undefined || hz.radius === undefined) return null;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const [cx, cy] = gameToCanvas(hz.centerX, hz.centerZ, originX, originY);
    const invZoom = 1 / zoomRef.current;
    const handleR = 8 * invZoom;
    const handleOutset = 16 * invZoom;

    // Edge handle (east side)
    if (Math.hypot(pos[0] - (cx + hz.radius), pos[1] - cy) <= handleR) return 'edge';

    // Rotation handle
    const rot = hz.rotation ?? 0;
    const rhx = cx + Math.cos(rot) * (hz.radius + handleOutset);
    const rhy = cy + Math.sin(rot) * (hz.radius + handleOutset);
    if (Math.hypot(pos[0] - rhx, pos[1] - rhy) <= handleR) return 'rotate';

    // Body (circle interior)
    if (Math.hypot(pos[0] - cx, pos[1] - cy) <= hz.radius) return 'body';

    return null;
  };

  const findNearestObject = (pos: [number, number]): number => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const hitR = 15 / zoomRef.current;
    const objects = stateRef.current.objects;
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const [ox, oy] = gameToCanvas(obj.x, obj.z, originX, originY);
      if (Math.hypot(pos[0] - ox, pos[1] - oy) <= hitR) return i;
    }
    return -1;
  };

  const findNearestLight = (pos: [number, number]): number => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const hitR = 10 / zoomRef.current;
    const lights = stateRef.current.lights;
    for (let i = 0; i < lights.length; i++) {
      const lt = lights[i];
      const [lx, ly] = gameToCanvas(lt.x, lt.z, originX, originY);
      if (Math.hypot(pos[0] - lx, pos[1] - ly) <= hitR) return i;
    }
    return -1;
  };

  const hitLightHandle = (pos: [number, number], idx: number): 'body' | 'target' | 'distance' | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const lt = stateRef.current.lights[idx];
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const [lx, ly] = gameToCanvas(lt.x, lt.z, originX, originY);
    const hitR = 8 / zoomRef.current;

    // Distance handle (east side)
    if (Math.hypot(pos[0] - (lx + lt.distance), pos[1] - ly) <= hitR) return 'distance';

    // Target handle for spots
    if (lt.type === 'spot' && lt.targetX !== undefined && lt.targetZ !== undefined) {
      const [tx, ty] = gameToCanvas(lt.targetX, lt.targetZ, originX, originY);
      if (Math.hypot(pos[0] - tx, pos[1] - ty) <= hitR) return 'target';
    }

    // Body
    if (Math.hypot(pos[0] - lx, pos[1] - ly) <= 10 / zoomRef.current) return 'body';

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSpaceDownRef.current) {
      isPanningRef.current = true;
      panLastRef.current = { x: e.clientX, y: e.clientY };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    const pos = getPos(e);
    const { activeTool, loopClosed, points } = stateRef.current;
    isDraggingRef.current = true;

    if (activeTool === 'pen') {
      if (!loopClosed && points.length >= 3) {
        const firstPt = points[0];
        const worldDist = Math.hypot(pos[0] - firstPt[0], pos[1] - firstPt[1]);
        const screenDist = worldDist * zoomRef.current;
        if (screenDist < 15) {
          dispatch({ type: 'CLOSE_LOOP' });
          dispatch({ type: 'SET_TOOL', tool: 'move' });
          return;
        }
      }
      if (!loopClosed) {
        dispatch({ type: 'ADD_POINT', point: pos });
      }
    } else if (activeTool === 'line') {
      lineStartRef.current = pos;
    } else if (activeTool === 'eraser') {
      const idx = findNearestPoint(pos, 12);
      if (idx !== -1) dispatch({ type: 'DELETE_POINT', index: idx });
    } else if (activeTool === 'move') {
      const idx = findNearestPoint(pos, 12);
      if (idx !== -1) {
        dispatch({ type: 'PUSH_HISTORY' });
        dragIndexRef.current = idx;
      } else {
        const hIdx = findNearestHazard(pos);
        if (hIdx !== -1) {
          const canvas = canvasRef.current!;
          const originX = canvas.width / 2;
          const originY = canvas.height / 2;
          const hz = stateRef.current.hazards[hIdx];
          const [hx, hy] = gameToCanvas(hz.centerX!, hz.centerZ!, originX, originY);
          dragHazardOffsetRef.current = [hx - pos[0], hy - pos[1]];
          dragHazardIndexRef.current = hIdx;
        }
      }
    } else if (activeTool === 'startPoint') {
      const idx = findNearestPoint(pos, 12);
      if (idx !== -1) dispatch({ type: 'SET_START', index: idx });
    } else if (activeTool === 'insert') {
      const seg = findNearestSegment(pos);
      if (seg) dispatch({ type: 'INSERT_POINT', afterIndex: seg.afterIndex, point: [seg.px, seg.py] });
    } else if (activeTool === 'tunnel') {
      const samples = splineSamplesRef.current;
      if (samples.length >= 2) {
        let nearestI = 0;
        let nearestDist = Infinity;
        for (let ii = 0; ii < samples.length; ii++) {
          const dist = Math.hypot(pos[0] - samples[ii][0], pos[1] - samples[ii][1]);
          if (dist < nearestDist) { nearestDist = dist; nearestI = ii; }
        }
        const t = nearestI / (samples.length - 1);
        if (tunnelStartRef.current === null) {
          tunnelStartRef.current = t;
          draw();
        } else {
          const tStart = Math.min(tunnelStartRef.current, t);
          const tEnd = Math.max(tunnelStartRef.current, t);
          dispatch({ type: 'ADD_TUNNEL', tStart, tEnd });
          tunnelStartRef.current = null;
        }
      }
    } else if (activeTool === 'object') {
      const canvas = canvasRef.current!;
      const originX = canvas.width / 2;
      const originY = canvas.height / 2;

      // Check corner/rotation handles on selected object first
      const { selectedObjectIndex } = stateRef.current;
      if (selectedObjectIndex !== -1) {
        const selObj = stateRef.current.objects[selectedObjectIndex];
        const [scx, scy] = gameToCanvas(selObj.x, selObj.z, originX, originY);
        const sfp = OBJECT_FOOTPRINTS[selObj.type] ?? { w: 12, d: 12, shape: 'oval' as const };
        const shw = sfp.w * 0.5 * selObj.scale;
        const shd = sfp.d * 0.5 * selObj.scale;
        const cosR = Math.cos(selObj.rotation);
        const sinR = Math.sin(selObj.rotation);
        const zoom = zoomRef.current;
        const corners: [number, number][] = [[-shw, -shd], [shw, -shd], [shw, shd], [-shw, shd]];

        let hitCorner = false;
        for (const [lx, ly] of corners) {
          const wx = scx + lx * cosR - ly * sinR;
          const wy = scy + lx * sinR + ly * cosR;
          const screenDist = Math.hypot(pos[0] - wx, pos[1] - wy) * zoom;
          if (screenDist <= 8) {
            dispatch({ type: 'PUSH_HISTORY' });
            const distFromCenter = Math.hypot(pos[0] - scx, pos[1] - scy);
            cornerDragRef.current = { idx: selectedObjectIndex, startDist: distFromCenter, startScale: selObj.scale };
            hitCorner = true;
            break;
          }
        }
        if (!hitCorner) {
          for (const [lx, ly] of corners) {
            const wx = scx + lx * cosR - ly * sinR;
            const wy = scy + lx * sinR + ly * cosR;
            const screenDist = Math.hypot(pos[0] - wx, pos[1] - wy) * zoom;
            if (screenDist <= 20) {
              dispatch({ type: 'PUSH_HISTORY' });
              const angle = Math.atan2(pos[1] - scy, pos[0] - scx);
              rotateDragRef.current = { idx: selectedObjectIndex, lastAngle: angle };
              break;
            }
          }
        }
        if (cornerDragRef.current || rotateDragRef.current) return;
      }

      const objIdx = findNearestObject(pos);
      if (objIdx !== -1) {
        // Select existing object; set up for drag
        dispatch({ type: 'PUSH_HISTORY' });
        dispatch({ type: 'SELECT_OBJECT', index: objIdx });
        const obj = stateRef.current.objects[objIdx];
        const [ox, oy] = gameToCanvas(obj.x, obj.z, originX, originY);
        dragObjectOffsetRef.current = [ox - pos[0], oy - pos[1]];
        dragObjectIndexRef.current = objIdx;
      } else {
        // Place new object
        const [gx, , gz] = canvasToGame(pos[0], pos[1], originX, originY);
        const { activeObjectType } = stateRef.current;
        dispatch({
          type: 'ADD_OBJECT',
          object: {
            type: activeObjectType,
            x: Math.round(gx * 100) / 100,
            z: Math.round(gz * 100) / 100,
            rotation: 0,
            scale: 1.0,
          },
        });
      }
    } else if (activeTool === 'hazard') {
      const canvas = canvasRef.current!;
      const originX = canvas.width / 2;
      const originY = canvas.height / 2;
      const { selectedHazardIndex, activeHazardType, activeHazardRadius } = stateRef.current;

      // Check handles on selected hazard first
      if (selectedHazardIndex !== -1) {
        const hit = hitHazardHandle(pos, selectedHazardIndex);
        if (hit === 'edge') {
          dispatch({ type: 'PUSH_HISTORY' });
          hazardEdgeRef.current = { idx: selectedHazardIndex };
          return;
        }
        if (hit === 'rotate') {
          const hz = stateRef.current.hazards[selectedHazardIndex];
          const [cx, cy] = gameToCanvas(hz.centerX!, hz.centerZ!, originX, originY);
          const angle = Math.atan2(pos[1] - cy, pos[0] - cx);
          dispatch({ type: 'PUSH_HISTORY' });
          hazardRotateRef.current = { idx: selectedHazardIndex, lastAngle: angle };
          return;
        }
        if (hit === 'body') {
          const hz = stateRef.current.hazards[selectedHazardIndex];
          const [cx, cy] = gameToCanvas(hz.centerX!, hz.centerZ!, originX, originY);
          const [gx, , gz] = canvasToGame(cx, cy, originX, originY);
          hazardMoveRef.current = { idx: selectedHazardIndex, offX: gx - hz.centerX!, offZ: gz - hz.centerZ! };
          return;
        }
      }

      // Check all hazards for click
      const hIdx = findNearestHazard(pos);
      if (hIdx !== -1) {
        dispatch({ type: 'SELECT_HAZARD', index: hIdx });
        const hz = stateRef.current.hazards[hIdx];
        const [cx, cy] = gameToCanvas(hz.centerX!, hz.centerZ!, originX, originY);
        const [gx, , gz] = canvasToGame(cx, cy, originX, originY);
        hazardMoveRef.current = { idx: hIdx, offX: gx - hz.centerX!, offZ: gz - hz.centerZ! };
      } else {
        // Place new hazard
        dispatch({ type: 'SELECT_HAZARD', index: -1 });
        const [gx, , gz] = canvasToGame(pos[0], pos[1], originX, originY);
        dispatch({
          type: 'ADD_HAZARD',
          hazard: {
            type: activeHazardType,
            centerX: Math.round(gx * 100) / 100,
            centerZ: Math.round(gz * 100) / 100,
            radius: activeHazardRadius,
            rotation: 0,
          },
        });
      }
    } else if (activeTool === 'light') {
      const canvas = canvasRef.current!;
      const originX = canvas.width / 2;
      const originY = canvas.height / 2;
      const { selectedLightIndex: selLi, activeLightType, activeLightColor, activeLightIntensity, activeLightDistance, activeLightHeight, activeLightAngle, activeLightPenumbra } = stateRef.current;

      if (selLi !== -1) {
        const hit = hitLightHandle(pos, selLi);
        if (hit === 'distance') {
          lightDistanceRef.current = { idx: selLi };
          return;
        }
        if (hit === 'target') {
          lightTargetRef.current = { idx: selLi };
          return;
        }
        if (hit === 'body') {
          const lt = stateRef.current.lights[selLi];
          const [lx, ly] = gameToCanvas(lt.x, lt.z, originX, originY);
          const [gx2, , gz2] = canvasToGame(lx, ly, originX, originY);
          lightMoveRef.current = { idx: selLi, offX: gx2 - lt.x, offZ: gz2 - lt.z };
          return;
        }
      }

      const lIdx = findNearestLight(pos);
      if (lIdx !== -1) {
        dispatch({ type: 'SELECT_LIGHT', index: lIdx });
        const lt = stateRef.current.lights[lIdx];
        const [lx, ly] = gameToCanvas(lt.x, lt.z, originX, originY);
        const [gx2, , gz2] = canvasToGame(lx, ly, originX, originY);
        lightMoveRef.current = { idx: lIdx, offX: gx2 - lt.x, offZ: gz2 - lt.z };
      } else {
        const [gx, , gz] = canvasToGame(pos[0], pos[1], originX, originY);
        const newLight: PlacedLight = {
          type: activeLightType,
          x: Math.round(gx * 100) / 100,
          z: Math.round(gz * 100) / 100,
          y: activeLightHeight,
          color: activeLightColor,
          intensity: activeLightIntensity,
          distance: activeLightDistance,
        };
        if (activeLightType === 'spot') {
          newLight.angle = activeLightAngle;
          newLight.penumbra = activeLightPenumbra;
          newLight.targetX = Math.round(gx * 100) / 100;
          newLight.targetZ = Math.round((gz + 50) * 100) / 100;
        }
        dispatch({ type: 'ADD_LIGHT', light: newLight });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current && panLastRef.current) {
      const dx = e.clientX - panLastRef.current.x;
      const dy = e.clientY - panLastRef.current.y;
      panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
      panLastRef.current = { x: e.clientX, y: e.clientY };
      draw();
      return;
    }

    const pos = getPos(e);
    hoverPointRef.current = pos;
    const { activeTool } = stateRef.current;

    if (isDraggingRef.current) {
      if (cornerDragRef.current !== null) {
        const { idx, startDist, startScale } = cornerDragRef.current;
        const canvas2 = canvasRef.current!;
        const ox2 = canvas2.width / 2;
        const oy2 = canvas2.height / 2;
        const obj2 = stateRef.current.objects[idx];
        const [cx3, cy3] = gameToCanvas(obj2.x, obj2.z, ox2, oy2);
        const currentDist = Math.hypot(pos[0] - cx3, pos[1] - cy3);
        if (startDist > 0) {
          dispatch({ type: 'SET_OBJECT_SCALE', index: idx, scale: startScale * (currentDist / startDist) });
        }
        draw();
        return;
      }
      if (rotateDragRef.current !== null) {
        const { idx, lastAngle } = rotateDragRef.current;
        const canvas2 = canvasRef.current!;
        const ox2 = canvas2.width / 2;
        const oy2 = canvas2.height / 2;
        const obj2 = stateRef.current.objects[idx];
        const [cx3, cy3] = gameToCanvas(obj2.x, obj2.z, ox2, oy2);
        const currentAngle = Math.atan2(pos[1] - cy3, pos[0] - cx3);
        const newRot = stateRef.current.objects[idx].rotation + (currentAngle - lastAngle);
        dispatch({ type: 'SET_OBJECT_ROTATION', index: idx, rotation: newRot });
        rotateDragRef.current = { idx, lastAngle: currentAngle };
        draw();
        return;
      }
      if (activeTool === 'move' && dragIndexRef.current !== -1) {
        dispatch({ type: 'MOVE_POINT', index: dragIndexRef.current, point: pos });
        return;
      }
      if (activeTool === 'move' && dragHazardIndexRef.current !== -1) {
        const canvas = canvasRef.current!;
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;
        const offset = dragHazardOffsetRef.current;
        const cx = pos[0] + offset[0];
        const cy = pos[1] + offset[1];
        const [gx, , gz] = canvasToGame(cx, cy, originX, originY);
        dispatch({ type: 'MOVE_HAZARD', index: dragHazardIndexRef.current, centerX: Math.round(gx * 100) / 100, centerZ: Math.round(gz * 100) / 100 });
        return;
      }
      // Hazard tool drags
      if (hazardMoveRef.current !== null) {
        const { idx, offX, offZ } = hazardMoveRef.current;
        const canvas = canvasRef.current!;
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;
        const [gx, , gz] = canvasToGame(pos[0], pos[1], originX, originY);
        dispatch({ type: 'MOVE_HAZARD', index: idx, centerX: Math.round((gx + offX) * 100) / 100, centerZ: Math.round((gz + offZ) * 100) / 100 });
        return;
      }
      if (hazardEdgeRef.current !== null) {
        const { idx } = hazardEdgeRef.current;
        const hz = stateRef.current.hazards[idx];
        if (hz.centerX !== undefined && hz.centerZ !== undefined) {
          const canvas = canvasRef.current!;
          const originX = canvas.width / 2;
          const originY = canvas.height / 2;
          const [cx, cy] = gameToCanvas(hz.centerX, hz.centerZ, originX, originY);
          const newRadius = Math.max(5, Math.round(Math.hypot(pos[0] - cx, pos[1] - cy) * 10) / 10);
          dispatch({ type: 'SET_HAZARD_RADIUS', index: idx, radius: newRadius });
        }
        draw();
        return;
      }
      if (hazardRotateRef.current !== null) {
        const { idx, lastAngle } = hazardRotateRef.current;
        const hz = stateRef.current.hazards[idx];
        if (hz.centerX !== undefined && hz.centerZ !== undefined) {
          const canvas = canvasRef.current!;
          const originX = canvas.width / 2;
          const originY = canvas.height / 2;
          const [cx, cy] = gameToCanvas(hz.centerX, hz.centerZ, originX, originY);
          const currentAngle = Math.atan2(pos[1] - cy, pos[0] - cx);
          const newRot = (hz.rotation ?? 0) + (currentAngle - lastAngle);
          dispatch({ type: 'SET_HAZARD_ROTATION', index: idx, rotation: newRot });
          hazardRotateRef.current = { idx, lastAngle: currentAngle };
        }
        draw();
        return;
      }
      if (activeTool === 'object' && dragObjectIndexRef.current !== -1) {
        const canvas = canvasRef.current!;
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;
        const offset = dragObjectOffsetRef.current;
        const cx = pos[0] + offset[0];
        const cy = pos[1] + offset[1];
        const [gx, , gz] = canvasToGame(cx, cy, originX, originY);
        dispatch({ type: 'MOVE_OBJECT', index: dragObjectIndexRef.current, x: Math.round(gx * 100) / 100, z: Math.round(gz * 100) / 100 });
        return;
      }
      if (lightMoveRef.current !== null) {
        const { idx, offX, offZ } = lightMoveRef.current;
        const canvas = canvasRef.current!;
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;
        const [gx, , gz] = canvasToGame(pos[0], pos[1], originX, originY);
        dispatch({ type: 'MOVE_LIGHT', index: idx, x: Math.round((gx + offX) * 100) / 100, z: Math.round((gz + offZ) * 100) / 100 });
        return;
      }
      if (lightTargetRef.current !== null) {
        const { idx } = lightTargetRef.current;
        const canvas = canvasRef.current!;
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;
        const [gx, , gz] = canvasToGame(pos[0], pos[1], originX, originY);
        dispatch({ type: 'SET_LIGHT_TARGET', index: idx, targetX: Math.round(gx * 100) / 100, targetZ: Math.round(gz * 100) / 100 });
        return;
      }
      if (lightDistanceRef.current !== null) {
        const { idx } = lightDistanceRef.current;
        const lt = stateRef.current.lights[idx];
        const canvas = canvasRef.current!;
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;
        const [lx, ly] = gameToCanvas(lt.x, lt.z, originX, originY);
        const newDist = Math.max(20, Math.round(Math.hypot(pos[0] - lx, pos[1] - ly) * 10) / 10);
        dispatch({ type: 'SET_LIGHT_DISTANCE', index: idx, distance: newDist });
        return;
      }
    }

    draw();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panLastRef.current = null;
      if (canvasRef.current)
        canvasRef.current.style.cursor = isSpaceDownRef.current ? 'grab' : 'crosshair';
      return;
    }

    const pos = getPos(e);
    const { activeTool } = stateRef.current;
    isDraggingRef.current = false;

    if (cornerDragRef.current || rotateDragRef.current) {
      cornerDragRef.current = null;
      rotateDragRef.current = null;
      draw();
      return;
    }

    if (lightMoveRef.current || lightTargetRef.current || lightDistanceRef.current) {
      lightMoveRef.current = null;
      lightTargetRef.current = null;
      lightDistanceRef.current = null;
      draw();
      return;
    }

    if (hazardMoveRef.current || hazardEdgeRef.current || hazardRotateRef.current) {
      hazardMoveRef.current = null;
      hazardEdgeRef.current = null;
      hazardRotateRef.current = null;
      draw();
      return;
    }

    if (activeTool === 'line' && lineStartRef.current) {
      dispatch({ type: 'ADD_LINE_SEGMENT', start: lineStartRef.current, end: pos });
      lineStartRef.current = null;
    } else if (activeTool === 'move') {
      dragIndexRef.current = -1;
      dragHazardIndexRef.current = -1;
    } else if (activeTool === 'object') {
      dragObjectIndexRef.current = -1;
    } else if (activeTool === 'hazard') {
      hazardMoveRef.current = null;
    }

    draw();
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { activeTool, tunnels } = stateRef.current;

    if (activeTool === 'light') {
      const pos = getPos(e);
      const lIdx = findNearestLight(pos);
      if (lIdx !== -1) {
        dispatch({ type: 'DELETE_LIGHT', index: lIdx });
      }
      return;
    }

    if (activeTool === 'hazard') {
      const pos = getPos(e);
      const hIdx = findNearestHazard(pos);
      if (hIdx !== -1) {
        dispatch({ type: 'DELETE_HAZARD', index: hIdx });
        dispatch({ type: 'SELECT_HAZARD', index: -1 });
      }
      return;
    }

    if (activeTool !== 'tunnel') return;
    // Cancel pending start
    if (tunnelStartRef.current !== null) {
      tunnelStartRef.current = null;
      draw();
      return;
    }
    // Delete nearest tunnel (within 8px of centerline)
    const pos = getPos(e);
    const samples = splineSamplesRef.current;
    const hitR = 8 / zoomRef.current;
    for (let ti = 0; ti < tunnels.length; ti++) {
      const tunnel = tunnels[ti];
      const n = samples.length;
      if (n < 2) continue;
      const startI = Math.round(tunnel.tStart * (n - 1));
      const endI = Math.round(tunnel.tEnd * (n - 1));
      const s = Math.min(startI, endI);
      const e2 = Math.max(startI, endI);
      for (let ii = s; ii <= e2; ii++) {
        if (Math.hypot(pos[0] - samples[ii][0], pos[1] - samples[ii][1]) < hitR) {
          dispatch({ type: 'DELETE_TUNNEL', index: ti });
          return;
        }
      }
    }
  };

  const handleMouseLeave = () => {
    hoverPointRef.current = null;
    isDraggingRef.current = false;
    isPanningRef.current = false;
    panLastRef.current = null;
    dragHazardIndexRef.current = -1;
    dragObjectIndexRef.current = -1;
    cornerDragRef.current = null;
    rotateDragRef.current = null;
    hazardMoveRef.current = null;
    hazardEdgeRef.current = null;
    hazardRotateRef.current = null;
    lightMoveRef.current = null;
    lightTargetRef.current = null;
    lightDistanceRef.current = null;
    draw();
  };

  const handleTest = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { points, trackName, trackWidth, hazards, loopClosed, objects, tunnels, lights } = stateRef.current;
    if (points.length < 3) {
      alert('Add at least 3 points to test the track.');
      return;
    }
    if (!loopClosed) {
      alert('Close the loop first — click the first point (green ring) to close the track.');
      return;
    }
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const controlPoints = points.map(([cx, cy]) => canvasToGame(cx, cy, originX, originY));
    const config: TrackConfig = {
      id: '__editor__',
      name: trackName,
      controlPoints,
      width: trackWidth,
      hazards,
      objects,
      tunnels,
      lights,
    };
    sessionStorage.setItem('editor_track', JSON.stringify(config));
    sessionStorage.setItem('editor_draft', JSON.stringify({ points, trackName, trackWidth, hazards, loopClosed, objects, tunnels, lights }));
    navigate('/', { state: { fromEditor: true } });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const { points, trackName, trackWidth, hazards, objects, tunnels, lights } = stateRef.current;
    const controlPoints = points.map(([cx, cy]) =>
      canvasToGame(cx, cy, originX, originY).map(v => Math.round(v * 100) / 100) as [number, number, number]
    );
    const id = trackName.replace(/\s+/g, '-').toLowerCase();
    const data = {
      id,
      name: trackName,
      controlPoints,
      width: trackWidth,
      hazards,
      objects,
      tunnels,
      lights,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as {
          name?: string;
          controlPoints: [number, number, number][];
          width?: number;
          hazards?: HazardDef[];
          objects?: PlacedObject[];
          tunnels?: TunnelSection[];
          lights?: PlacedLight[];
        };
        const points = data.controlPoints.map(([gx, , gz]) =>
          gameToCanvas(gx, gz, originX, originY)
        );
        const validTypes = new Set<string>(['juice', 'milk', 'oil', 'butter']);
        const hazards: HazardDef[] = (data.hazards ?? [])
          .filter(h => validTypes.has(h.type))
          .map(h => ({ ...h, type: h.type as HazardType }));
        const validLightTypes = new Set<string>(['point', 'spot']);
        const lights: PlacedLight[] = (data.lights ?? [])
          .filter(l => validLightTypes.has(l.type));
        dispatch({
          type: 'LOAD_STATE',
          points,
          trackName: data.name ?? 'Imported Track',
          trackWidth: data.width ?? 28,
          hazards,
          loopClosed: true,
          objects: data.objects ?? [],
          tunnels: data.tunnels ?? [],
          lights,
        });
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadGameTrack = (id: string) => {
    if (!id) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const track = TRACKS.find(t => t.id === id);
    if (!track) return;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const points = track.controlPoints.map(([gx, , gz]) =>
      gameToCanvas(gx, gz, originX, originY)
    );
    const validTypes = new Set<string>(['juice', 'milk', 'oil', 'butter']);
    const hazards: HazardDef[] = track.hazards
      .filter(h => validTypes.has(h.type))
      .map(h => ({
        type: h.type as HazardType,
        tStart: h.tStart,
        tEnd: h.tEnd,
        lateralOffset: h.lateralOffset,
        width: h.width,
      }));
    dispatch({
      type: 'LOAD_STATE',
      points,
      trackName: track.name,
      trackWidth: track.width,
      hazards,
      loopClosed: true,
      objects: track.objects ?? [],
    });
  };

  const tools: { id: Tool; label: string; key: string }[] = [
    { id: 'pen', label: 'Pen', key: 'P' },
    { id: 'line', label: 'Line', key: 'L' },
    { id: 'insert', label: 'Insert', key: 'I' },
    { id: 'eraser', label: 'Eraser', key: 'E' },
    { id: 'move', label: 'Move', key: 'M' },
    { id: 'startPoint', label: 'Start Pt', key: 'S' },
    { id: 'object', label: 'Objects', key: 'O' },
    { id: 'tunnel', label: 'Tunnel', key: 'T' },
    { id: 'hazard', label: 'Hazards', key: 'X' },
    { id: 'light', label: 'Lights', key: 'V' },
  ];

  const selectedObj = state.selectedObjectIndex !== -1 ? state.objects[state.selectedObjectIndex] : null;

  return (
    <div className="track-editor">
      <div className="editor-toolbar">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Back
        </button>

        <div className="editor-section">
          <label className="editor-label">Track Name</label>
          <input
            className="editor-input"
            value={state.trackName}
            onChange={e => dispatch({ type: 'SET_NAME', name: e.target.value })}
          />
        </div>

        <div className="editor-section">
          <label className="editor-label">Load Track</label>
          <select
            className="editor-input"
            value=""
            onChange={e => handleLoadGameTrack(e.target.value)}
          >
            <option value="">— game track —</option>
            {TRACKS.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="editor-section">
          <label className="editor-label">Width: {state.trackWidth}</label>
          <input
            className="editor-slider"
            type="range"
            min="10"
            max="60"
            value={state.trackWidth}
            onChange={e => dispatch({ type: 'SET_WIDTH', width: Number(e.target.value) })}
          />
        </div>

        <div className="editor-section">
          <label className="editor-label">Tools</label>
          {tools.map(t => (
            <button
              key={t.id}
              className={`tool-btn${state.activeTool === t.id ? ' active' : ''}`}
              onClick={() => dispatch({ type: 'SET_TOOL', tool: t.id })}
              title={`${t.label} (${t.key})`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {state.activeTool === 'object' && (
          <div className="editor-section">
            <label className="editor-label">Object Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
              {KITCHEN_ITEM_TYPES.map(type => (
                <button
                  key={type}
                  className={`tool-btn${state.activeObjectType === type ? ' active' : ''}`}
                  style={{ fontSize: 9, padding: '2px 4px' }}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_OBJECT_TYPE', objectType: type })}
                >
                  {OBJECT_LABELS[type]}
                </button>
              ))}
            </div>
            {selectedObj && (
              <div style={{ marginTop: 6 }}>
                <label className="editor-label">{OBJECT_LABELS[selectedObj.type]} (selected)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>Scale: {selectedObj.scale.toFixed(1)}</span>
                  <button
                    className="tool-btn"
                    style={{ padding: '0 6px', fontSize: 12, minWidth: 'auto' }}
                    onClick={() => dispatch({ type: 'SCALE_OBJECT', index: state.selectedObjectIndex, delta: 0.1 })}
                  >+</button>
                  <button
                    className="tool-btn"
                    style={{ padding: '0 6px', fontSize: 12, minWidth: 'auto' }}
                    onClick={() => dispatch({ type: 'SCALE_OBJECT', index: state.selectedObjectIndex, delta: -0.1 })}
                  >−</button>
                </div>
                <span style={{ fontSize: 9, opacity: 0.5, display: 'block', marginTop: 2 }}>
                  [/]=rotate · Del=delete · drag=move
                </span>
              </div>
            )}
            {!selectedObj && (
              <span style={{ opacity: 0.5, fontSize: 9, marginTop: 4, display: 'block' }}>
                click canvas to place · click object to select
              </span>
            )}
            {state.objects.length > 0 && (
              <span style={{ opacity: 0.6, fontSize: 9 }}>
                {state.objects.length} object{state.objects.length !== 1 ? 's' : ''} placed
              </span>
            )}
          </div>
        )}

        {state.activeTool === 'tunnel' && (
          <div className="editor-section">
            <label className="editor-label">Tunnel Tool</label>
            <span style={{ opacity: 0.6, fontSize: 9, display: 'block', marginBottom: 4 }}>
              {tunnelStartRef.current === null
                ? 'Click track to set tunnel start'
                : 'Click track to set tunnel end · right-click to cancel'}
            </span>
            {state.tunnels.length > 0 && (
              <>
                <label className="editor-label">Tunnels ({state.tunnels.length})</label>
                {state.tunnels.map((tn, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                    <span style={{ flex: 1, fontSize: 9, fontFamily: 'monospace', background: 'rgba(100,200,255,0.3)', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>
                      {(tn.tStart * 100).toFixed(0)}%–{(tn.tEnd * 100).toFixed(0)}%
                    </span>
                    <button
                      className="tool-btn tool-btn-danger"
                      style={{ padding: '0 5px', fontSize: 10, minWidth: 'auto' }}
                      onClick={() => dispatch({ type: 'DELETE_TUNNEL', index: i })}
                    >×</button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {state.activeTool === 'hazard' && (
          <div className="editor-section">
            <label className="editor-label">Hazard Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {(['juice', 'milk', 'oil', 'butter'] as HazardType[]).map(type => (
                <button
                  key={type}
                  className={`tool-btn${state.activeHazardType === type ? ' active' : ''}`}
                  style={{
                    fontSize: 9, padding: '2px 4px',
                    background: state.activeHazardType === type ? HAZARD_COLORS[type] : undefined,
                    color: state.activeHazardType === type ? '#fff' : undefined,
                  }}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_HAZARD_TYPE', hazardType: type })}
                >
                  {type}
                </button>
              ))}
            </div>

            <label className="editor-label" style={{ marginTop: 6 }}>Radius: {state.activeHazardRadius}</label>
            <input
              className="editor-slider"
              type="range"
              min="5"
              max="60"
              value={state.activeHazardRadius}
              onChange={e => dispatch({ type: 'SET_ACTIVE_HAZARD_RADIUS', radius: Number(e.target.value) })}
            />

            {state.selectedHazardIndex !== -1 && state.hazards[state.selectedHazardIndex] && (() => {
              const hz = state.hazards[state.selectedHazardIndex];
              return hz.centerX !== undefined ? (
                <div style={{ marginTop: 6 }}>
                  <label className="editor-label">{hz.type} (selected)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, opacity: 0.7 }}>r={hz.radius?.toFixed(0)}</span>
                    <button
                      className="tool-btn"
                      style={{ padding: '0 6px', fontSize: 12, minWidth: 'auto' }}
                      onClick={() => dispatch({ type: 'SET_HAZARD_RADIUS', index: state.selectedHazardIndex, radius: (hz.radius ?? 15) + 5 })}
                    >+</button>
                    <button
                      className="tool-btn"
                      style={{ padding: '0 6px', fontSize: 12, minWidth: 'auto' }}
                      onClick={() => dispatch({ type: 'SET_HAZARD_RADIUS', index: state.selectedHazardIndex, radius: (hz.radius ?? 15) - 5 })}
                    >−</button>
                    <button
                      className="tool-btn tool-btn-danger"
                      style={{ padding: '0 6px', fontSize: 10, minWidth: 'auto' }}
                      onClick={() => dispatch({ type: 'DELETE_HAZARD', index: state.selectedHazardIndex })}
                    >del</button>
                  </div>
                  <span style={{ fontSize: 9, opacity: 0.5, display: 'block', marginTop: 2 }}>
                    [/]=rotate · Del=delete · drag=move · drag ○=resize
                  </span>
                </div>
              ) : null;
            })()}

            {state.hazards.filter(h => h.centerX !== undefined).length === 0 && (
              <span style={{ opacity: 0.5, fontSize: 9, marginTop: 4, display: 'block' }}>
                click canvas to place · right-click to delete
              </span>
            )}
            {state.hazards.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {state.hazards.map((hz, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                    <button
                      style={{
                        flex: 1, fontSize: 9, fontFamily: 'monospace', textAlign: 'left',
                        background: i === state.selectedHazardIndex ? HAZARD_COLORS[hz.type] : 'rgba(0,0,0,0.3)',
                        color: '#fff', padding: '1px 4px', borderRadius: 2, border: 'none', cursor: 'pointer',
                        textShadow: '0 0 3px rgba(0,0,0,0.8)',
                      }}
                      onClick={() => dispatch({ type: 'SELECT_HAZARD', index: i })}
                    >
                      {hz.type}{hz.radius !== undefined ? ` r=${hz.radius.toFixed(0)}` : ` ${((hz.tStart ?? 0) * 100).toFixed(0)}–${((hz.tEnd ?? 0) * 100).toFixed(0)}%`}
                    </button>
                    <button
                      className="tool-btn tool-btn-danger"
                      style={{ padding: '0 5px', fontSize: 10, minWidth: 'auto' }}
                      onClick={() => dispatch({ type: 'DELETE_HAZARD', index: i })}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {state.activeTool === 'light' && (
          <div className="editor-section">
            <label className="editor-label">Light Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {(['point', 'spot'] as LightType[]).map(t => (
                <button
                  key={t}
                  className={`tool-btn${state.activeLightType === t ? ' active' : ''}`}
                  style={{ fontSize: 9, padding: '2px 4px' }}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_LIGHT_TYPE', lightType: t })}
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="editor-label" style={{ marginTop: 6 }}>Color</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              {LIGHT_COLOR_PRESETS.map(p => (
                <button
                  key={p.label}
                  className="tool-btn"
                  style={{
                    fontSize: 9, padding: '2px 4px',
                    border: `2px solid ${p.css}`,
                    background: state.activeLightColor === p.hex ? p.css : undefined,
                    color: state.activeLightColor === p.hex ? '#000' : '#fff',
                  }}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_LIGHT_COLOR', color: p.hex })}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="editor-label" style={{ marginTop: 6 }}>Height: {state.activeLightHeight}</label>
            <input className="editor-slider" type="range" min="1" max="50" value={state.activeLightHeight}
              onChange={e => dispatch({ type: 'SET_ACTIVE_LIGHT_HEIGHT', height: Number(e.target.value) })} />

            <label className="editor-label">Intensity: {state.activeLightIntensity.toFixed(1)}</label>
            <input className="editor-slider" type="range" min="0.1" max="5" step="0.1" value={state.activeLightIntensity}
              onChange={e => dispatch({ type: 'SET_ACTIVE_LIGHT_INTENSITY', intensity: Number(e.target.value) })} />

            <label className="editor-label">Distance: {state.activeLightDistance}</label>
            <input className="editor-slider" type="range" min="20" max="300" step="5" value={state.activeLightDistance}
              onChange={e => dispatch({ type: 'SET_ACTIVE_LIGHT_DISTANCE', distance: Number(e.target.value) })} />

            {state.activeLightType === 'spot' && (
              <>
                <label className="editor-label">Angle: {Math.round(state.activeLightAngle * 180 / Math.PI)}°</label>
                <input className="editor-slider" type="range" min="5" max="90" value={Math.round(state.activeLightAngle * 180 / Math.PI)}
                  onChange={e => dispatch({ type: 'SET_ACTIVE_LIGHT_ANGLE', angle: Number(e.target.value) * Math.PI / 180 })} />

                <label className="editor-label">Penumbra: {state.activeLightPenumbra.toFixed(2)}</label>
                <input className="editor-slider" type="range" min="0" max="1" step="0.05" value={state.activeLightPenumbra}
                  onChange={e => dispatch({ type: 'SET_ACTIVE_LIGHT_PENUMBRA', penumbra: Number(e.target.value) })} />
              </>
            )}

            {state.selectedLightIndex !== -1 && state.lights[state.selectedLightIndex] && (() => {
              const lt = state.lights[state.selectedLightIndex];
              const cssCol = `#${lt.color.toString(16).padStart(6, '0')}`;
              return (
                <div style={{ marginTop: 6 }}>
                  <label className="editor-label">{lt.type} light (selected)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {LIGHT_COLOR_PRESETS.map(p => (
                      <button key={p.label} className="tool-btn"
                        style={{ fontSize: 8, padding: '1px 4px', border: `2px solid ${p.css}`,
                          background: lt.color === p.hex ? p.css : undefined, color: lt.color === p.hex ? '#000' : '#fff' }}
                        onClick={() => dispatch({ type: 'SET_LIGHT_COLOR', index: state.selectedLightIndex, color: p.hex })}
                      >{p.label}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>color: {cssCol}</div>
                  <button
                    className="tool-btn tool-btn-danger"
                    style={{ marginTop: 4, padding: '1px 8px', fontSize: 10 }}
                    onClick={() => dispatch({ type: 'DELETE_LIGHT', index: state.selectedLightIndex })}
                  >Delete Light</button>
                  <span style={{ fontSize: 9, opacity: 0.5, display: 'block', marginTop: 2 }}>
                    {lt.type === 'spot' ? '[/]=rotate aim · ' : ''}Del=delete · drag=move · drag ○=resize
                  </span>
                </div>
              );
            })()}

            {state.lights.length === 0 && (
              <span style={{ opacity: 0.5, fontSize: 9, marginTop: 4, display: 'block' }}>
                click canvas to place · right-click to delete
              </span>
            )}
            {state.lights.length > 0 && (
              <span style={{ opacity: 0.6, fontSize: 9, marginTop: 4, display: 'block' }}>
                {state.lights.length} light{state.lights.length !== 1 ? 's' : ''} placed
              </span>
            )}
          </div>
        )}

        <div className="editor-section">
          {state.loopClosed ? (
            <button
              className="tool-btn active"
              onClick={() => dispatch({ type: 'OPEN_LOOP' })}
            >
              Loop: Closed
            </button>
          ) : (
            <div style={{ fontSize: 9, opacity: 0.6, marginBottom: 4 }}>
              Click first point (green) to close loop
            </div>
          )}
          <button
            className="tool-btn"
            onClick={() => dispatch({ type: 'REVERSE' })}
            disabled={state.points.length < 2}
            title="Reverse track direction"
          >
            Flip Direction
          </button>
          <button
            className={`tool-btn${state.showDirectionArrows ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_DIRECTION_ARROWS' })}
            title="Toggle direction arrows"
          >
            Show Arrows
          </button>
          <button
            className="tool-btn"
            onClick={() => dispatch({ type: 'SMOOTH' })}
            disabled={state.points.length < 3}
          >
            Smooth
          </button>
          <button
            className="tool-btn"
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={state.past.length === 0}
            title="Undo (Cmd+Z / Ctrl+Z)"
          >
            ↩ Undo {state.past.length > 0 ? `(${state.past.length})` : ''}
          </button>
          <button
            className="tool-btn tool-btn-danger"
            onClick={() => {
              if (window.confirm('Clear all points?')) dispatch({ type: 'CLEAR' });
            }}
          >
            Clear
          </button>
          <button
            className="tool-btn"
            onClick={() => importFileRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportJSON}
          />
          <button
            className="tool-btn tool-btn-save"
            onClick={handleSave}
            disabled={state.points.length < 2}
          >
            Save JSON
          </button>
          <button
            className="tool-btn tool-btn-test"
            onClick={handleTest}
            disabled={state.points.length < 3 || !state.loopClosed}
          >
            ▶ Test Track
          </button>
        </div>

        <div className="editor-label" style={{ marginTop: 'auto' }}>
          {state.points.length} point{state.points.length !== 1 ? 's' : ''}
          {state.loopClosed && <span style={{ color: '#5db345', marginLeft: 4 }}>✓</span>}
          <br />
          <span style={{ opacity: 0.6, fontSize: '9px' }}>
            Space+drag pan · scroll zoom
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="editor-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
