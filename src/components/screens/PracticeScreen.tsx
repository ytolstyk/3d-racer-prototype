import { useRef, useState, useEffect, useCallback } from 'react';
import { Button, Stack, Title } from '@mantine/core';
import type { KitchenItemType, PhysicsTelemetry, PhysicsGroup, HazardZone } from '../../types/game.js';
import { PracticeEngine, PRACTICE_DEFAULT_OBJECTS } from '../../game/PracticeEngine.js';
import { CAR_DEFINITIONS } from '../../constants/cars.js';
import { HAZARD_COLORS, HAZARD_EFFECTS } from '../../constants/physics.js';
import { OptionsScreen } from './OptionsScreen.js';

const KITCHEN_ITEM_TYPES: KitchenItemType[] = [
  'mug', 'spoon', 'plate', 'fork', 'napkin',
  'saltShaker', 'glass', 'butterDish', 'donut',
  'breadLoaf', 'salami', 'cheeseWedge', 'apple',
  'berryCluster', 'notepad', 'pen', 'pencil',
  'stickyNote', 'cauliflower',
];

const ITEM_LABELS: Record<KitchenItemType, string> = {
  mug: 'Mug', spoon: 'Spoon', plate: 'Plate', fork: 'Fork', napkin: 'Napkin',
  saltShaker: 'Salt Sh.', glass: 'Glass', butterDish: 'Butter D.', donut: 'Donut',
  breadLoaf: 'Bread', salami: 'Salami', cheeseWedge: 'Cheese', apple: 'Apple',
  berryCluster: 'Berries', notepad: 'Notepad', pen: 'Pen', pencil: 'Pencil',
  stickyNote: 'Sticky', cauliflower: 'Caulifl.',
};

type HazardType = HazardZone['type'];

const HAZARD_TYPES: HazardType[] = ['juice', 'oil', 'milk', 'butter', 'food'];


interface PracticeScreenProps {
  onMainMenu: () => void;
  onOpenInEditor: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: '12px',
  zIndex: 100,
};

const panelStyle: React.CSSProperties = {
  position: 'absolute', top: 10, right: 10,
  background: 'rgba(0,0,0,0.8)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6, padding: 8, zIndex: 10,
};

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'inline-block', width: 40, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, verticalAlign: 'middle', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(Math.abs(value) * 100, 100)}%`, background: color, borderRadius: 2 }} />
    </div>
  );
}

export function PracticeScreen({ onMainMenu, onOpenInEditor }: PracticeScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PracticeEngine | null>(null);
  const [selectedCarId, setSelectedCarId] = useState('racer-red');
  const [paused, setPaused] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(1);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeType, setActiveType] = useState<KitchenItemType | null>(null);
  const [selectedObjIdx, setSelectedObjIdx] = useState(-1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportJson, setExportJson] = useState('');
  const [objectCount, setObjectCount] = useState(PRACTICE_DEFAULT_OBJECTS.length);

  // Hazard palette state
  const [hazardType, setHazardType] = useState<HazardType | null>(null);
  const [hazardRadius, setHazardRadius] = useState(40);
  const [hazardCount, setHazardCount] = useState(0);

  // Splatter palette state
  const [splatterType, setSplatterType] = useState<HazardType | null>(null);
  const [splatterRadius, setSplatterRadius] = useState(40);
  const [splatterCount, setSplatterCount] = useState(0);

  // Rain placement state
  const [placingRain, setPlacingRain] = useState(false);
  const [rainRadius, setRainRadius] = useState(60);
  const [rainCount, setRainCount] = useState(0);

  const [carPos, setCarPos] = useState({ x: 0, y: 0, z: 0 });

  // Telemetry + tuner state
  const [telemetry, setTelemetry] = useState<PhysicsTelemetry | null>(null);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [tunerGroup, setTunerGroup] = useState<PhysicsGroup | 'hazard'>('drift');
  const [physicsDefaults, setPhysicsDefaults] = useState<Record<PhysicsGroup, Record<string, number>> | null>(null);
  const [overrideMap, setOverrideMap] = useState<Record<string, number>>({});
  const [hazardOverrideMap, setHazardOverrideMap] = useState<Record<string, number>>({});
  const [showPhysicsExport, setShowPhysicsExport] = useState(false);
  const [physicsExportTs, setPhysicsExportTs] = useState('');

  // Camera tuner state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraDefaults, setCameraDefaults] = useState<Record<string, number> | null>(null);
  const [cameraOverrideMap, setCameraOverrideMap] = useState<Record<string, number>>({});
  const [showCameraExport, setShowCameraExport] = useState(false);
  const [cameraExportTs, setCameraExportTs] = useState('');

  // Effects tuner state
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [effectsGroup, setEffectsGroup] = useState('tiresmoke');
  const [effectsDefaults, setEffectsDefaults] = useState<Record<string, Record<string, number>> | null>(null);
  const [effectsOverrideMap, setEffectsOverrideMap] = useState<Record<string, number>>({});
  const [showEffectsExport, setShowEffectsExport] = useState(false);
  const [effectsExportTs, setEffectsExportTs] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engineRef.current = new PracticeEngine(canvas, selectedCarId);
    setMaxSpeed(engineRef.current.getMaxSpeed());
    setPhysicsDefaults(engineRef.current.getPhysicsDefaults());
    setOverrideMap({});
    setCameraDefaults(engineRef.current.getCameraDefaults());
    setCameraOverrideMap({});
    setEffectsDefaults(engineRef.current.getEffectsDefaults());
    setEffectsOverrideMap({});
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [selectedCarId]);

  useEffect(() => {
    const id = setInterval(() => {
      if (engineRef.current) {
        setSpeed(engineRef.current.getSpeed());
        setTelemetry(engineRef.current.getTelemetry());
        setCarPos(engineRef.current.getCarPosition());
      }
    }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      if (optionsOpen) { setOptionsOpen(false); return; }
      setPaused(prev => {
        const next = !prev;
        if (next) engineRef.current?.pause();
        else engineRef.current?.resume();
        return next;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [optionsOpen]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine || paused) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, z } = engine.screenToWorld(sx, sy, rect.width, rect.height);

    if (activeType) {
      engine.addObject({ type: activeType, x, z, rotation: 0, scale: 1.0 });
      setObjectCount(engine.getObjects().length);
      return;
    }

    if (hazardType) {
      engine.addHazard({ type: hazardType, x, z, radius: hazardRadius });
      setHazardCount(engine.getHazards().length);
      return;
    }

    if (splatterType) {
      engine.addSplatter({ type: splatterType, x, z, radius: splatterRadius, rotation: 0 });
      setSplatterCount(engine.getSplatters().length);
      return;
    }

    if (placingRain) {
      engine.addRainZone(x, z, rainRadius);
      setRainCount(engine.getRainZones().length);
      return;
    }

    // Select nearest object
    const objects = engine.getObjects();
    let nearestIdx = -1;
    let nearestDist = 60;
    for (let i = 0; i < objects.length; i++) {
      const dist = Math.hypot(objects[i].x - x, objects[i].z - z);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    }
    setSelectedObjIdx(nearestIdx);
  }, [activeType, hazardType, hazardRadius, splatterType, splatterRadius, placingRain, rainRadius, paused]);

  const handleDeleteSelected = () => {
    if (selectedObjIdx === -1 || !engineRef.current) return;
    engineRef.current.removeObject(selectedObjIdx);
    setObjectCount(engineRef.current.getObjects().length);
    setSelectedObjIdx(-1);
  };

  const handleClearAll = () => {
    engineRef.current?.removeAllObjects();
    engineRef.current?.removeAllHazards();
    engineRef.current?.removeAllSplatters();
    engineRef.current?.removeAllRainZones();
    setObjectCount(0);
    setHazardCount(0);
    setSplatterCount(0);
    setRainCount(0);
    setSelectedObjIdx(-1);
  };

  const handleExport = () => {
    const objects = engineRef.current?.getObjects() ?? [];
    setExportJson(JSON.stringify(objects, null, 2));
    setShowExportModal(true);
  };

  const handleEditInEditor = () => {
    const objects = engineRef.current?.getObjects() ?? [];
    sessionStorage.setItem('practice_objects', JSON.stringify(objects));
    onOpenInEditor();
  };

  const handleOverride = useCallback((group: PhysicsGroup, key: string, raw: string) => {
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    engineRef.current?.setPhysicsOverride(group, key, value);
    setOverrideMap(prev => ({ ...prev, [`${group}:${key}`]: value }));
  }, []);

  const handleResetPhysics = useCallback(() => {
    engineRef.current?.resetPhysics();
    setOverrideMap({});
  }, []);

  const handleHazardOverride = useCallback((type: string, key: string, raw: string) => {
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    engineRef.current?.setHazardEffectOverride(type, key, value);
    setHazardOverrideMap(prev => ({ ...prev, [`${type}:${key}`]: value }));
  }, []);

  const handlePhysicsExport = useCallback(() => {
    setPhysicsExportTs(engineRef.current?.exportPhysicsTS() ?? '');
    setShowPhysicsExport(true);
  }, []);

  const handleCameraOverride = useCallback((key: string, raw: string) => {
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    engineRef.current?.setCameraOverride(key, value);
    setCameraOverrideMap(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetCamera = useCallback(() => {
    engineRef.current?.resetCamera();
    setCameraOverrideMap({});
  }, []);

  const handleCameraExport = useCallback(() => {
    setCameraExportTs(engineRef.current?.exportCameraTS() ?? '');
    setShowCameraExport(true);
  }, []);

  const handleEffectsOverride = useCallback((group: string, key: string, raw: string) => {
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    engineRef.current?.setEffectsOverride(group, key, value);
    setEffectsOverrideMap(prev => ({ ...prev, [`${group}:${key}`]: value }));
  }, []);

  const handleResetEffects = useCallback(() => {
    engineRef.current?.resetEffects();
    setEffectsOverrideMap({});
  }, []);

  const handleEffectsExport = useCallback(() => {
    setEffectsExportTs(engineRef.current?.exportEffectsTS() ?? '');
    setShowEffectsExport(true);
  }, []);

  const toggleTelemetry = useCallback(() => {
    setTelemetryOpen(p => { if (!p) { setTunerOpen(false); setCameraOpen(false); setEffectsOpen(false); } return !p; });
  }, []);

  const toggleTuner = useCallback(() => {
    setTunerOpen(p => { if (!p) { setTelemetryOpen(false); setCameraOpen(false); setEffectsOpen(false); } return !p; });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOpen(p => { if (!p) { setTelemetryOpen(false); setTunerOpen(false); setEffectsOpen(false); } return !p; });
  }, []);

  const toggleEffects = useCallback(() => {
    setEffectsOpen(p => { if (!p) { setTelemetryOpen(false); setTunerOpen(false); setCameraOpen(false); } return !p; });
  }, []);

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
  };
  const primaryBtnStyle: React.CSSProperties = { ...btnStyle, background: 'rgba(100,200,255,0.25)' };

  const groupKeys = physicsDefaults && tunerGroup !== 'hazard' ? Object.keys(physicsDefaults[tunerGroup]) : [];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onClick={handleCanvasClick}
      />

      {/* Palette toggle */}
      <button
        style={{ ...btnStyle, position: 'absolute', top: 10, right: 10, zIndex: 10 }}
        onClick={() => setPaletteOpen(p => {
          if (p) { setActiveType(null); setHazardType(null); setSplatterType(null); setPlacingRain(false); }
          return !p;
        })}
      >
        {paletteOpen ? '× Close' : '+ Objects'}
      </button>

      {/* Object palette */}
      {paletteOpen && (
        <div style={{ ...panelStyle, top: 46, maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Kitchen items */}
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>OBJECTS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 8 }}>
            {KITCHEN_ITEM_TYPES.map(type => (
              <button
                key={type}
                onClick={() => { setActiveType(t => t === type ? null : type); setHazardType(null); }}
                style={{
                  ...btnStyle,
                  background: activeType === type ? 'rgba(100,200,255,0.5)' : 'rgba(255,255,255,0.08)',
                  fontSize: 10, padding: '3px 6px',
                }}
              >
                {ITEM_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Hazards section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 6, marginTop: 2 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>HAZARDS</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
              {HAZARD_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => { setHazardType(t => t === type ? null : type); setActiveType(null); }}
                  style={{
                    ...btnStyle,
                    fontSize: 10, padding: '3px 7px',
                    background: hazardType === type
                      ? `${HAZARD_COLORS[type]}55`
                      : 'rgba(255,255,255,0.08)',
                    borderColor: hazardType === type ? HAZARD_COLORS[type] : 'rgba(255,255,255,0.25)',
                    color: hazardType === type ? HAZARD_COLORS[type] : '#fff',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            {hazardType && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>radius</span>
                <input
                  type="range"
                  min={15}
                  max={120}
                  value={hazardRadius}
                  onChange={e => setHazardRadius(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ color: '#fff', fontSize: 10, fontFamily: 'monospace', minWidth: 24 }}>{hazardRadius}</span>
              </div>
            )}
          </div>

          {/* Splatters section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 6, marginTop: 2 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>SPLATTERS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 6 }}>
              {HAZARD_TYPES.map(t => (
                <button key={t} style={{
                  ...btnStyle,
                  fontSize: 10, padding: '3px 6px',
                  background: splatterType === t ? HAZARD_COLORS[t] : 'rgba(255,255,255,0.08)',
                  color: splatterType === t ? '#000' : '#fff',
                }}
                onClick={() => { setSplatterType(p => p === t ? null : t); setActiveType(null); setHazardType(null); }}
                >
                  💧 {t}
                </button>
              ))}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginBottom: 2 }}>
              Radius: <input type="number" value={splatterRadius} min={10} max={200}
                onChange={e => setSplatterRadius(Number(e.target.value))}
                style={{ width: 50, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 2 }} />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{splatterCount} splatters</div>
          </div>

          {/* Rain section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 6, marginTop: 2 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>RAIN</div>
            <button
              onClick={() => { setPlacingRain(p => !p); setActiveType(null); setHazardType(null); setSplatterType(null); }}
              style={{
                ...btnStyle,
                fontSize: 10, padding: '3px 7px',
                background: placingRain ? 'rgba(68,136,204,0.5)' : 'rgba(255,255,255,0.08)',
                borderColor: placingRain ? '#4488cc' : 'rgba(255,255,255,0.25)',
                color: placingRain ? '#88ccff' : '#fff',
              }}
            >
              Rain Zone
            </button>
            {placingRain && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>radius</span>
                <input
                  type="range"
                  min={20}
                  max={150}
                  value={rainRadius}
                  onChange={e => setRainRadius(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ color: '#fff', fontSize: 10, fontFamily: 'monospace', minWidth: 24 }}>{rainRadius}</span>
              </div>
            )}
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>{rainCount} rain zone{rainCount !== 1 ? 's' : ''}</div>
          </div>

          {/* Placement hint */}
          {(activeType || hazardType || splatterType || placingRain) ? (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 4 }}>
              Click canvas to place {activeType ? ITEM_LABELS[activeType] : hazardType ? `${hazardType} (r=${hazardRadius})` : placingRain ? `rain zone (r=${rainRadius})` : `${splatterType} splatter (r=${splatterRadius})`}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 4 }}>
              Select type, then click canvas
            </div>
          )}
        </div>
      )}

      {/* Selected object controls */}
      {selectedObjIdx !== -1 && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: 8, zIndex: 10,
        }}>
          <span style={{ color: '#fff', fontSize: 12 }}>Object #{selectedObjIdx + 1}</span>
          <button style={{ ...btnStyle, borderColor: '#ff4444', color: '#ff9999' }} onClick={handleDeleteSelected}>
            Delete
          </button>
          <button style={btnStyle} onClick={() => setSelectedObjIdx(-1)}>Deselect</button>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 10, left: 10,
        display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnStyle} onClick={handleExport}>Export JSON</button>
          <button style={primaryBtnStyle} onClick={handleEditInEditor}>Edit in Track Editor</button>
          <button style={{ ...btnStyle, borderColor: '#ff6644', color: '#ffaa88' }} onClick={handleClearAll}>Clear All</button>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, alignSelf: 'center' }}>
            {objectCount} obj{objectCount !== 1 ? 's' : ''}
            {hazardCount > 0 && ` · ${hazardCount} hazard${hazardCount !== 1 ? 's' : ''}`}
            {splatterCount > 0 && ` · ${splatterCount} splatter${splatterCount !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 400 }}>
          {CAR_DEFINITIONS.map(car => (
            <button
              key={car.id}
              onClick={() => setSelectedCarId(car.id)}
              style={{
                ...btnStyle,
                fontSize: 10, padding: '2px 8px',
                background: selectedCarId === car.id ? `rgba(${((car.color >> 16) & 0xff)},${((car.color >> 8) & 0xff)},${car.color & 0xff},0.4)` : 'rgba(255,255,255,0.08)',
                borderColor: selectedCarId === car.id ? `rgb(${((car.color >> 16) & 0xff)},${((car.color >> 8) & 0xff)},${car.color & 0xff})` : 'rgba(255,255,255,0.25)',
              }}
            >
              {car.name}
            </button>
          ))}
        </div>
      </div>

      {/* Coordinate display */}
      <div style={{
        position: 'absolute', bottom: 120, right: 10, zIndex: 10,
        background: 'rgba(0,0,0,0.7)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6, padding: '6px 10px',
        fontFamily: 'monospace', fontSize: 11,
        display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110,
      }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1, marginBottom: 2 }}>POSITION</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: '#ff6666' }}>X</span>
          <span style={{ color: '#fff' }}>{carPos.x.toFixed(1)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: '#66ff66' }}>Y</span>
          <span style={{ color: '#fff' }}>{carPos.y.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: '#6688ff' }}>Z</span>
          <span style={{ color: '#fff' }}>{carPos.z.toFixed(1)}</span>
        </div>
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
          <span style={{ color: '#ff6666' }}>X</span> east&nbsp;·&nbsp;<span style={{ color: '#66ff66' }}>Y</span> up&nbsp;·&nbsp;<span style={{ color: '#6688ff' }}>Z</span> south
        </div>
      </div>

      {/* Speed indicator */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 10,
        background: 'rgba(0,0,0,0.7)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6, padding: '6px 12px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        minWidth: 80,
      }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', lineHeight: 1 }}>
          {Math.round(speed)}
        </div>
        <div style={{
          width: '100%', height: 4,
          background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min((speed / maxSpeed) * 100, 100)}%`,
            background: speed / maxSpeed > 0.8 ? '#ff4444' : speed / maxSpeed > 0.5 ? '#ffaa00' : '#44aaff',
            borderRadius: 2, transition: 'width 0.05s',
          }} />
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1 }}>SPEED</div>
      </div>

      {/* Top-left bar: ESC + Telemetry + Physics */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>ESC = pause</span>
        <button
          style={{
            ...btnStyle, fontSize: 10, padding: '2px 8px',
            background: telemetryOpen ? 'rgba(100,200,255,0.3)' : 'rgba(255,255,255,0.08)',
          }}
          onClick={toggleTelemetry}
        >
          📊 Telemetry
        </button>
        <button
          style={{
            ...btnStyle, fontSize: 10, padding: '2px 8px',
            background: tunerOpen ? 'rgba(255,180,50,0.3)' : 'rgba(255,255,255,0.08)',
          }}
          onClick={toggleTuner}
        >
          ⚙ Physics
        </button>
        <button
          style={{
            ...btnStyle, fontSize: 10, padding: '2px 8px',
            background: cameraOpen ? 'rgba(180,100,255,0.3)' : 'rgba(255,255,255,0.08)',
          }}
          onClick={toggleCamera}
        >
          📷 Camera
        </button>
        <button
          style={{
            ...btnStyle, fontSize: 10, padding: '2px 8px',
            background: effectsOpen ? 'rgba(50,200,160,0.3)' : 'rgba(255,255,255,0.08)',
          }}
          onClick={toggleEffects}
        >
          ✦ Effects
        </button>
      </div>

      {/* Telemetry panel */}
      {telemetryOpen && telemetry && (
        <div style={{
          position: 'absolute', top: 40, left: 10, zIndex: 20,
          background: 'rgba(0,0,0,0.82)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6, padding: '8px 10px', width: 200,
        }}>
          {([
            ['speed', telemetry.speed.toFixed(1), false, '#44aaff'],
            ['speedRatio', telemetry.speedRatio.toFixed(3), true, '#44aaff'],
            ['slipAngle', telemetry.slipAngle.toFixed(3), false, '#ffaa44'],
            ['latVel', telemetry.lateralVelocity.toFixed(2), false, '#ffaa44'],
            ['steer', telemetry.steeringAngle.toFixed(3), false, '#aaffaa'],
            ['driftResidual', telemetry.driftResidual.toFixed(3), true, '#ff8844'],
            ['gripFactor', telemetry.gripFactor.toFixed(3), true, '#88ff88'],
            ['throttleBlend', telemetry.throttleBlend.toFixed(3), true, '#44ccff'],
          ] as [string, string, boolean, string][]).map(([label, val, hasBar, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {hasBar && <MiniBar value={parseFloat(val)} color={color} />}
                <span style={{ color: '#fff', fontSize: 10, fontFamily: 'monospace', minWidth: 44, textAlign: 'right' }}>{val}</span>
              </span>
            </div>
          ))}
          {([
            ['isSkidding', telemetry.isSkidding],
            ['isBraking', telemetry.isBraking],
          ] as [string, boolean][]).map(([label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{label}</span>
              <span style={{ color: val ? '#44ff44' : 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}>{val ? 'true' : 'false'}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>burnoutTimer</span>
            <span style={{ color: '#fff', fontSize: 10, fontFamily: 'monospace' }}>{telemetry.burnoutTimer.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Physics tuner panel */}
      {tunerOpen && physicsDefaults && (
        <div style={{
          position: 'absolute', top: 40, left: 10, zIndex: 20,
          background: 'rgba(0,0,0,0.88)', border: '1px solid rgba(255,180,50,0.25)',
          borderRadius: 6, padding: '8px 10px', width: 260,
          maxHeight: '75vh', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {(['physics', 'drift', 'controller', 'hazard'] as (PhysicsGroup | 'hazard')[]).map(g => (
              <button
                key={g}
                onClick={() => setTunerGroup(g)}
                style={{
                  ...btnStyle, fontSize: 10, padding: '2px 7px',
                  background: tunerGroup === g ? 'rgba(255,180,50,0.35)' : 'rgba(255,255,255,0.07)',
                  borderColor: tunerGroup === g ? '#ffaa00' : 'rgba(255,255,255,0.2)',
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {tunerGroup === 'hazard' ? (
            <div>
              {(Object.keys(HAZARD_EFFECTS) as string[]).map(type => (
                <div key={type} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: HAZARD_COLORS[type] ?? '#888', flexShrink: 0 }} />
                    <span style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{type}</span>
                  </div>
                  {(['speedMultiplier', 'steeringMultiplier', 'lateralDrift'] as const).map(key => {
                    const mapKey = `${type}:${key}`;
                    const isModified = mapKey in hazardOverrideMap;
                    const defaultVal = (HAZARD_EFFECTS[type] as unknown as Record<string, number>)[key];
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, paddingLeft: 16 }}>
                        <span style={{ color: isModified ? '#ffaa00' : 'rgba(255,255,255,0.5)', fontSize: 10 }}>{key}</span>
                        <input
                          type="number"
                          defaultValue={defaultVal}
                          step="any"
                          onBlur={e => handleHazardOverride(type, key, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleHazardOverride(type, key, (e.target as HTMLInputElement).value); }}
                          style={{
                            width: 80, fontSize: 10, fontFamily: 'monospace',
                            background: '#0d0d1a', color: '#fff',
                            border: `1px solid ${isModified ? '#ffaa00' : 'rgba(255,255,255,0.2)'}`,
                            borderRadius: 3, padding: '2px 4px', textAlign: 'right',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            groupKeys.map(key => {
              const mapKey = `${tunerGroup}:${key}`;
              const isModified = mapKey in overrideMap;
              const defaultVal = physicsDefaults![tunerGroup as PhysicsGroup][key];
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: isModified ? '#ffaa00' : 'rgba(255,255,255,0.55)', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={key}>
                    {key}
                  </span>
                  <input
                    type="number"
                    defaultValue={defaultVal}
                    step="any"
                    onBlur={e => handleOverride(tunerGroup as PhysicsGroup, key, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleOverride(tunerGroup as PhysicsGroup, key, (e.target as HTMLInputElement).value); }}
                    style={{
                      width: 90, fontSize: 10, fontFamily: 'monospace',
                      background: '#0d0d1a', color: '#fff',
                      border: `1px solid ${isModified ? '#ffaa00' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: 3, padding: '2px 4px', textAlign: 'right',
                    }}
                  />
                </div>
              );
            })
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button style={{ ...btnStyle, fontSize: 10, padding: '3px 8px' }} onClick={handleResetPhysics}>↺ Reset All</button>
            <button style={{ ...btnStyle, fontSize: 10, padding: '3px 8px', background: 'rgba(100,200,100,0.2)' }} onClick={handlePhysicsExport}>Export as TypeScript</button>
          </div>
        </div>
      )}

      {/* Camera tuner panel */}
      {cameraOpen && cameraDefaults && (
        <div style={{
          position: 'absolute', top: 40, left: 10, zIndex: 20,
          background: 'rgba(0,0,0,0.88)', border: '1px solid rgba(180,100,255,0.25)',
          borderRadius: 6, padding: '8px 10px', width: 260,
          maxHeight: '75vh', overflowY: 'auto',
        }}>
          <div style={{ color: 'rgba(180,100,255,0.9)', fontSize: 10, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
            Camera Constants
          </div>
          {Object.keys(cameraDefaults).map(key => {
            const isModified = key in cameraOverrideMap;
            const defaultVal = cameraDefaults[key];
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: isModified ? '#cc88ff' : 'rgba(255,255,255,0.55)', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={key}>
                  {key}
                </span>
                <input
                  type="number"
                  defaultValue={defaultVal}
                  step="any"
                  onBlur={e => handleCameraOverride(key, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCameraOverride(key, (e.target as HTMLInputElement).value); }}
                  style={{
                    width: 90, fontSize: 10, fontFamily: 'monospace',
                    background: '#0d0d1a', color: '#fff',
                    border: `1px solid ${isModified ? '#cc88ff' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: 3, padding: '2px 4px', textAlign: 'right',
                  }}
                />
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button style={{ ...btnStyle, fontSize: 10, padding: '3px 8px' }} onClick={handleResetCamera}>↺ Reset All</button>
            <button style={{ ...btnStyle, fontSize: 10, padding: '3px 8px', background: 'rgba(100,200,100,0.2)' }} onClick={handleCameraExport}>Export as TypeScript</button>
          </div>
        </div>
      )}

      {/* Effects tuner panel */}
      {effectsOpen && effectsDefaults && (
        <div style={{
          position: 'absolute', top: 40, left: 10, zIndex: 20,
          background: 'rgba(0,0,0,0.88)', border: '1px solid rgba(50,200,160,0.25)',
          borderRadius: 6, padding: '8px 10px', width: 260,
          maxHeight: '75vh', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {Object.keys(effectsDefaults).map(g => (
              <button
                key={g}
                onClick={() => setEffectsGroup(g)}
                style={{
                  ...btnStyle, fontSize: 9, padding: '2px 6px',
                  background: effectsGroup === g ? 'rgba(50,200,160,0.35)' : 'rgba(255,255,255,0.07)',
                  borderColor: effectsGroup === g ? '#32c8a0' : 'rgba(255,255,255,0.2)',
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {effectsDefaults[effectsGroup] && Object.keys(effectsDefaults[effectsGroup]).map(key => {
            const mapKey = `${effectsGroup}:${key}`;
            const isModified = mapKey in effectsOverrideMap;
            const defaultVal = effectsDefaults[effectsGroup][key];
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: isModified ? '#32c8a0' : 'rgba(255,255,255,0.55)', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={key}>
                  {key}
                </span>
                <input
                  type="number"
                  defaultValue={defaultVal}
                  step="any"
                  onBlur={e => handleEffectsOverride(effectsGroup, key, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEffectsOverride(effectsGroup, key, (e.target as HTMLInputElement).value); }}
                  style={{
                    width: 90, fontSize: 10, fontFamily: 'monospace',
                    background: '#0d0d1a', color: '#fff',
                    border: `1px solid ${isModified ? '#32c8a0' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: 3, padding: '2px 4px', textAlign: 'right',
                  }}
                />
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button style={{ ...btnStyle, fontSize: 10, padding: '3px 8px' }} onClick={handleResetEffects}>↺ Reset All</button>
            <button style={{ ...btnStyle, fontSize: 10, padding: '3px 8px', background: 'rgba(50,200,160,0.2)' }} onClick={handleEffectsExport}>Export as TypeScript</button>
          </div>
        </div>
      )}

      {/* Effects export modal */}
      {showEffectsExport && (
        <div style={{ ...overlayStyle, background: 'rgba(0,0,0,0.85)' }}>
          <div style={{
            background: '#1a1a2e', padding: 16, borderRadius: 8,
            width: '80%', maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <h3 style={{ color: '#fff', margin: 0 }}>effects.ts</h3>
            <textarea
              value={effectsExportTs}
              readOnly
              style={{ width: '100%', height: 400, fontFamily: 'monospace', fontSize: 11, background: '#0d0d1a', color: '#ccc', border: '1px solid #333', borderRadius: 4, padding: 8, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={primaryBtnStyle} onClick={() => navigator.clipboard.writeText(effectsExportTs)}>Copy to Clipboard</button>
              <button style={btnStyle} onClick={() => setShowEffectsExport(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Camera export modal */}
      {showCameraExport && (
        <div style={{ ...overlayStyle, background: 'rgba(0,0,0,0.85)' }}>
          <div style={{
            background: '#1a1a2e', padding: 16, borderRadius: 8,
            width: '80%', maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <h3 style={{ color: '#fff', margin: 0 }}>camera.ts</h3>
            <textarea
              value={cameraExportTs}
              readOnly
              style={{ width: '100%', height: 400, fontFamily: 'monospace', fontSize: 11, background: '#0d0d1a', color: '#ccc', border: '1px solid #333', borderRadius: 4, padding: 8, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={primaryBtnStyle} onClick={() => navigator.clipboard.writeText(cameraExportTs)}>Copy to Clipboard</button>
              <button style={btnStyle} onClick={() => setShowCameraExport(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Export JSON modal */}
      {showExportModal && (
        <div style={{ ...overlayStyle, background: 'rgba(0,0,0,0.8)' }}>
          <div style={{
            background: '#1a1a2e', padding: 16, borderRadius: 8,
            width: '80%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <h3 style={{ color: '#fff', margin: 0 }}>Objects JSON</h3>
            <textarea
              value={exportJson}
              readOnly
              style={{ width: '100%', height: 200, fontFamily: 'monospace', fontSize: 11, background: '#0d0d1a', color: '#ccc', border: '1px solid #333', borderRadius: 4, padding: 8, boxSizing: 'border-box' }}
            />
            <button style={btnStyle} onClick={() => setShowExportModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Physics export modal */}
      {showPhysicsExport && (
        <div style={{ ...overlayStyle, background: 'rgba(0,0,0,0.85)' }}>
          <div style={{
            background: '#1a1a2e', padding: 16, borderRadius: 8,
            width: '80%', maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <h3 style={{ color: '#fff', margin: 0 }}>physics.ts</h3>
            <textarea
              value={physicsExportTs}
              readOnly
              style={{ width: '100%', height: 400, fontFamily: 'monospace', fontSize: 11, background: '#0d0d1a', color: '#ccc', border: '1px solid #333', borderRadius: 4, padding: 8, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={primaryBtnStyle} onClick={() => navigator.clipboard.writeText(physicsExportTs)}>Copy to Clipboard</button>
              <button style={btnStyle} onClick={() => setShowPhysicsExport(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {paused && optionsOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 101 }}>
          <OptionsScreen noMusic inGame onBack={() => setOptionsOpen(false)} />
        </div>
      )}

      {paused && !optionsOpen && (
        <div style={overlayStyle}>
          <Stack align="center" gap="sm">
            <Title order={2} c="white">Paused</Title>
            <Button color="yellow" autoContrast onClick={() => { setPaused(false); engineRef.current?.resume(); }}>
              Resume
            </Button>
            <Button variant="default" onClick={() => setOptionsOpen(true)}>
              Options
            </Button>
            <Button variant="default" onClick={onMainMenu}>
              Main Menu
            </Button>
          </Stack>
        </div>
      )}
    </div>
  );
}
