import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Stack, Title, Text } from '@mantine/core';
import { MenuMusicPlayer } from '../../game/audio/MenuMusicPlayer.js';
import { loadAudioPrefs, saveAudioPrefs } from '../../game/audio/AudioPrefs.js';
import { VolumeControls } from '../hud/VolumeControls.js';

interface MainMenuProps {
  onStart: () => void;
  onVersus?: () => void;
  onPractice?: () => void;
  onBackToEditor?: () => void;
}

export function MainMenu({ onStart, onVersus, onPractice, onBackToEditor }: MainMenuProps) {
  const navigate = useNavigate();
  const playerRef = useRef<MenuMusicPlayer | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => loadAudioPrefs());

  useEffect(() => {
    const player = new MenuMusicPlayer();
    playerRef.current = player;
    player.play();
    return () => { player.dispose(); playerRef.current = null; };
  }, []);

  const handleMasterChange = (v: number) => {
    setPrefs(p => ({ ...p, masterVolume: v }));
    saveAudioPrefs({ masterVolume: v });
  };

  const handleMusicChange = (v: number) => {
    setPrefs(p => ({ ...p, musicVolume: v }));
    saveAudioPrefs({ musicVolume: v });
    playerRef.current?.setMusicVolume(v);
  };

  return (
    <div className="screen main-menu">
      <div className="menu-content">
        <Title order={1} className="game-title">Kitchen Grand Prix</Title>
        <Text className="game-subtitle">Tiny cars, big thrills, one kitchen table.</Text>
        <Stack gap="sm" mt="md" align="center">
          <Button size="lg" color="yellow" onClick={onStart}>
            Start Race
          </Button>
          {onVersus && (
            <Button color="yellow" onClick={onVersus}>
              Local Versus
            </Button>
          )}
          {onPractice && (
            <Button variant="default" onClick={onPractice}>
              Practice Map
            </Button>
          )}
          <Button variant="default" onClick={onBackToEditor ?? (() => navigate('/track-editor'))}>
            {onBackToEditor ? '← Back to Editor' : 'Track Editor'}
          </Button>
          <Button variant="default" onClick={() => setOptionsOpen(o => !o)}>
            {optionsOpen ? 'Hide Options' : 'Options'}
          </Button>
          {optionsOpen && (
            <VolumeControls
              masterVolume={prefs.masterVolume}
              musicVolume={prefs.musicVolume}
              onMasterChange={handleMasterChange}
              onMusicChange={handleMusicChange}
            />
          )}
        </Stack>
      </div>
      <div className="menu-cars">
        <div className="car-silhouette" />
        <div className="car-silhouette delay-1" />
        <div className="car-silhouette delay-2" />
      </div>
    </div>
  );
}
