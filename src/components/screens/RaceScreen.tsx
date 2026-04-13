import { useRef, useMemo, useState, useEffect } from 'react';
import type { Difficulty } from '../../types/game.js';
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
  difficulty: Difficulty;
  onMainMenu: () => void;
  onRaceAgain: () => void;
  onBackToEditor?: () => void;
}

const pauseOverlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: '12px',
  zIndex: 100,
};

export function RaceScreen({ selectedTrackId, selectedCarId, totalLaps, difficulty, onMainMenu, onRaceAgain, onBackToEditor }: RaceScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emitter = useMemo(() => new GameStateEmitter(), []);
  const [paused, setPaused] = useState(false);

  const engineRef = useGameEngine(canvasRef, selectedTrackId, selectedCarId, totalLaps, difficulty, emitter);
  const state = useGameState(emitter);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      setPaused(prev => {
        const next = !prev;
        if (next) engineRef.current?.pause();
        else engineRef.current?.resume();
        return next;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engineRef]);

  return (
    <div className="race-screen">
      <canvas ref={canvasRef} className="game-canvas" />

      {onBackToEditor && !state.playerFinished && (
        <button className="btn-back-to-editor" onClick={onBackToEditor}>
          ← Editor
        </button>
      )}

      {paused && (
        <div style={pauseOverlayStyle}>
          <h2 style={{ color: '#fff', margin: 0 }}>Paused</h2>
          <button className="btn btn-primary" onClick={() => { setPaused(false); engineRef.current?.resume(); }}>
            Resume
          </button>
          {onBackToEditor && (
            <button className="btn btn-secondary" onClick={() => {
              const cfg = engineRef.current?.getTrackConfig();
              if (cfg) sessionStorage.setItem('editor_track', JSON.stringify(cfg));
              onBackToEditor();
            }}>
              Edit Current Track
            </button>
          )}
          <button className="btn btn-secondary" onClick={onMainMenu}>
            Main Menu
          </button>
        </div>
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
