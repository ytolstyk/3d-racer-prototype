import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuMusicPlayer } from '../../game/audio/MenuMusicPlayer.js';

interface MainMenuProps {
  onStart: () => void;
  onVersus?: () => void;
  onPractice?: () => void;
  onBackToEditor?: () => void;
}

export function MainMenu({ onStart, onVersus, onPractice, onBackToEditor }: MainMenuProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const player = new MenuMusicPlayer();
    player.play();
    return () => { player.dispose(); };
  }, []);

  return (
    <div className="screen main-menu">
      <div className="menu-content">
        <h1 className="game-title">Kitchen Grand Prix</h1>
        <p className="game-subtitle">Tiny cars, big thrills, one kitchen table.</p>
        <div>
          <button className="btn btn-primary btn-large" onClick={onStart}>
            Start Race
          </button>
        </div>
        {onVersus && (
          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-primary" onClick={onVersus}>
              Local Versus
            </button>
          </div>
        )}
        {onPractice && (
          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onPractice}>
              Practice Map
            </button>
          </div>
        )}
        <div style={{ marginTop: '0.75rem' }}>
          {onBackToEditor ? (
            <button className="btn btn-secondary" onClick={onBackToEditor}>
              ← Back to Editor
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => navigate('/track-editor')}>
              Track Editor
            </button>
          )}
        </div>
      </div>
      <div className="menu-cars">
        <div className="car-silhouette" />
        <div className="car-silhouette delay-1" />
        <div className="car-silhouette delay-2" />
      </div>
    </div>
  );
}
