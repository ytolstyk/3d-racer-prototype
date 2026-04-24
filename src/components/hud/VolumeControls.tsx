import { Slider, Text, Stack, Group, Box } from '@mantine/core';

interface VolumeControlsProps {
  masterVolume: number;
  musicVolume: number;
  onMasterChange: (v: number) => void;
  onMusicChange: (v: number) => void;
}

const containerStyle = {
  background: 'rgba(0,0,0,0.5)',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  minWidth: 240,
};

const labelStyle = { width: 100, flexShrink: 0 };

export function VolumeControls({ masterVolume, musicVolume, onMasterChange, onMusicChange }: VolumeControlsProps) {
  return (
    <Stack
      gap="xs"
      p="sm"
      style={containerStyle}
    >
      <Group gap="md" align="center" wrap="nowrap">
        <Text size="sm" c="dimmed" style={labelStyle}>Master Volume</Text>
        <Box style={{ flex: 1 }}>
          <Slider min={0} max={1} step={0.01} value={masterVolume} onChange={onMasterChange} color="yellow" />
        </Box>
      </Group>
      <Group gap="md" align="center" wrap="nowrap">
        <Text size="sm" c="dimmed" style={labelStyle}>Music Volume</Text>
        <Box style={{ flex: 1 }}>
          <Slider min={0} max={1} step={0.01} value={musicVolume} onChange={onMusicChange} color="yellow" />
        </Box>
      </Group>
      <Text size="xs" ta="center" c="dimmed">
        WASD / Arrows = steer &nbsp; Space = handbrake &nbsp; Shift = brake
      </Text>
    </Stack>
  );
}
