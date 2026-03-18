interface MainMenuProps {
  onStart: () => void;
}

export function MainMenu({ onStart }: MainMenuProps) {
  return (
    <div className="screen main-menu">
      <div className="menu-content">
        <h1 className="game-title">Kitchen Grand Prix</h1>
        <p className="game-subtitle">Tiny cars, big thrills, one kitchen table.</p>
        <button className="btn btn-primary btn-large" onClick={onStart}>
          Start Race
        </button>
      </div>
      <div className="menu-cars">
        <div className="car-silhouette" />
        <div className="car-silhouette delay-1" />
        <div className="car-silhouette delay-2" />
      </div>
    </div>
  );
}
