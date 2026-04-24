import { memo } from 'react';

interface LapTimerProps {
  currentLap: number;
  totalLaps: number;
  currentLapTime: number;
  bestLapTime: number;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '0:00.000';
  const totalSec = ms / 1000;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

function LapTimerInner({ currentLap, totalLaps, currentLapTime, bestLapTime }: LapTimerProps) {
  return (
    <div className="hud-lap-timer">
      <div className="lap-count">
        Lap {Math.min(currentLap, totalLaps)}/{totalLaps}
      </div>
      <div className="lap-time">{formatTime(currentLapTime)}</div>
      {bestLapTime > 0 && (
        <div className="best-lap">Best: {formatTime(bestLapTime)}</div>
      )}
    </div>
  );
}

export const LapTimer = memo(LapTimerInner);
