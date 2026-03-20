import { useNavigate } from 'react-router-dom';

interface MainMenuProps {
  onStart: () => void;
  onBackToEditor?: () => void;
}

export function MainMenu({ onStart, onBackToEditor }: MainMenuProps) {
  const navigate = useNavigate();
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
        <div style={{ marginTop: '1rem' }}>
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
