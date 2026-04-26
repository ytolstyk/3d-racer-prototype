import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Button, Stack, Title } from '@mantine/core';
import type { VersusSelections } from '../../types/game.js';
import { VersusStateEmitter } from '../../state/VersusStateEmitter.js';
import { useVersusGameEngine } from '../../hooks/useVersusGameEngine.js';
import { useVersusGameState } from '../../hooks/useVersusGameState.js';
import { useAutoHideCursor } from '../../hooks/useAutoHideCursor.js';
import { Countdown } from '../hud/Countdown.js';
import { Speedometer } from '../hud/Speedometer.js';
import { VersusScoreDisplay } from '../hud/VersusScoreDisplay.js';
import { VersusRoundOverlay } from '../hud/VersusRoundOverlay.js';
import { MinimapDisplay } from '../hud/MinimapDisplay.js';
import { WrongWayIndicator } from '../hud/WrongWayIndicator.js';
import { VersusEndScreen } from './VersusEndScreen.js';
import { OptionsScreen } from './OptionsScreen.js';

interface VersusRaceScreenProps {
  selections: VersusSelections;
  reverse?: boolean;
  onMainMenu: () => void;
  onPlayAgain: () => void;
}

const pauseOverlayStyle = {
  position: 'absolute' as const, inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', flexDirection: 'column' as const,
  alignItems: 'center', justifyContent: 'center',
  zIndex: 100,
};

const loadingOverlayStyle = {
  position: 'absolute' as const, inset: 0,
  background: '#000',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 200,
};

const loadingTextStyle = { color: 'rgba(255,255,255,0.7)', fontSize: 18, letterSpacing: 2 };

export function VersusRaceScreen({ selections, reverse, onMainMenu, onPlayAgain }: VersusRaceScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emitter = useMemo(() => new VersusStateEmitter(), []);
  const [paused, setPaused] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const engineRef = useVersusGameEngine(
    canvasRef,
    selections.trackId,
    selections.p1CarId,
    selections.p2CarId,
    selections.p1Name,
    selections.p2Name,
    emitter,
    reverse,
    () => setIsReady(true),
  );

  const state = useVersusGameState(emitter);

  useAutoHideCursor(!paused && state.matchWinner === null);

  const handleResume = useCallback(() => {
    setPaused(false);
    engineRef.current?.resume();
  }, [engineRef]);

  const handleOptionsOpen = useCallback(() => setOptionsOpen(true), []);
  const handleOptionsClose = useCallback(() => setOptionsOpen(false), []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code !== 'Escape') return;
    e.preventDefault();
    if (optionsOpen) { setOptionsOpen(false); return; }
    setPaused(prev => {
      const next = !prev;
      if (next) engineRef.current?.pause();
      else engineRef.current?.resume();
      return next;
    });
  }, [engineRef, optionsOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="race-screen">
      <canvas ref={canvasRef} className="game-canvas" />

      {!isReady && (
        <div style={loadingOverlayStyle}>
          <div style={loadingTextStyle}>LOADING...</div>
        </div>
      )}

      {paused && optionsOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 101 }}>
          <OptionsScreen noMusic inGame onBack={handleOptionsClose} />
        </div>
      )}

      {paused && !optionsOpen && (
        <div style={pauseOverlayStyle}>
          <Stack align="center" gap="sm">
            <Title order={2} c="white">Paused</Title>
            <Button color="yellow" autoContrast onClick={handleResume}>
              Resume
            </Button>
            <Button variant="default" onClick={handleOptionsOpen}>
              Options
            </Button>
            <Button variant="default" onClick={onMainMenu}>
              Main Menu
            </Button>
          </Stack>
        </div>
      )}

      <VersusScoreDisplay
        p1Name={state.p1Name}
        p2Name={state.p2Name}
        p1Score={state.p1Score}
        p2Score={state.p2Score}
        p1Color={state.p1Color}
        p2Color={state.p2Color}
      />

      {state.countdownActive && <Countdown value={state.countdown} />}

      <VersusRoundOverlay
        roundState={state.roundState}
        roundWinner={state.roundWinner}
        matchWinner={state.matchWinner}
        p1Name={state.p1Name}
        p2Name={state.p2Name}
        p1Color={state.p1Color}
        p2Color={state.p2Color}
      />

      {state.raceStarted && state.roundState === 'racing' && (
        <>
          <div className="versus-p1-hud">
            <Speedometer speed={state.p1Speed} maxSpeed={state.p1MaxSpeed} name={state.p1Name} />
          </div>
          <div className="versus-p2-hud">
            <Speedometer speed={state.p2Speed} maxSpeed={state.p2MaxSpeed} name={state.p2Name} />
          </div>
        </>
      )}

      <WrongWayIndicator visible={state.p1WrongWay || state.p2WrongWay} />

      <MinimapDisplay
        trackPoints={state.trackPoints}
        carPositions={state.carPositions}
        startFinish={state.startFinish}
      />

      {state.matchWinner !== null && (
        <VersusEndScreen
          state={state}
          onPlayAgain={onPlayAgain}
          onMainMenu={onMainMenu}
        />
      )}
    </div>
  );
}
