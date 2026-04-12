import type { VersusGameState } from '../../types/game.js';

interface VersusEndScreenProps {
  state: VersusGameState;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function fmtSpeed(units: number): string {
  return `${Math.round(units)} km/h`;
}

function fmtDrift(units: number): string {
  return `${Math.round(units)} m`;
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function fmtGap(units: number): string {
  if (!isFinite(units)) return '—';
  return `${units.toFixed(1)} m`;
}

export function VersusEndScreen({ state, onPlayAgain, onMainMenu }: VersusEndScreenProps) {
  const { p1Name, p2Name, p1Color, p2Color, matchWinner, stats } = state;
  const winnerName = matchWinner === 1 ? p1Name : p2Name;
  const winnerColor = matchWinner === 1 ? toHex(p1Color) : toHex(p2Color);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      gap: '24px',
    }}>
      <div style={{ color: winnerColor, fontSize: '2.2rem', fontWeight: 900 }}>
        {winnerName} wins!
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '16px 32px',
        minWidth: '360px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: '8px', color: '#aaa' }}>Stat</th>
              <th style={{ textAlign: 'right', paddingBottom: '8px', color: toHex(p1Color) }}>{p1Name}</th>
              <th style={{ textAlign: 'right', paddingBottom: '8px', color: toHex(p2Color) }}>{p2Name}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '4px 0', color: '#ccc' }}>Top Speed</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>{fmtSpeed(stats.p1TopSpeed)}</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>{fmtSpeed(stats.p2TopSpeed)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: '#ccc' }}>Total Drift</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>{fmtDrift(stats.p1TotalDrift)}</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>{fmtDrift(stats.p2TotalDrift)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: '#ccc' }}>Time in Lead</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>{fmtTime(stats.p1TimeInLead)}</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>{fmtTime(stats.p2TimeInLead)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: '#ccc' }}>Closest Gap</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }} colSpan={2}>{fmtGap(stats.closestGap)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary" onClick={onPlayAgain}>
          Play Again
        </button>
        <button className="btn btn-secondary" onClick={onMainMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}
