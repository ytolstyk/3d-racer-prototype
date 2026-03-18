interface CountdownProps {
  value: number;
}

export function Countdown({ value }: CountdownProps) {
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
