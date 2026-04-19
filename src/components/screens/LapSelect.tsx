import { useState } from 'react';
import { Button, Group, Stack, Text, Title } from '@mantine/core';
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
      <Title order={2}>Number of Laps</Title>
      <Stack gap="lg" align="center" mt="md">
        <Group gap="md" align="center">
          <Button
            variant="outline"
            color="gray"
            w={40}
            h={40}
            p={0}
            onClick={() => setLaps((l) => Math.max(1, l - 1))}
            disabled={laps <= 1}
          >
            -
          </Button>
          <Text className="lap-number" size="xl" fw={700}>{laps}</Text>
          <Button
            variant="outline"
            color="gray"
            w={40}
            h={40}
            p={0}
            onClick={() => setLaps((l) => Math.min(10, l + 1))}
            disabled={laps >= 10}
          >
            +
          </Button>
        </Group>

        <Stack gap="xs" align="center">
          <Text className="difficulty-label" size="sm" c="dimmed">Difficulty</Text>
          <Group gap="sm">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <Button
                key={d}
                variant={difficulty === d ? 'filled' : 'outline'}
                color={difficulty === d ? 'yellow' : 'gray'}
                onClick={() => setDifficulty(d)}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Button>
            ))}
          </Group>
        </Stack>

        <Group gap="sm" mt="sm">
          <Button size="lg" color="yellow" onClick={() => onSelect(laps, difficulty)}>
            Race!
          </Button>
          <Button variant="default" onClick={onBack}>
            Back
          </Button>
        </Group>
      </Stack>
    </div>
  );
}
