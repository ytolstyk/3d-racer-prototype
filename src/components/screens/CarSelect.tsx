import { Button, Progress, Text, Title } from '@mantine/core';
import { CAR_DEFINITIONS } from '../../constants/cars.js';
import { CarPreview } from '../shared/CarPreview.js';

interface CarSelectProps {
  onSelect: (carId: string) => void;
  onBack: () => void;
}

function StatBar({ label, value }: { label: string; value: number }) {
  const maxVal = label === 'handling' ? 1 : 50;
  const pct = (value / maxVal) * 100;
  return (
    <div className="stat-bar">
      <Text size="xs" className="stat-label" tt="capitalize">{label}</Text>
      <Progress value={pct} color="yellow" size="sm" style={{ flex: 1 }} />
    </div>
  );
}

export function CarSelect({ onSelect, onBack }: CarSelectProps) {
  return (
    <div className="screen main-menu">
      <Title order={2}>Choose Your Car</Title>
      <div className="car-grid">
        {CAR_DEFINITIONS.map((car) => (
          <button
            key={car.id}
            className="car-card"
            onClick={() => onSelect(car.id)}
          >
            <div className="car-preview">
              <CarPreview car={car} />
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
      <Button variant="default" mt="md" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
