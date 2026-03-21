import { useReducer, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TrackConfig } from '../../constants/track.js';
import { TRACKS } from '../../constants/track.js';

type Tool = 'pen' | 'line' | 'eraser' | 'move' | 'startPoint' | 'insert' | 'hazard';

type HazardType = 'juice' | 'milk' | 'oil' | 'butter';

interface HazardDef {
  type: HazardType;
  // Circle format (editor free placement) — game world coords
  centerX?: number;
  centerZ?: number;
  radius?: number;
  // Legacy t-range format (loaded from JSON)
  tStart?: number;
  tEnd?: number;
  lateralOffset?: number;
  width?: number;
}

const HAZARD_COLORS: Record<HazardType, string> = {
  juice:  'rgba(255, 136,   0, 0.55)',
  milk:   'rgba(210, 220, 255, 0.55)',
  oil:    'rgba( 60,  60,  10, 0.70)',
  butter: 'rgba(245, 208,  32, 0.55)',
};

interface UndoSnapshot {
  points: [number, number][];
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
  activeHazardType: HazardType;
  loopClosed: boolean;
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
  | { type: 'ADD_HAZARD'; hazard: HazardDef }
  | { type: 'DELETE_HAZARD'; index: number }
  | { type: 'SET_HAZARD_TYPE'; hazardType: HazardType }
  | { type: 'CLOSE_LOOP' }
  | { type: 'OPEN_LOOP' }
  | { type: 'LOAD_STATE'; points: [number, number][]; trackName: string; trackWidth: number; hazards?: HazardDef[]; loopClosed?: boolean };

const initialState: EditorState = {
  points: [],
  startIndex: 0,
  activeTool: 'pen',
  trackName: 'My Track',
  trackWidth: 28,
  showDirectionArrows: true,
  past: [],
  hazards: [],
  activeHazardType: 'juice',
  loopClosed: false,
};

function getInitialState(): EditorState {
  try {
    const stored = sessionStorage.getItem('editor_draft');
    if (stored) {
      const draft = JSON.parse(stored) as {
        points: [number, number][];
        trackName: string;
        trackWidth: number;
        hazards?: HazardDef[];
        loopClosed?: boolean;
      };
      return {
        ...initialState,
        points: draft.points,
        trackName: draft.trackName,
        trackWidth: draft.trackWidth,
        hazards: draft.hazards ?? [],
        loopClosed: draft.loopClosed ?? false,
      };
    }
  } catch { /* ignore */ }
  return initialState;
}

function makeSnapshot(state: EditorState): UndoSnapshot {
  return { points: state.points };
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
      return { ...state, past, points: snap.points };
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
      return { ...state, activeTool: action.tool };

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

    case 'ADD_HAZARD':
      return { ...state, hazards: [...state.hazards, action.hazard] };

    case 'DELETE_HAZARD':
      return { ...state, hazards: state.hazards.filter((_, i) => i !== action.index) };

    case 'SET_HAZARD_TYPE':
      return { ...state, activeHazardType: action.hazardType };

    case 'LOAD_STATE':
      return {
        ...initialState,
        past: pushHistory(state),
        points: action.points,
        trackName: action.trackName,
        trackWidth: action.trackWidth,
        hazards: action.hazards ?? [],
        loopClosed: action.loopClosed ?? true,
      };

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

  // Viewport state (refs — don't need re-render)
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  // Transient interaction state
  const dragIndexRef = useRef<number>(-1);
  const lineStartRef = useRef<[number, number] | null>(null);
  const hoverPointRef = useRef<[number, number] | null>(null);
  const isDraggingRef = useRef(false);
  const isSpaceDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const panLastRef = useRef<{ x: number; y: number } | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);
  // Hazard circle placement refs
  const hazardCenterRef = useRef<[number, number] | null>(null);   // canvas world coords
  const hazardRadiusRef = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const viewInitializedRef = useRef(false);

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
    const { points, trackWidth, activeTool, showDirectionArrows, hazards, activeHazardType, loopClosed } = stateRef.current;

    // 1. Clear (in screen space)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a0a04';
    ctx.fillRect(0, 0, W, H);

    // Apply viewport transform — everything below is in world space
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);

    const worldLeft = (-pan.x) * invZoom;
    const worldTop = (-pan.y) * invZoom;
    const worldRight = (W - pan.x) * invZoom;
    const worldBottom = (H - pan.y) * invZoom;

    // 2. Grid
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
    // Axis lines
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

    // 2c. Table boundary
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

    // 2b. Car silhouettes as scale reference
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

      // 3. Track corridor
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

      // 3b. Hazard zones — circles (new format) or track-relative bands (legacy)
      for (const hz of hazards) {
        if (hz.centerX !== undefined && hz.centerZ !== undefined && hz.radius !== undefined) {
          // Circle format
          const [cx2, cy2] = gameToCanvas(hz.centerX, hz.centerZ, originX, originY);
          ctx.beginPath();
          ctx.arc(cx2, cy2, hz.radius, 0, Math.PI * 2);
          ctx.fillStyle = HAZARD_COLORS[hz.type];
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = invZoom;
          ctx.stroke();
          // Label
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = `${9 * invZoom}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(hz.type, cx2, cy2 - hz.radius - 4 * invZoom);
        } else if (hz.tStart !== undefined && hz.tEnd !== undefined) {
          // Legacy t-range format
          const totalSamples = curve.length;
          const startI = Math.round(hz.tStart * totalSamples);
          const endI = Math.round(hz.tEnd * totalSamples);
          if (endI <= startI + 1) continue;
          const hw = (hz.width ?? 10) / 2;
          const lo = hz.lateralOffset ?? 0;
          const left2: [number, number][] = [];
          const right2: [number, number][] = [];
          for (let i = startI; i <= endI; i++) {
            const ii = Math.min(i, totalSamples - 1);
            const prev = curve[(ii - 1 + totalSamples) % totalSamples];
            const next = curve[(ii + 1) % totalSamples];
            const dx = next[0] - prev[0];
            const dy = next[1] - prev[1];
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            left2.push([curve[ii][0] + nx * (lo + hw), curve[ii][1] + ny * (lo + hw)]);
            right2.push([curve[ii][0] + nx * (lo - hw), curve[ii][1] + ny * (lo - hw)]);
          }
          ctx.beginPath();
          ctx.moveTo(left2[0][0], left2[0][1]);
          for (const p of left2) ctx.lineTo(p[0], p[1]);
          for (let i = right2.length - 1; i >= 0; i--) ctx.lineTo(right2[i][0], right2[i][1]);
          ctx.closePath();
          ctx.fillStyle = HAZARD_COLORS[hz.type];
          ctx.fill();
          const midPt = curve[Math.min(Math.round((startI + endI) / 2), totalSamples - 1)];
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.font = `${9 * invZoom}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(hz.type, midPt[0], midPt[1] - ((hz.width ?? 10) / 2 + 4) * invZoom);
        }
      }

      // 3c. Hazard placement preview (circle drag)
      if (activeTool === 'hazard' && hazardCenterRef.current !== null && hazardRadiusRef.current > 0) {
        const [cx2, cy2] = hazardCenterRef.current;
        ctx.beginPath();
        ctx.arc(cx2, cy2, hazardRadiusRef.current, 0, Math.PI * 2);
        ctx.fillStyle = HAZARD_COLORS[activeHazardType];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2 * invZoom;
        ctx.stroke();
      }

      // 4. CatmullRom centerline
      ctx.beginPath();
      ctx.moveTo(curve[0][0], curve[0][1]);
      for (const p of curve) ctx.lineTo(p[0], p[1]);
      if (loopClosed) ctx.closePath();
      ctx.strokeStyle = 'rgba(255,210,63,0.85)';
      ctx.lineWidth = 2 * invZoom;
      ctx.stroke();
    }

    // 5. Control points
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
    }

    // 5b. Highlight ring on first point when pen can close loop
    if (activeTool === 'pen' && !loopClosed && points.length >= 3) {
      const [fx, fy] = points[0];
      ctx.beginPath();
      ctx.arc(fx, fy, ptR * 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(80, 255, 80, 0.85)';
      ctx.lineWidth = 2.5 * invZoom;
      ctx.stroke();
    }

    // 6. Direction arrows along centerline
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

    // 7. Ghost previews
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

    // 8. Origin crosshair
    const ch = 8 * invZoom;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = invZoom;
    ctx.beginPath();
    ctx.moveTo(originX - ch, originY);
    ctx.lineTo(originX + ch, originY);
    ctx.moveTo(originX, originY - ch);
    ctx.lineTo(originX, originY + ch);
    ctx.stroke();

    // Reset transform
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

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
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

      const map: Record<string, Tool> = {
        p: 'pen', l: 'line', e: 'eraser', m: 'move', s: 'startPoint', i: 'insert', h: 'hazard',
      };
      const tool = map[e.key.toLowerCase()];
      if (tool) dispatch({ type: 'SET_TOOL', tool });
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

  // Convert screen coords → world coords
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return [
      (sx - panRef.current.x) / zoomRef.current,
      (sy - panRef.current.y) / zoomRef.current,
    ];
  };

  // Hit-test: radius is in screen pixels, converted to world
  const findNearestPoint = (pos: [number, number], screenRadius: number): number => {
    const worldR = screenRadius / zoomRef.current;
    const pts = stateRef.current.points;
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(pts[i][0] - pos[0], pts[i][1] - pos[1]) < worldR) return i;
    }
    return -1;
  };

  // Find nearest segment
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
      // Check if clicking near first point to close loop
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
      }
    } else if (activeTool === 'startPoint') {
      const idx = findNearestPoint(pos, 12);
      if (idx !== -1) dispatch({ type: 'SET_START', index: idx });
    } else if (activeTool === 'insert') {
      const seg = findNearestSegment(pos);
      if (seg) dispatch({ type: 'INSERT_POINT', afterIndex: seg.afterIndex, point: [seg.px, seg.py] });
    } else if (activeTool === 'hazard') {
      // Start circle placement
      hazardCenterRef.current = pos;
      hazardRadiusRef.current = 0;
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
      if (activeTool === 'move' && dragIndexRef.current !== -1) {
        dispatch({ type: 'MOVE_POINT', index: dragIndexRef.current, point: pos });
        return;
      }
      if (activeTool === 'hazard' && hazardCenterRef.current !== null) {
        const center = hazardCenterRef.current;
        hazardRadiusRef.current = Math.hypot(pos[0] - center[0], pos[1] - center[1]);
        draw();
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

    if (activeTool === 'line' && lineStartRef.current) {
      dispatch({ type: 'ADD_LINE_SEGMENT', start: lineStartRef.current, end: pos });
      lineStartRef.current = null;
    } else if (activeTool === 'move') {
      dragIndexRef.current = -1;
    } else if (activeTool === 'hazard' && hazardCenterRef.current !== null) {
      const radius = hazardRadiusRef.current;
      if (radius > 3) {
        const canvas = canvasRef.current!;
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;
        const [cx, cy] = hazardCenterRef.current;
        const [gx, , gz] = canvasToGame(cx, cy, originX, originY);
        const { activeHazardType } = stateRef.current;
        dispatch({
          type: 'ADD_HAZARD',
          hazard: {
            type: activeHazardType,
            centerX: Math.round(gx * 100) / 100,
            centerZ: Math.round(gz * 100) / 100,
            radius: Math.round(radius * 100) / 100,
          },
        });
      }
      hazardCenterRef.current = null;
      hazardRadiusRef.current = 0;
    }

    draw();
  };

  const handleMouseLeave = () => {
    hoverPointRef.current = null;
    isDraggingRef.current = false;
    isPanningRef.current = false;
    panLastRef.current = null;
    hazardCenterRef.current = null;
    hazardRadiusRef.current = 0;
    draw();
  };

  const handleTest = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { points, trackName, trackWidth, hazards, loopClosed } = stateRef.current;
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
    };
    sessionStorage.setItem('editor_track', JSON.stringify(config));
    sessionStorage.setItem('editor_draft', JSON.stringify({ points, trackName, trackWidth, hazards, loopClosed }));
    navigate('/', { state: { fromEditor: true } });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const { points, trackName, trackWidth, hazards } = stateRef.current;
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
        };
        const points = data.controlPoints.map(([gx, , gz]) =>
          gameToCanvas(gx, gz, originX, originY)
        );
        const validTypes = new Set<string>(['juice', 'milk', 'oil', 'butter']);
        const hazards: HazardDef[] = (data.hazards ?? [])
          .filter(h => validTypes.has(h.type))
          .map(h => ({ ...h, type: h.type as HazardType }));
        dispatch({
          type: 'LOAD_STATE',
          points,
          trackName: data.name ?? 'Imported Track',
          trackWidth: data.width ?? 28,
          hazards,
          loopClosed: true,
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
    });
  };

  const tools: { id: Tool; label: string; key: string }[] = [
    { id: 'pen', label: 'Pen', key: 'P' },
    { id: 'line', label: 'Line', key: 'L' },
    { id: 'insert', label: 'Insert', key: 'I' },
    { id: 'eraser', label: 'Eraser', key: 'E' },
    { id: 'move', label: 'Move', key: 'M' },
    { id: 'startPoint', label: 'Start Point', key: 'S' },
    { id: 'hazard', label: 'Hazard', key: 'H' },
  ];

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
            max="40"
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

        {state.activeTool === 'hazard' && (
          <div className="editor-section">
            <label className="editor-label">Hazard Type</label>
            {(['juice', 'milk', 'oil', 'butter'] as HazardType[]).map(ht => (
              <button
                key={ht}
                className={`tool-btn${state.activeHazardType === ht ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'SET_HAZARD_TYPE', hazardType: ht })}
              >
                {ht}
              </button>
            ))}
            <span style={{ opacity: 0.5, fontSize: 9, marginTop: 4 }}>click+drag to place circle</span>
          </div>
        )}

        {state.hazards.length > 0 && (
          <div className="editor-section">
            <label className="editor-label">Hazards ({state.hazards.length})</label>
            {state.hazards.map((hz, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                <span style={{
                  flex: 1, fontSize: 9, fontFamily: 'monospace',
                  background: HAZARD_COLORS[hz.type], color: '#fff',
                  padding: '1px 4px', borderRadius: 2,
                  textShadow: '0 0 3px rgba(0,0,0,0.8)',
                }}>
                  {hz.type}
                  {hz.radius !== undefined
                    ? ` r=${hz.radius.toFixed(0)}`
                    : ` ${((hz.tStart ?? 0) * 100).toFixed(0)}–${((hz.tEnd ?? 0) * 100).toFixed(0)}%`
                  }
                </span>
                <button
                  className="tool-btn tool-btn-danger"
                  style={{ padding: '0 5px', fontSize: 10, minWidth: 'auto' }}
                  onClick={() => dispatch({ type: 'DELETE_HAZARD', index: i })}
                >×</button>
              </div>
            ))}
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
      />
    </div>
  );
}
