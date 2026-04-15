import { useRef, useMemo } from 'react';
import type { VersusSelections } from '../../types/game.js';
import { VersusStateEmitter } from '../../state/VersusStateEmitter.js';
import { useVersusGameEngine } from '../../hooks/useVersusGameEngine.js';
import { useVersusGameState } from '../../hooks/useVersusGameState.js';
import { Countdown } from '../hud/Countdown.js';
import { Speedometer } from '../hud/Speedometer.js';
import { VersusScoreDisplay } from '../hud/VersusScoreDisplay.js';
import { VersusRoundOverlay } from '../hud/VersusRoundOverlay.js';
import { MinimapDisplay } from '../hud/MinimapDisplay.js';
import { WrongWayIndicator } from '../hud/WrongWayIndicator.js';
import { VersusEndScreen } from './VersusEndScreen.js';

interface VersusRaceScreenProps {
  selections: VersusSelections;
  reverse?: boolean;
  onMainMenu: () => void;
  onPlayAgain: () => void;
}

export function VersusRaceScreen({ selections, reverse, onMainMenu, onPlayAgain }: VersusRaceScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emitter = useMemo(() => new VersusStateEmitter(), []);

  useVersusGameEngine(
    canvasRef,
    selections.trackId,
    selections.p1CarId,
    selections.p2CarId,
    selections.p1Name,
    selections.p2Name,
    emitter,
    reverse,
  );

  const state = useVersusGameState(emitter);

  return (
    <div className="race-screen">
      <canvas ref={canvasRef} className="game-canvas" />

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
