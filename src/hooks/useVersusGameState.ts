import { useEffect, useState } from 'react';
import type { VersusGameState } from '../types/game.js';
import type { VersusStateEmitter } from '../state/VersusStateEmitter.js';

const DEFAULT_STATE: VersusGameState = {
  p1Speed: 0,
  p2Speed: 0,
  p1MaxSpeed: 120,
  p2MaxSpeed: 120,
  p1Score: 0,
  p2Score: 0,
  pointsToWin: 3,
  roundState: 'countdown',
  roundWinner: null,
  matchWinner: null,
  countdown: -1,
  countdownActive: false,
  raceStarted: false,
  p1Name: 'Player 1',
  p2Name: 'Player 2',
  p1Color: 0x1565C0,
  p2Color: 0xB71C1C,
  stats: {
    p1TopSpeed: 0,
    p2TopSpeed: 0,
    p1TotalDrift: 0,
    p2TotalDrift: 0,
    p1TimeInLead: 0,
    p2TimeInLead: 0,
    closestGap: Infinity,
  },
  carPositions: [],
  trackPoints: [],
};

export function useVersusGameState(emitter: VersusStateEmitter): VersusGameState {
  const [state, setState] = useState<VersusGameState>(DEFAULT_STATE);

  useEffect(() => {
    return emitter.subscribe(setState);
  }, [emitter]);

  return state;
}
