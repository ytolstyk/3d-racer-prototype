import { CAR_DEFINITIONS } from '../../constants/cars.js';

interface CarSelectProps {
  onSelect: (carId: string) => void;
  onBack: () => void;
}

function StatBar({ label, value }: { label: string; value: number }) {
  const maxVal = label === 'handling' ? 1 : 50;
  const pct = (value / maxVal) * 100;
  return (
    <div className="stat-bar">
      <span className="stat-label">{label}</span>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CarSelect({ onSelect, onBack }: CarSelectProps) {
  return (
    <div className="screen car-select">
      <h2>Choose Your Car</h2>
      <div className="car-grid">
        {CAR_DEFINITIONS.map((car) => (
          <button
            key={car.id}
            className="car-card"
            onClick={() => onSelect(car.id)}
          >
            <div
              className="car-preview"
              style={{ backgroundColor: `#${car.color.toString(16).padStart(6, '0')}` }}
            >
              <div className="car-icon" />
            </div>
            <div className="car-info">
              <h3>{car.name}</h3>
              <StatBar label="speed" value={car.maxSpeed} />
              <StatBar label="accel" value={car.acceleration} />
              <StatBar label="handling" value={car.handling} />
              <StatBar label="braking" value={car.braking} />
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
