import { useEffect, useState } from "react";
import type { GameState } from "../types/game.js";
import type { GameStateEmitter } from "../state/GameStateEmitter.js";

const DEFAULT_STATE: GameState = {
  playerSpeed: 0,
  playerMaxSpeed: 50,
  playerLap: 1,
  totalLaps: 3,
  playerBestLap: 0,
  currentLapTime: 0,
  playerPosition: 1,
  totalCars: 6,
  raceStarted: false,
  raceFinished: false,
  countdown: -1,
  countdownActive: false,
  results: [],
  carPositions: [],
  trackPoints: [],
  startFinish: null,
  playerFinished: false,
  checkpointSegmentTime: 0,
  checkpointBestTime: 0,
  checkpointFlashAge: 0,
  isWrongWay: false,
};

export function useGameState(emitter: GameStateEmitter): GameState {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);

  useEffect(() => {
    return emitter.subscribe(setState);
  }, [emitter]);

  return state;
}
