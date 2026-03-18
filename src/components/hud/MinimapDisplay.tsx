import { useRef, useEffect } from 'react';
import type { MinimapCar, MinimapPoint } from '../../types/game.js';

interface MinimapDisplayProps {
  trackPoints: MinimapPoint[];
  carPositions: MinimapCar[];
}

const MAP_WIDTH = 240;
const MAP_HEIGHT = 160;
const PADDING = 10;

export function MinimapDisplay({ trackPoints, carPositions }: MinimapDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trackPoints.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find bounds
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of trackPoints) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }

    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    const scaleX = (MAP_WIDTH - PADDING * 2) / rangeX;
    const scaleZ = (MAP_HEIGHT - PADDING * 2) / rangeZ;
    const scale = Math.min(scaleX, scaleZ);

    const toScreen = (x: number, z: number): [number, number] => [
      PADDING + (maxX - x) * scale,
      PADDING + (maxZ - z) * scale,
    ];

    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(0, 0, MAP_WIDTH, MAP_HEIGHT, 6);
    ctx.fill();

    // Track outline
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < trackPoints.length; i++) {
      const [sx, sy] = toScreen(trackPoints[i].x, trackPoints[i].z);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.stroke();

    // Car dots
    for (const car of carPositions) {
      const [sx, sy] = toScreen(car.x, car.z);
      const radius = car.isPlayer ? 4 : 2.5;
      ctx.fillStyle = `#${car.color.toString(16).padStart(6, '0')}`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();

      if (car.isPlayer) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }, [trackPoints, carPositions]);

  return (
    <canvas
      ref={canvasRef}
      className="hud-minimap"
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
    />
  );
}
