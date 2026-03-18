import { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine.js';
import type { GameStateEmitter } from '../state/GameStateEmitter.js';

export function useGameEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  selectedTrackId: string,
  selectedCarId: string,
  totalLaps: number,
  emitter: GameStateEmitter,
): void {
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    engineRef.current = new GameEngine(canvas, selectedTrackId, selectedCarId, totalLaps, emitter);

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [canvasRef, selectedTrackId, selectedCarId, totalLaps, emitter]);
}
