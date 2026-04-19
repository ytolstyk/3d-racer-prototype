import { useRef, useMemo, useState, useEffect } from 'react';
import { Button, Stack, Title } from '@mantine/core';
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
import { VolumeControls } from '../hud/VolumeControls.js';
import { loadAudioPrefs, saveAudioPrefs } from '../../game/audio/AudioPrefs.js';

interface RaceScreenProps {
  selectedTrackId: string;
  selectedCarId: string;
  totalLaps: number;
  difficulty: Difficulty;
  reverse?: boolean;
  onMainMenu: () => void;
  onRaceAgain: () => void;
  onBackToEditor?: () => void;
}

const pauseOverlayStyle = {
  position: 'absolute' as const, inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', flexDirection: 'column' as const,
  alignItems: 'center', justifyContent: 'center',
  zIndex: 100,
};

export function RaceScreen({ selectedTrackId, selectedCarId, totalLaps, difficulty, reverse, onMainMenu, onRaceAgain, onBackToEditor }: RaceScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emitter = useMemo(() => new GameStateEmitter(), []);
  const [paused, setPaused] = useState(false);
  const [prefs, setPrefs] = useState(() => loadAudioPrefs());

  const engineRef = useGameEngine(canvasRef, selectedTrackId, selectedCarId, totalLaps, difficulty, emitter, reverse);
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

  const handleMasterChange = (v: number) => {
    setPrefs(p => ({ ...p, masterVolume: v }));
    saveAudioPrefs({ masterVolume: v });
    engineRef.current?.getAudioManager()?.setMasterVolume(v);
  };

  const handleMusicChange = (v: number) => {
    setPrefs(p => ({ ...p, musicVolume: v }));
    saveAudioPrefs({ musicVolume: v });
  };

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
          <Stack align="center" gap="sm">
            <Title order={2} c="white">Paused</Title>
            <Button color="yellow" onClick={() => { setPaused(false); engineRef.current?.resume(); }}>
              Resume
            </Button>
            {onBackToEditor && (
              <Button variant="default" onClick={() => {
                const cfg = engineRef.current?.getTrackConfig();
                if (cfg) sessionStorage.setItem('editor_track', JSON.stringify(cfg));
                onBackToEditor();
              }}>
                Edit Current Track
              </Button>
            )}
            <Button variant="default" onClick={onMainMenu}>
              Main Menu
            </Button>
            <VolumeControls
              masterVolume={prefs.masterVolume}
              musicVolume={prefs.musicVolume}
              onMasterChange={handleMasterChange}
              onMusicChange={handleMusicChange}
            />
          </Stack>
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
            startFinish={state.startFinish}
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
