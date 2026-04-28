import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Difficulty } from '../types/game.js';
import { GameEngine } from '../game/GameEngine.js';
import type { GameStateEmitter } from '../state/GameStateEmitter.js';
import type { RandomizerCardDef } from '../constants/randomizer.js';
import { applyMutations } from '../constants/randomizer.js';

export function useGameEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  selectedTrackId: string,
  selectedCarId: string,
  totalLaps: number,
  difficulty: Difficulty,
  emitter: GameStateEmitter,
  reverse?: boolean,
  activeRandomizer?: RandomizerCardDef | null,
  onReady?: () => void,
): MutableRefObject<GameEngine | null> {
  const engineRef = useRef<GameEngine | null>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const randomizerValues = activeRandomizer ? applyMutations([activeRandomizer]) : undefined;
    engineRef.current = new GameEngine(canvas, selectedTrackId, selectedCarId, totalLaps, difficulty, emitter, reverse, () => onReadyRef.current?.(), randomizerValues);

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, selectedTrackId, selectedCarId, totalLaps, difficulty, emitter, reverse]);

  return engineRef;
}
