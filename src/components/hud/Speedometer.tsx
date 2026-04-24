import { memo } from 'react';

interface SpeedometerProps {
  speed: number;
  maxSpeed: number;
  name?: string;
}

function SpeedometerInner({ speed, maxSpeed, name }: SpeedometerProps) {
  const pct = Math.min((speed / maxSpeed) * 100, 100);

  return (
    <div className="hud-speedometer">
      {name && <div className="speed-name">{name}</div>}
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

export const Speedometer = memo(SpeedometerInner);
