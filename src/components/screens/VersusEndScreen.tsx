import { Button, Group, Stack, Table, Title } from '@mantine/core';
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
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <Stack align="center" gap="lg">
        <Title order={2} style={{ color: winnerColor }}>
          {winnerName} wins!
        </Title>

        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 32px', minWidth: 360 }}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th c="dimmed">Stat</Table.Th>
                <Table.Th ta="right" style={{ color: toHex(p1Color) }}>{p1Name}</Table.Th>
                <Table.Th ta="right" style={{ color: toHex(p2Color) }}>{p2Name}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td c="dimmed">Top Speed</Table.Td>
                <Table.Td ta="right">{fmtSpeed(stats.p1TopSpeed)}</Table.Td>
                <Table.Td ta="right">{fmtSpeed(stats.p2TopSpeed)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td c="dimmed">Total Drift</Table.Td>
                <Table.Td ta="right">{fmtDrift(stats.p1TotalDrift)}</Table.Td>
                <Table.Td ta="right">{fmtDrift(stats.p2TotalDrift)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td c="dimmed">Time in Lead</Table.Td>
                <Table.Td ta="right">{fmtTime(stats.p1TimeInLead)}</Table.Td>
                <Table.Td ta="right">{fmtTime(stats.p2TimeInLead)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td c="dimmed">Closest Gap</Table.Td>
                <Table.Td ta="right" colSpan={2}>{fmtGap(stats.closestGap)}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </div>

        <Group gap="sm">
          <Button color="yellow" onClick={onPlayAgain}>Play Again</Button>
          <Button variant="default" onClick={onMainMenu}>Main Menu</Button>
        </Group>
      </Stack>
    </div>
  );
}
