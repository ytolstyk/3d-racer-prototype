import { useRef, useState, useEffect, useCallback } from 'react';
import type { KitchenItemType, PhysicsTelemetry, PhysicsGroup } from '../../types/game.js';
import { PracticeEngine, PRACTICE_DEFAULT_OBJECTS } from '../../game/PracticeEngine.js';
import { CAR_DEFINITIONS } from '../../constants/cars.js';

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
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(1);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeType, setActiveType] = useState<KitchenItemType | null>(null);
  const [selectedObjIdx, setSelectedObjIdx] = useState(-1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportJson, setExportJson] = useState('');
  const [objectCount, setObjectCount] = useState(PRACTICE_DEFAULT_OBJECTS.length);

  // Telemetry + tuner state
  const [telemetry, setTelemetry] = useState<PhysicsTelemetry | null>(null);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [tunerGroup, setTunerGroup] = useState<PhysicsGroup>('drift');
  const [physicsDefaults, setPhysicsDefaults] = useState<Record<PhysicsGroup, Record<string, number>> | null>(null);
  const [overrideMap, setOverrideMap] = useState<Record<string, number>>({});
  const [showPhysicsExport, setShowPhysicsExport] = useState(false);
  const [physicsExportTs, setPhysicsExportTs] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engineRef.current = new PracticeEngine(canvas, selectedCarId);
    setMaxSpeed(engineRef.current.getMaxSpeed());
    setPhysicsDefaults(engineRef.current.getPhysicsDefaults());
    setOverrideMap({});
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
      }
    }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      setPaused(prev => {
        const next = !prev;
        if (next) engineRef.current?.pause();
        else engineRef.current?.resume();
        return next;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

    // Select nearest object
    const objects = engine.getObjects();
    let nearestIdx = -1;
    let nearestDist = 60;
    for (let i = 0; i < objects.length; i++) {
      const dist = Math.hypot(objects[i].x - x, objects[i].z - z);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    }
    setSelectedObjIdx(nearestIdx);
  }, [activeType, paused]);

  const handleDeleteSelected = () => {
    if (selectedObjIdx === -1 || !engineRef.current) return;
    engineRef.current.removeObject(selectedObjIdx);
    setObjectCount(engineRef.current.getObjects().length);
    setSelectedObjIdx(-1);
  };

  const handleClearAll = () => {
    engineRef.current?.removeAllObjects();
    setObjectCount(0);
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

  const handlePhysicsExport = useCallback(() => {
    setPhysicsExportTs(engineRef.current?.exportPhysicsTS() ?? '');
    setShowPhysicsExport(true);
  }, []);

  const toggleTelemetry = useCallback(() => {
    setTelemetryOpen(p => { if (!p) setTunerOpen(false); return !p; });
  }, []);

  const toggleTuner = useCallback(() => {
    setTunerOpen(p => { if (!p) setTelemetryOpen(false); return !p; });
  }, []);

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
  };
  const primaryBtnStyle: React.CSSProperties = { ...btnStyle, background: 'rgba(100,200,255,0.25)' };

  const groupKeys = physicsDefaults ? Object.keys(physicsDefaults[tunerGroup]) : [];

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
        onClick={() => setPaletteOpen(p => { if (p) setActiveType(null); return !p; })}
      >
        {paletteOpen ? '× Close' : '+ Objects'}
      </button>

      {/* Object palette */}
      {paletteOpen && (
        <div style={{ ...panelStyle, top: 46 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 6 }}>
            {KITCHEN_ITEM_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setActiveType(t => t === type ? null : type)}
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
          {activeType && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
              Click canvas to place {ITEM_LABELS[activeType]}
            </div>
          )}
          {!activeType && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
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
            {objectCount} object{objectCount !== 1 ? 's' : ''}
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
          {/* Group tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {(['physics', 'drift', 'controller'] as PhysicsGroup[]).map(g => (
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

          {/* Constants */}
          {groupKeys.map(key => {
            const mapKey = `${tunerGroup}:${key}`;
            const isModified = mapKey in overrideMap;
            const defaultVal = physicsDefaults[tunerGroup][key];
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: isModified ? '#ffaa00' : 'rgba(255,255,255,0.55)', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={key}>
                  {key}
                </span>
                <input
                  type="number"
                  defaultValue={defaultVal}
                  step="any"
                  onBlur={e => handleOverride(tunerGroup, key, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleOverride(tunerGroup, key, (e.target as HTMLInputElement).value); }}
                  style={{
                    width: 90, fontSize: 10, fontFamily: 'monospace',
                    background: '#0d0d1a', color: '#fff',
                    border: `1px solid ${isModified ? '#ffaa00' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: 3, padding: '2px 4px', textAlign: 'right',
                  }}
                />
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button style={{ ...btnStyle, fontSize: 10, padding: '3px 8px' }} onClick={handleResetPhysics}>↺ Reset All</button>
            <button style={{ ...btnStyle, fontSize: 10, padding: '3px 8px', background: 'rgba(100,200,100,0.2)' }} onClick={handlePhysicsExport}>Export as TypeScript</button>
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
      {paused && (
        <div style={overlayStyle}>
          <h2 style={{ color: '#fff', margin: 0 }}>Paused</h2>
          <button style={primaryBtnStyle} onClick={() => { setPaused(false); engineRef.current?.resume(); }}>
            Resume
          </button>
          <button style={btnStyle} onClick={onMainMenu}>
            Main Menu
          </button>
        </div>
      )}
    </div>
  );
}
