interface VolumeControlsProps {
  masterVolume: number;
  musicVolume: number;
  onMasterChange: (v: number) => void;
  onMusicChange: (v: number) => void;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '12px 16px',
  background: 'rgba(0,0,0,0.5)',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  minWidth: 240,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  color: '#ccc',
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  width: 100,
  flexShrink: 0,
};

const controlsHintStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: 11,
  marginTop: 4,
  textAlign: 'center',
};

export function VolumeControls({ masterVolume, musicVolume, onMasterChange, onMusicChange }: VolumeControlsProps) {
  return (
    <div style={containerStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>Master Volume</span>
        <input
          type="range" min={0} max={1} step={0.01}
          value={masterVolume}
          onChange={e => onMasterChange(parseFloat(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Music Volume</span>
        <input
          type="range" min={0} max={1} step={0.01}
          value={musicVolume}
          onChange={e => onMusicChange(parseFloat(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>
      <div style={controlsHintStyle}>
        WASD / Arrows = steer &nbsp; Space = handbrake &nbsp; Shift = brake
      </div>
    </div>
  );
}
