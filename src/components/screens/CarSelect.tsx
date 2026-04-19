import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Button, Progress, Text, Title } from '@mantine/core';
import { CAR_DEFINITIONS } from '../../constants/cars.js';
import type { CarDefinition } from '../../types/game.js';
import { CarFactory } from '../../game/car/CarFactory.js';

interface CarSelectProps {
  onSelect: (carId: string) => void;
  onBack: () => void;
}

function StatBar({ label, value }: { label: string; value: number }) {
  const maxVal = label === 'handling' ? 1 : 50;
  const pct = (value / maxVal) * 100;
  return (
    <div className="stat-bar">
      <Text size="xs" className="stat-label" tt="capitalize">{label}</Text>
      <Progress value={pct} color="yellow" size="sm" style={{ flex: 1 }} />
    </div>
  );
}

function CarPreview({ car }: { car: CarDefinition }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = 180, H = 130;
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

  return <div ref={containerRef} style={{ width: 180, height: 130 }} />;
}

export function CarSelect({ onSelect, onBack }: CarSelectProps) {
  return (
    <div className="screen car-select">
      <Title order={2}>Choose Your Car</Title>
      <div className="car-grid">
        {CAR_DEFINITIONS.map((car) => (
          <button
            key={car.id}
            className="car-card"
            onClick={() => onSelect(car.id)}
          >
            <div className="car-preview">
              <CarPreview car={car} />
            </div>
            <div className="car-info">
              <h3>{car.name}</h3>
              <StatBar label="speed" value={car.maxSpeed} />
              <StatBar label="accel" value={car.acceleration} />
              <StatBar label="handling" value={car.handling} />
              <StatBar label="braking" value={car.braking} />
            </div>
          </button>
        ))}
      </div>
      <Button variant="default" mt="md" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
