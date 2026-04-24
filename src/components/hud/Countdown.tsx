import { memo } from 'react';

interface CountdownProps {
  value: number;
}

function CountdownInner({ value }: CountdownProps) {
  const text = value > 0 ? String(value) : value === 0 ? 'GO!' : '';
  if (!text) return null;

  return (
    <div className="countdown-overlay">
      <div className={`countdown-text ${value === 0 ? 'countdown-go' : ''}`}>
        {text}
      </div>
    </div>
  );
}

export const Countdown = memo(CountdownInner);
