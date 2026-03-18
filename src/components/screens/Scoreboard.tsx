import type { RaceResult } from '../../types/game.js';

interface ScoreboardProps {
  results: RaceResult[];
  raceFinished: boolean;
  onMainMenu: () => void;
  onRaceAgain: () => void;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '--:--.---';
  const totalSec = ms / 1000;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

export function Scoreboard({ results, raceFinished, onMainMenu, onRaceAgain }: ScoreboardProps) {
  return (
    <div className="scoreboard-overlay">
      <div className="scoreboard">
        <h2>{raceFinished ? 'Final Results' : 'Race In Progress...'}</h2>
        <table className="results-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Name</th>
              <th>Total Time</th>
              <th>Best Lap</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.carId} className={r.isPlayer ? 'player-row' : ''}>
                <td className="pos-cell">{r.totalTime > 0 ? r.position : '-'}</td>
                <td className="name-cell">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: `#${r.color.toString(16).padStart(6, '0')}` }}
                  />
                  {r.name}
                  {r.isPlayer && <span className="you-badge">YOU</span>}
                </td>
                <td>{formatTime(r.totalTime)}</td>
                <td>{formatTime(r.bestLap)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="scoreboard-actions">
          <button className="btn btn-primary" onClick={onRaceAgain}>
            Race Again
          </button>
          <button className="btn btn-secondary" onClick={onMainMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
