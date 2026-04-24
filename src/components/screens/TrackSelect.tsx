import { memo, useRef, useEffect, useState } from "react";
import { Button, Checkbox, Group, Title } from "@mantine/core";
import { TRACKS } from "../../constants/track.js";
import type { TrackConfig } from "../../constants/track.js";

interface TrackSelectProps {
  onSelect: (trackId: string, reverse?: boolean) => void;
  onBack: () => void;
}

const TrackMinimap = memo(function TrackMinimap({ config }: { config: TrackConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pts = config.controlPoints;
    const xs = pts.map((p) => p[0]);
    const zs = pts.map((p) => p[2]);
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
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
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
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [config]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={90}
      className="track-minimap-canvas"
    />
  );
});

export function TrackSelect({ onSelect, onBack }: TrackSelectProps) {
  const [reverse, setReverse] = useState(false);

  return (
    <div className="screen main-menu">
      <Title order={2}>Choose Your Track</Title>
      <Group justify="center" mb="sm" mt="xs">
        <Checkbox
          checked={reverse}
          onChange={() => setReverse(r => !r)}
          label="Reverse Direction"
          color="yellow"
          fw={700}
        />
      </Group>
      <div className="track-grid">
        {TRACKS.map((track) => (
          <button
            key={track.id}
            className="track-card"
            onClick={() => onSelect(track.id, reverse)}
          >
            <TrackMinimap config={track} />
            <div className="track-info">
              <h3>{track.name}{reverse ? ' (R)' : ''}</h3>
              <span className="track-width">Width: {track.width}m</span>
            </div>
          </button>
        ))}
      </div>
      <Button variant="default" mt="md" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
