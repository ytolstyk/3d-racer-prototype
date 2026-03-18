interface SpeedometerProps {
  speed: number;
  maxSpeed: number;
}

export function Speedometer({ speed, maxSpeed }: SpeedometerProps) {
  const pct = Math.min((speed / maxSpeed) * 100, 100);

  return (
    <div className="hud-speedometer">
      <div className="speed-value">{Math.round(speed)}</div>
      <div className="speed-bar-bg">
        <div
          className="speed-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="speed-label">SPEED</div>
    </div>
  );
}
