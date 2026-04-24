import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CarDefinition } from '../../types/game.js';
import { CarFactory } from '../../game/car/CarFactory.js';

interface CarPreviewProps {
  car: CarDefinition;
  width?: number;
  height?: number;
}

function CarPreviewInner({ car, width = 180, height = 130 }: CarPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200);
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
  }, [car, width, height]);

  return <div ref={containerRef} style={{ width, height }} />;
}

export const CarPreview = memo(CarPreviewInner);
