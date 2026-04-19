import { Button, Group, Table, Title } from '@mantine/core';
import type { RaceResult } from '../../types/game.js';

interface ScoreboardProps {
  results: RaceResult[];
  raceFinished: boolean;
  onMainMenu: () => void;
  onRaceAgain: () => void;
  onBackToEditor?: () => void;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '--:--.---';
  const totalSec = ms / 1000;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

export function Scoreboard({ results, raceFinished, onMainMenu, onRaceAgain, onBackToEditor }: ScoreboardProps) {
  return (
    <div className="scoreboard-overlay">
      <div className="scoreboard">
        <Title order={2}>{raceFinished ? 'Final Results' : 'Race In Progress...'}</Title>
        <Table className="results-table" mt="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pos</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Total Time</Table.Th>
              <Table.Th>Best Lap</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {results.map((r) => (
              <Table.Tr key={r.carId} className={r.isPlayer ? 'player-row' : ''}>
                <Table.Td className="pos-cell">{r.totalTime > 0 ? r.position : '-'}</Table.Td>
                <Table.Td className="name-cell">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: `#${r.color.toString(16).padStart(6, '0')}` }}
                  />
                  {r.name}
                  {r.isPlayer && <span className="you-badge">YOU</span>}
                </Table.Td>
                <Table.Td>{formatTime(r.totalTime)}</Table.Td>
                <Table.Td>{formatTime(r.bestLap)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Group gap="sm" mt="md" className="scoreboard-actions">
          <Button color="yellow" onClick={onRaceAgain}>Race Again</Button>
          <Button variant="default" onClick={onMainMenu}>Main Menu</Button>
          {onBackToEditor && (
            <Button variant="default" onClick={onBackToEditor}>← Back to Editor</Button>
          )}
        </Group>
      </div>
    </div>
  );
}
