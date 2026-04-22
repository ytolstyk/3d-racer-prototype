import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { VersusGameEngine } from '../game/VersusGameEngine.js';
import type { VersusStateEmitter } from '../state/VersusStateEmitter.js';

export function useVersusGameEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  trackId: string,
  p1CarId: string,
  p2CarId: string,
  p1Name: string,
  p2Name: string,
  emitter: VersusStateEmitter,
  reverse?: boolean,
  onReady?: () => void,
): MutableRefObject<VersusGameEngine | null> {
  const engineRef = useRef<VersusGameEngine | null>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    engineRef.current = new VersusGameEngine(canvas, trackId, p1CarId, p2CarId, p1Name, p2Name, emitter, reverse, () => onReadyRef.current?.());

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [canvasRef, trackId, p1CarId, p2CarId, p1Name, p2Name, emitter, reverse]);

  return engineRef;
}
