import { memo } from 'react';

interface PositionIndicatorProps {
  position: number;
  total: number;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function PositionIndicatorInner({ position, total }: PositionIndicatorProps) {
  return (
    <div className="hud-position">
      <span className="position-number">{ordinal(position)}</span>
      <span className="position-total"> / {total}</span>
    </div>
  );
}

export const PositionIndicator = memo(PositionIndicatorInner);
