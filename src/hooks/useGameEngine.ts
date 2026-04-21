import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Difficulty } from '../types/game.js';
import { GameEngine } from '../game/GameEngine.js';
import type { GameStateEmitter } from '../state/GameStateEmitter.js';

export function useGameEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  selectedTrackId: string,
  selectedCarId: string,
  totalLaps: number,
  difficulty: Difficulty,
  emitter: GameStateEmitter,
  reverse?: boolean,
  onReady?: () => void,
): MutableRefObject<GameEngine | null> {
  const engineRef = useRef<GameEngine | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    engineRef.current = new GameEngine(canvas, selectedTrackId, selectedCarId, totalLaps, difficulty, emitter, reverse, () => onReadyRef.current?.());

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [canvasRef, selectedTrackId, selectedCarId, totalLaps, difficulty, emitter, reverse]);

  return engineRef;
}
