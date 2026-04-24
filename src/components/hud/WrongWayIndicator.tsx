import { memo, useEffect } from 'react';

const STYLE_ID = 'wrong-way-indicator-styles';

const wrongWayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '15%',
  left: '50%',
  transform: 'translateX(-50%)',
  color: '#ff2020',
  fontWeight: 'bold',
  fontSize: '2.8rem',
  fontFamily: 'monospace',
  letterSpacing: '0.12em',
  textShadow: '0 0 12px rgba(255,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)',
  animation: 'wrongWayPulse 0.7s ease-in-out infinite',
  userSelect: 'none',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};

function WrongWayIndicatorInner({ visible }: { visible: boolean }) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes wrongWayPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.25; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  if (!visible) return null;

  return (
    <div style={wrongWayStyle}>
      WRONG WAY
    </div>
  );
}

export const WrongWayIndicator = memo(WrongWayIndicatorInner);
