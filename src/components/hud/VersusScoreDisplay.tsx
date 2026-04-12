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

export function VersusScoreDisplay({ p1Name, p2Name, p1Score, p2Score, p1Color, p2Color }: VersusScoreDisplayProps) {
  return (
    <div style={{
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
    }}>
      <span style={{ color: toHex(p1Color), fontWeight: 700, fontSize: '1rem' }}>{p1Name}</span>
      <span style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '4px' }}>
        {p1Score} : {p2Score}
      </span>
      <span style={{ color: toHex(p2Color), fontWeight: 700, fontSize: '1rem' }}>{p2Name}</span>
    </div>
  );
}
