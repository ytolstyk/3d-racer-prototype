import type { VersusRoundState } from '../../types/game.js';

interface VersusRoundOverlayProps {
  roundState: VersusRoundState;
  roundWinner: 1 | 2 | null;
  matchWinner: 1 | 2 | null;
  p1Name: string;
  p2Name: string;
  p1Color: number;
  p2Color: number;
}

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function VersusRoundOverlay({
  roundState,
  roundWinner,
  matchWinner,
  p1Name,
  p2Name,
  p1Color,
  p2Color,
}: VersusRoundOverlayProps) {
  if (roundState !== 'point_scored' && roundState !== 'resetting') return null;

  const winnerName = roundWinner === 1 ? p1Name : p2Name;
  const winnerColor = roundWinner === 1 ? toHex(p1Color) : toHex(p2Color);
  const message = matchWinner ? `${winnerName} wins the match!` : `${winnerName} scores!`;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
      zIndex: 50,
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.75)',
        borderRadius: '16px',
        padding: '24px 48px',
        textAlign: 'center',
      }}>
        <div style={{
          color: winnerColor,
          fontSize: '2.5rem',
          fontWeight: 900,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}>
          {message}
        </div>
      </div>
    </div>
  );
}
