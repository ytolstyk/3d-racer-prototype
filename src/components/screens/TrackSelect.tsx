import { useRef, useEffect } from 'react';
import { TRACKS } from '../../constants/track.js';
import type { TrackConfig } from '../../constants/track.js';

interface TrackSelectProps {
  onSelect: (trackId: string) => void;
  onBack: () => void;
}

function TrackMinimap({ config }: { config: TrackConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = config.controlPoints;
    const xs = pts.map(p => p[0]);
    const zs = pts.map(p => p[2]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    const padding = 15;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;
    const scale = Math.min(w / rangeX, h / rangeZ);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    for (let i = 0; i <= pts.length; i++) {
      const p = pts[i % pts.length];
      const x = padding + (p[0] - minX) * scale + (w - rangeX * scale) / 2;
      const y = padding + (p[2] - minZ) * scale + (h - rangeZ * scale) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();

    // Start marker
    const start = pts[0];
    const sx = padding + (start[0] - minX) * scale + (w - rangeX * scale) / 2;
    const sy = padding + (start[2] - minZ) * scale + (h - rangeZ * scale) / 2;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [config]);

  return <canvas ref={canvasRef} width={120} height={90} className="track-minimap-canvas" />;
}

export function TrackSelect({ onSelect, onBack }: TrackSelectProps) {
  return (
    <div className="screen track-select">
      <h2>Choose Your Track</h2>
      <div className="track-grid">
        {TRACKS.map((track) => (
          <button
            key={track.id}
            className="track-card"
            onClick={() => onSelect(track.id)}
          >
            <TrackMinimap config={track} />
            <div className="track-info">
              <h3>{track.name}</h3>
              <span className="track-width">Width: {track.width}m</span>
            </div>
          </button>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
