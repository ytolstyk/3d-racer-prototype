import { useEffect, useRef, useState } from 'react';
import {
  Button, Stack, Title, Text, Group, Box,
  Slider, Divider, Table,
} from '@mantine/core';
import { MenuMusicPlayer } from '../../game/audio/MenuMusicPlayer.js';
import { loadAudioPrefs, saveAudioPrefs } from '../../game/audio/AudioPrefs.js';
import {
  loadControlsConfig, saveControlsConfig, resetControlsConfig,
  loadSPControlsConfig, saveSPControlsConfig, resetSPControlsConfig,
  DEFAULT_SP_CONTROLS, DEFAULT_VS_CONTROLS, keyCodeLabel,
} from '../../game/ControlsPrefs.js';
import type { ControlsConfig, ActionBindings } from '../../game/ControlsPrefs.js';

interface OptionsScreenProps {
  onBack: () => void;
  musicPlayer?: MenuMusicPlayer | null;
  noMusic?: boolean;
  inGame?: boolean;
}

type ActionKey = keyof ActionBindings;

const ACTION_LABELS: Record<ActionKey, string> = {
  forward: 'Forward',
  backward: 'Backward',
  left: 'Left',
  right: 'Right',
  handbrake: 'Handbrake',
};

const ACTIONS: ActionKey[] = ['forward', 'backward', 'left', 'right', 'handbrake'];

interface RebindTarget {
  mode: 'sp' | 'vs';
  player: 'p1' | 'p2';
  action: ActionKey;
}

export function OptionsScreen({ onBack, musicPlayer, noMusic, inGame }: OptionsScreenProps) {
  const [prefs, setPrefs] = useState(() => loadAudioPrefs());
  const [spControls, setSpControls] = useState<ControlsConfig>(() => loadSPControlsConfig());
  const [controls, setControls] = useState<ControlsConfig>(() => loadControlsConfig());
  const [rebinding, setRebinding] = useState<RebindTarget | null>(null);
  const playerRef = useRef<MenuMusicPlayer | null>(musicPlayer ?? null);

  // If no external player passed and music not suppressed, create one
  useEffect(() => {
    if (!musicPlayer && !noMusic) {
      const player = new MenuMusicPlayer();
      playerRef.current = player;
      player.play();
      return () => { player.dispose(); playerRef.current = null; };
    }
  }, [musicPlayer, noMusic]);

  // Capture key press when rebinding
  useEffect(() => {
    if (!rebinding) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === 'Escape') {
        setRebinding(null);
        return;
      }
      if (rebinding.mode === 'sp') {
        setSpControls(prev => {
          const updated: ControlsConfig = {
            ...prev,
            [rebinding.player]: { ...prev[rebinding.player], [rebinding.action]: e.code },
          };
          saveSPControlsConfig(updated);
          return updated;
        });
      } else {
        setControls(prev => {
          const updated: ControlsConfig = {
            ...prev,
            [rebinding.player]: { ...prev[rebinding.player], [rebinding.action]: e.code },
          };
          saveControlsConfig(updated);
          return updated;
        });
      }
      setRebinding(null);
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [rebinding]);

  const handleMasterChange = (v: number) => {
    setPrefs(p => ({ ...p, masterVolume: v }));
    saveAudioPrefs({ masterVolume: v });
  };

  const handleMusicChange = (v: number) => {
    setPrefs(p => ({ ...p, musicVolume: v }));
    saveAudioPrefs({ musicVolume: v });
    playerRef.current?.setMusicVolume(v);
  };

  const handleResetControls = () => {
    resetSPControlsConfig();
    resetControlsConfig();
    setSpControls(loadSPControlsConfig());
    setControls(loadControlsConfig());
    setRebinding(null);
  };

  const startRebind = (mode: 'sp' | 'vs', player: 'p1' | 'p2', action: ActionKey) => {
    setRebinding({ mode, player, action });
  };

  const isRebinding = (mode: 'sp' | 'vs', player: 'p1' | 'p2', action: ActionKey) =>
    rebinding?.mode === mode && rebinding?.player === player && rebinding?.action === action;

  const renderBindingTable = (mode: 'sp' | 'vs', player: 'p1' | 'p2', label: string) => {
    const cfg = mode === 'sp' ? spControls : controls;
    const defaults = mode === 'sp' ? DEFAULT_SP_CONTROLS : DEFAULT_VS_CONTROLS;
    return (
      <Box>
        <Text fw={600} mb="xs" c="yellow.4">{label}</Text>
        <Table
          style={{
            background: 'rgba(0,0,0,0.35)',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Table.Tbody>
            {ACTIONS.map(action => {
              const current = cfg[player][action];
              const defaultKey = defaults[player][action];
              const isDefault = current === defaultKey;
              const active = isRebinding(mode, player, action);
              return (
                <Table.Tr key={action}>
                  <Table.Td style={{ width: 120, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    {ACTION_LABELS[action]}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant={active ? 'filled' : 'default'}
                      color={active ? 'yellow' : undefined}
                      onClick={() => startRebind(mode, player, action)}
                      style={{ minWidth: 90, fontFamily: 'monospace' }}
                    >
                      {active ? 'Press key…' : keyCodeLabel(current)}
                    </Button>
                  </Table.Td>
                  <Table.Td style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                    {!isDefault && `default: ${keyCodeLabel(defaultKey)}`}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    );
  };

  if (inGame) {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto',
        padding: '32px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <Group justify="space-between" align="center" mb="md">
            <Title order={2} style={{ color: '#fff' }}>Options</Title>
            <Button
              variant="outline"
              color="gray.3"
              onClick={onBack}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
            >← Back</Button>
          </Group>

          <Stack gap="lg" align="stretch" style={{ maxWidth: 480, margin: '0 auto' }}>
            <Box p="md" style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
              <Text fw={600} mb="sm" c="yellow.4">Audio</Text>
              <Stack gap="sm">
                <Group gap="md" align="center" wrap="nowrap">
                  <Text size="sm" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Master Volume</Text>
                  <Box style={{ flex: 1 }}>
                    <Slider min={0} max={1} step={0.01} value={prefs.masterVolume} onChange={handleMasterChange} color="yellow" />
                  </Box>
                </Group>
                <Group gap="md" align="center" wrap="nowrap">
                  <Text size="sm" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Music Volume</Text>
                  <Box style={{ flex: 1 }}>
                    <Slider min={0} max={1} step={0.01} value={prefs.musicVolume} onChange={handleMusicChange} color="yellow" />
                  </Box>
                </Group>
              </Stack>
            </Box>

            <Divider />

            <Box p="md" style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
              <Group justify="space-between" align="center" mb="md">
                <Text fw={600} c="yellow.4">Controls</Text>
                <Button size="xs" variant="subtle" color="red" onClick={handleResetControls}>Reset Defaults</Button>
              </Group>
              <Stack gap="md">
                {renderBindingTable('sp', 'p1', 'Solo')}
                {renderBindingTable('vs', 'p1', 'Player 1 (Versus)')}
                {renderBindingTable('vs', 'p2', 'Player 2 (Versus)')}
              </Stack>
              <Text size="xs" c="dimmed" mt="sm" ta="center">
                Click a key to rebind · Esc to cancel
              </Text>
            </Box>
          </Stack>
        </div>
      </div>
    );
  }

  return (
    <div className="screen main-menu">
      <div className="menu-content" style={{ maxHeight: '90vh', overflowY: 'auto', paddingTop: 24, paddingBottom: 32 }}>
        <Group justify="space-between" align="center" mb="md">
          <Title order={2} style={{ color: '#fff' }}>Options</Title>
          <Button
            variant="outline"
            color="gray.3"
            onClick={onBack}
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
          >← Back</Button>
        </Group>

        <Stack gap="lg" align="stretch" style={{ maxWidth: 480, margin: '0 auto' }}>
          {/* Audio */}
          <Box
            p="md"
            style={{
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Text fw={600} mb="sm" c="yellow.4">Audio</Text>
            <Stack gap="sm">
              <Group gap="md" align="center" wrap="nowrap">
                <Text size="sm" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Master Volume</Text>
                <Box style={{ flex: 1 }}>
                  <Slider min={0} max={1} step={0.01} value={prefs.masterVolume} onChange={handleMasterChange} color="yellow" />
                </Box>
              </Group>
              <Group gap="md" align="center" wrap="nowrap">
                <Text size="sm" c="dimmed" style={{ width: 110, flexShrink: 0 }}>Music Volume</Text>
                <Box style={{ flex: 1 }}>
                  <Slider min={0} max={1} step={0.01} value={prefs.musicVolume} onChange={handleMusicChange} color="yellow" />
                </Box>
              </Group>
            </Stack>
          </Box>

          <Divider />

          {/* Controls */}
          <Box
            p="md"
            style={{
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Group justify="space-between" align="center" mb="md">
              <Text fw={600} c="yellow.4">Controls</Text>
              <Button size="xs" variant="subtle" color="red" onClick={handleResetControls}>
                Reset Defaults
              </Button>
            </Group>
            <Stack gap="md">
              {renderBindingTable('p1', 'Player 1 / Solo')}
              {renderBindingTable('p2', 'Player 2')}
            </Stack>
            <Text size="xs" c="dimmed" mt="sm" ta="center">
              Click a key to rebind · Esc to cancel
            </Text>
          </Box>
        </Stack>
      </div>
    </div>
  );
}
