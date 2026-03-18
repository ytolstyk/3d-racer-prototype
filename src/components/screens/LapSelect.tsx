import { useState } from 'react';

interface LapSelectProps {
  onSelect: (laps: number) => void;
  onBack: () => void;
}

export function LapSelect({ onSelect, onBack }: LapSelectProps) {
  const [laps, setLaps] = useState(3);

  return (
    <div className="screen lap-select">
      <h2>Number of Laps</h2>
      <div className="lap-selector">
        <button
          className="btn btn-icon"
          onClick={() => setLaps((l) => Math.max(1, l - 1))}
          disabled={laps <= 1}
        >
          -
        </button>
        <span className="lap-number">{laps}</span>
        <button
          className="btn btn-icon"
          onClick={() => setLaps((l) => Math.min(10, l + 1))}
          disabled={laps >= 10}
        >
          +
        </button>
      </div>
      <div className="lap-actions">
        <button className="btn btn-primary btn-large" onClick={() => onSelect(laps)}>
          Race!
        </button>
        <button className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
