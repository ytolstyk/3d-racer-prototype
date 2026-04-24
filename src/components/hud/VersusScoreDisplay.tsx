import { memo, useMemo } from 'react';

interface VersusScoreDisplayProps {
  p1Name: string;
  p2Name: string;
  p1Score: number;
  p2Score: number;
  p1Color: number;
  p2Color: number;
}

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.65)',
  borderRadius: '8px',
  padding: '6px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  zIndex: 20,
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

const scoreStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: '1.4rem',
  fontWeight: 900,
  letterSpacing: '4px',
};

const nameStyle: React.CSSProperties = { fontWeight: 700, fontSize: '1rem' };

function VersusScoreDisplayInner({ p1Name, p2Name, p1Score, p2Score, p1Color, p2Color }: VersusScoreDisplayProps) {
  const p1Hex = useMemo(() => toHex(p1Color), [p1Color]);
  const p2Hex = useMemo(() => toHex(p2Color), [p2Color]);

  return (
    <div style={containerStyle}>
      <span style={{ ...nameStyle, color: p1Hex }}>{p1Name}</span>
      <span style={scoreStyle}>
        {p1Score} : {p2Score}
      </span>
      <span style={{ ...nameStyle, color: p2Hex }}>{p2Name}</span>
    </div>
  );
}

export const VersusScoreDisplay = memo(VersusScoreDisplayInner);
