import { useRef, useMemo } from 'react';
import { GameStateEmitter } from '../../state/GameStateEmitter.js';
import { useGameEngine } from '../../hooks/useGameEngine.js';
import { useGameState } from '../../hooks/useGameState.js';
import { Countdown } from '../hud/Countdown.js';
import { Speedometer } from '../hud/Speedometer.js';
import { LapTimer } from '../hud/LapTimer.js';
import { MinimapDisplay } from '../hud/MinimapDisplay.js';
import { PositionIndicator } from '../hud/PositionIndicator.js';
import { CheckpointTimer } from '../hud/CheckpointTimer.js';
import { WrongWayIndicator } from '../hud/WrongWayIndicator.js';
import { Scoreboard } from './Scoreboard.js';

interface RaceScreenProps {
  selectedTrackId: string;
  selectedCarId: string;
  totalLaps: number;
  onMainMenu: () => void;
  onRaceAgain: () => void;
  onBackToEditor?: () => void;
}

export function RaceScreen({ selectedTrackId, selectedCarId, totalLaps, onMainMenu, onRaceAgain, onBackToEditor }: RaceScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emitter = useMemo(() => new GameStateEmitter(), []);

  useGameEngine(canvasRef, selectedTrackId, selectedCarId, totalLaps, emitter);
  const state = useGameState(emitter);

  return (
    <div className="race-screen">
      <canvas ref={canvasRef} className="game-canvas" />

      {onBackToEditor && !state.playerFinished && (
        <button className="btn-back-to-editor" onClick={onBackToEditor}>
          ← Editor
        </button>
      )}

      {state.countdownActive && <Countdown value={state.countdown} />}

      <WrongWayIndicator visible={state.raceStarted && !state.playerFinished && state.isWrongWay} />

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
          <CheckpointTimer
            segmentTime={state.checkpointSegmentTime}
            bestTime={state.checkpointBestTime}
            flashAge={state.checkpointFlashAge}
          />
        </>
      )}

      {state.playerFinished && (
        <Scoreboard
          results={state.results}
          raceFinished={state.raceFinished}
          onMainMenu={onMainMenu}
          onRaceAgain={onRaceAgain}
          onBackToEditor={onBackToEditor}
        />
      )}
    </div>
  );
}
