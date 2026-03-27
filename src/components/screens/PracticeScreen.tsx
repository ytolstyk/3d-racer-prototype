import { useRef, useState, useEffect, useCallback } from 'react';
import type { KitchenItemType } from '../../types/game.js';
import { PracticeEngine, PRACTICE_DEFAULT_OBJECTS } from '../../game/PracticeEngine.js';

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
  selectedCarId: string;
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

export function PracticeScreen({ selectedCarId, onMainMenu, onOpenInEditor }: PracticeScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PracticeEngine | null>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(1);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeType, setActiveType] = useState<KitchenItemType | null>(null);
  const [selectedObjIdx, setSelectedObjIdx] = useState(-1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportJson, setExportJson] = useState('');
  const [objectCount, setObjectCount] = useState(PRACTICE_DEFAULT_OBJECTS.length);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engineRef.current = new PracticeEngine(canvas, selectedCarId);
    setMaxSpeed(engineRef.current.getMaxSpeed());
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [selectedCarId]);

  useEffect(() => {
    const id = setInterval(() => {
      if (engineRef.current) setSpeed(engineRef.current.getSpeed());
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

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
  };
  const primaryBtnStyle: React.CSSProperties = { ...btnStyle, background: 'rgba(100,200,255,0.25)' };

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
        onClick={() => setPaletteOpen(p => !p)}
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
        display: 'flex', gap: 8, zIndex: 10,
      }}>
        <button style={btnStyle} onClick={handleExport}>Export JSON</button>
        <button style={primaryBtnStyle} onClick={handleEditInEditor}>Edit in Track Editor</button>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, alignSelf: 'center' }}>
          {objectCount} object{objectCount !== 1 ? 's' : ''}
        </span>
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

      {/* ESC hint */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 10,
        color: 'rgba(255,255,255,0.4)', fontSize: 11,
      }}>
        ESC = pause
      </div>

      {/* Export modal */}
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
