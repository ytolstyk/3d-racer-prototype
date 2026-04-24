import { memo, useMemo } from 'react';
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

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.45)',
  zIndex: 50,
  pointerEvents: 'none',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.75)',
  borderRadius: '16px',
  padding: '24px 48px',
  textAlign: 'center',
};

const messageBaseStyle: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 900,
  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
};

function VersusRoundOverlayInner({
  roundState,
  roundWinner,
  matchWinner,
  p1Name,
  p2Name,
  p1Color,
  p2Color,
}: VersusRoundOverlayProps) {
  const p1Hex = useMemo(() => toHex(p1Color), [p1Color]);
  const p2Hex = useMemo(() => toHex(p2Color), [p2Color]);

  if (roundState !== 'point_scored' && roundState !== 'resetting') return null;

  const winnerName = roundWinner === 1 ? p1Name : p2Name;
  const winnerColor = roundWinner === 1 ? p1Hex : p2Hex;
  const message = matchWinner ? `${winnerName} wins the match!` : `${winnerName} scores!`;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ ...messageBaseStyle, color: winnerColor }}>
          {message}
        </div>
      </div>
    </div>
  );
}

export const VersusRoundOverlay = memo(VersusRoundOverlayInner);
