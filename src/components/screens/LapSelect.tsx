import { useState } from 'react';
import type { Difficulty } from '../../types/game.js';

interface LapSelectProps {
  onSelect: (laps: number, difficulty: Difficulty) => void;
  onBack: () => void;
}

export function LapSelect({ onSelect, onBack }: LapSelectProps) {
  const [laps, setLaps] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

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
      <div>
        <p className="difficulty-label">Difficulty</p>
        <div className="difficulty-selector">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`btn btn-difficulty${difficulty === d ? ' selected' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="lap-actions">
        <button className="btn btn-primary btn-large" onClick={() => onSelect(laps, difficulty)}>
          Race!
        </button>
        <button className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
