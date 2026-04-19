import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button, Group, TextInput, Title } from '@mantine/core';
import { CAR_DEFINITIONS } from '../../constants/cars.js';
import type { CarDefinition, VersusSelections } from '../../types/game.js';
import { CarFactory } from '../../game/car/CarFactory.js';

interface VersusCarSelectProps {
  trackId: string;
  onReady: (sel: VersusSelections) => void;
  onBack: () => void;
}

function StatBar({ label, value }: { label: string; value: number }) {
  const maxVal = label === 'handling' ? 1 : 50;
  const pct = (value / maxVal) * 100;
  return (
    <div className="stat-bar">
      <span className="stat-label">{label}</span>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CarPreview({ car }: { car: CarDefinition }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = 160, H = 110;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);
    camera.position.set(0, 18, 28);
    camera.lookAt(0, 2, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(10, 20, 10);
    scene.add(dir);

    const factory = new CarFactory();
    const carMesh = factory.createCar(car);
    scene.add(carMesh);

    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      carMesh.rotation.y += 0.012;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [car]);

  return <div ref={containerRef} style={{ width: 160, height: 110 }} />;
}

interface PlayerPanelProps {
  player: 1 | 2;
  selectedCarId: string | null;
  name: string;
  onNameChange: (name: string) => void;
  onCarSelect: (carId: string) => void;
}

function PlayerPanel({ player, selectedCarId, name, onNameChange, onCarSelect }: PlayerPanelProps) {
  const color = player === 1 ? '#5c9aff' : '#ff6666';
  const controls = player === 1 ? 'WASD + Left Shift' : 'Arrows + Right Shift';
  const selectedDef = CAR_DEFINITIONS.find(c => c.id === selectedCarId) ?? null;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      borderRight: player === 1 ? '1px solid rgba(255,255,255,0.15)' : undefined,
    }}>
      <div style={{ color, fontSize: '1.3rem', fontWeight: 800 }}>Player {player}</div>
      <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{controls}</div>

      <TextInput
        maxLength={12}
        value={name}
        onChange={e => onNameChange(e.target.value)}
        styles={{
          input: {
            background: 'rgba(255,255,255,0.1)',
            border: `1px solid ${color}`,
            color: '#fff',
            textAlign: 'center',
            width: 160,
          },
        }}
      />

      {selectedDef && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <CarPreview car={selectedDef} />
          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{selectedDef.name}</div>
          <div style={{ width: 160 }}>
            <StatBar label="speed" value={selectedDef.maxSpeed} />
            <StatBar label="accel" value={selectedDef.acceleration} />
            <StatBar label="handling" value={selectedDef.handling} />
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginTop: '4px',
      }}>
        {CAR_DEFINITIONS.map(car => (
          <button
            key={car.id}
            onClick={() => onCarSelect(car.id)}
            style={{
              background: selectedCarId === car.id ? color : 'rgba(255,255,255,0.08)',
              border: `2px solid ${selectedCarId === car.id ? color : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: selectedCarId === car.id ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >
            {car.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function VersusCarSelect({ trackId, onReady, onBack }: VersusCarSelectProps) {
  const [p1CarId, setP1CarId] = useState<string | null>(null);
  const [p2CarId, setP2CarId] = useState<string | null>(null);
  const [p1Name, setP1Name] = useState('Player 1');
  const [p2Name, setP2Name] = useState('Player 2');

  const canStart = p1CarId !== null && p2CarId !== null;

  const handleStart = () => {
    if (!p1CarId || !p2CarId) return;
    onReady({
      trackId,
      p1CarId,
      p2CarId,
      p1Name: p1Name.trim() || 'Player 1',
      p2Name: p2Name.trim() || 'Player 2',
    });
  };

  return (
    <div className="screen" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      padding: '16px',
      gap: '16px',
    }}>
      <Title order={2} ta="center">Local Versus — Choose Your Cars</Title>

      <div style={{ display: 'flex', flex: 1, gap: 0 }}>
        <PlayerPanel
          player={1}
          selectedCarId={p1CarId}
          name={p1Name}
          onNameChange={setP1Name}
          onCarSelect={setP1CarId}
        />
        <PlayerPanel
          player={2}
          selectedCarId={p2CarId}
          name={p2Name}
          onNameChange={setP2Name}
          onCarSelect={setP2CarId}
        />
      </div>

      <Group justify="center" gap="sm">
        {canStart && (
          <Button size="lg" color="yellow" onClick={handleStart}>
            Start Versus
          </Button>
        )}
        <Button variant="default" onClick={onBack}>
          Back
        </Button>
      </Group>
    </div>
  );
}
