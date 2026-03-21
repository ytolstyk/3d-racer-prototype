interface CheckpointTimerProps {
  segmentTime: number;
  bestTime: number;
  flashAge: number; // ms since crossing
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const frac = Math.floor((ms % 1000) / 10);
  return `${s}.${frac.toString().padStart(2, '0')}`;
}

export function CheckpointTimer({ segmentTime, bestTime, flashAge }: CheckpointTimerProps) {
  if (flashAge > 3000 || segmentTime === 0) return null;

  const opacity = flashAge > 2000 ? 1 - (flashAge - 2000) / 1000 : 1;
  const isFaster = bestTime === 0 || segmentTime <= bestTime;
  const color = isFaster ? '#5db345' : '#e84040';
  const delta = bestTime > 0 ? segmentTime - bestTime : 0;
  const sign = delta > 0 ? '+' : '';

  return (
    <div
      className="hud-checkpoint-timer"
      style={{ opacity, borderTopColor: color }}
    >
      <div className="checkpoint-label">SECTOR</div>
      <div className="checkpoint-time" style={{ color }}>{fmt(segmentTime)}</div>
      {bestTime > 0 && (
        <div className="checkpoint-delta" style={{ color }}>
          {sign}{fmt(Math.abs(delta))}
        </div>
      )}
    </div>
  );
}
