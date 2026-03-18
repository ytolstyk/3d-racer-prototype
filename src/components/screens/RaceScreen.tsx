import { useRef, useMemo } from 'react';
import { GameStateEmitter } from '../../state/GameStateEmitter.js';
import { useGameEngine } from '../../hooks/useGameEngine.js';
import { useGameState } from '../../hooks/useGameState.js';
import { Countdown } from '../hud/Countdown.js';
import { Speedometer } from '../hud/Speedometer.js';
import { LapTimer } from '../hud/LapTimer.js';
import { MinimapDisplay } from '../hud/MinimapDisplay.js';
import { PositionIndicator } from '../hud/PositionIndicator.js';
import { Scoreboard } from './Scoreboard.js';

interface RaceScreenProps {
  selectedTrackId: string;
  selectedCarId: string;
  totalLaps: number;
  onMainMenu: () => void;
  onRaceAgain: () => void;
}

export function RaceScreen({ selectedTrackId, selectedCarId, totalLaps, onMainMenu, onRaceAgain }: RaceScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emitter = useMemo(() => new GameStateEmitter(), []);

  useGameEngine(canvasRef, selectedTrackId, selectedCarId, totalLaps, emitter);
  const state = useGameState(emitter);

  return (
    <div className="race-screen">
      <canvas ref={canvasRef} className="game-canvas" />

      {state.countdownActive && <Countdown value={state.countdown} />}

      {state.raceStarted && !state.playerFinished && (
        <>
          <LapTimer
            currentLap={state.playerLap}
            totalLaps={state.totalLaps}
            currentLapTime={state.currentLapTime}
            bestLapTime={state.playerBestLap}
          />
          <PositionIndicator
            position={state.playerPosition}
            total={state.totalCars}
          />
          <Speedometer
            speed={state.playerSpeed}
            maxSpeed={state.playerMaxSpeed}
          />
          <MinimapDisplay
            trackPoints={state.trackPoints}
            carPositions={state.carPositions}
          />
        </>
      )}

      {state.playerFinished && (
        <Scoreboard
          results={state.results}
          raceFinished={state.raceFinished}
          onMainMenu={onMainMenu}
          onRaceAgain={onRaceAgain}
        />
      )}
    </div>
  );
}
