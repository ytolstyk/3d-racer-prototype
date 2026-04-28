import { useState, useEffect, useRef } from 'react';
import type { RandomizerCardDef } from '../../constants/randomizer.js';
import { pickRandomCards } from '../../constants/randomizer.js';
import { playCardSlam } from '../../game/audio/SoundSynthesizer.js';
import { loadAudioPrefs } from '../../game/audio/AudioPrefs.js';

interface RandomizerSelectProps {
  onSelect: (card: RandomizerCardDef) => void;
  onSkip: () => void;
}

type AnimState = 'dealing' | 'idle' | 'centering' | 'flipping' | 'revealed';

const CARD_WIDTH  = 200;
const CARD_HEIGHT = 280;
const CARD_GAP    = 32;

// translateX to move each card index to the visual centre of the 3-card row
const CENTER_OFFSETS = [CARD_WIDTH + CARD_GAP, 0, -(CARD_WIDTH + CARD_GAP)];
const DEAL_ROTS      = ['-14deg', '3deg', '-9deg'];

interface SmokeParticle { id: number; dx: number; dy: number; }
interface SparkParticle { id: number; dx: number; dy: number; rot: number; len: number; }

export function RandomizerSelect({ onSelect, onSkip }: RandomizerSelectProps) {
  const [cards]       = useState<RandomizerCardDef[]>(() => pickRandomCards(3));
  const [animState, setAnimState] = useState<AnimState>('dealing');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  // Once the flip animation finishes we keep a static transform so removing the
  // animation CSS property doesn't snap the card back to its default state.
  const [cardFlipped, setCardFlipped] = useState(false);
  const [showSmoke, setShowSmoke]       = useState(false);
  const [showSparks, setShowSparks]     = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);
  const [shaking, setShaking]           = useState(false);
  const busyRef  = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 16 smoke puffs spread in a full circle
  const [smokeParticles] = useState<SmokeParticle[]>(() =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist  = 90 + Math.random() * 110;
      return { id: i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
    }));

  // 22 sharp sparks radiating outward
  const [sparkParticles] = useState<SparkParticle[]>(() =>
    Array.from({ length: 22 }, (_, i) => {
      const angle = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist  = 130 + Math.random() * 170;
      return {
        id:  i,
        dx:  Math.cos(angle) * dist,
        dy:  Math.sin(angle) * dist,
        rot: Math.atan2(Math.sin(angle), Math.cos(angle)) * (180 / Math.PI),
        len: 10 + Math.random() * 14,
      };
    }));

  // dealing → idle once all cards have landed
  useEffect(() => {
    if (animState !== 'dealing') return;
    // last card: delay 320ms + duration 480ms → done ≈ 800ms; add buffer
    const t = setTimeout(() => setAnimState('idle'), 950);
    return () => clearTimeout(t);
  }, [animState]);

  const handleCardClick = (idx: number) => {
    if (animState !== 'idle' || busyRef.current) return;
    busyRef.current = true;
    setSelectedIdx(idx);
    setAnimState('centering');

    // t=0    centering CSS transition starts (400 ms)
    // t=400  liftFlipSlam animation starts (1 000 ms total)
    //          ↳ 0–12 %  = lift up
    //          ↳ 12–68 % = rotateY 0 → 180
    //          ↳ 68–78 % = slam down
    //          ↳ 78–90 % = bounce overshoot
    //          ↳ 90–100 % = settle
    // t=1100 smoke burst (just before slam impact ≈ t=1080)
    // t=1180 screen shake
    // t=1400 animation done → freeze transform
    // t=1500 → revealed
    setTimeout(() => setAnimState('flipping'),                         400);
    setTimeout(() => {
      setShowShockwave(true);
      setShowSparks(true);
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        const prefs = loadAudioPrefs();
        const masterGain = ctx.createGain();
        masterGain.gain.value = prefs.masterVolume;
        masterGain.connect(ctx.destination);
        playCardSlam(ctx, masterGain);
      } catch { /* audio not available */ }
    }, 1075);
    setTimeout(() => setShowSmoke(true),                               1100);
    setTimeout(() => setShaking(true),                                 1180);
    setTimeout(() => setShowShockwave(false),                          1600);
    setTimeout(() => setShowSparks(false),                             1700);
    setTimeout(() => setCardFlipped(true),                             1400);
    setTimeout(() => { setAnimState('revealed'); busyRef.current = false; }, 1500);
    setTimeout(() => setShaking(false),                                1580);
    setTimeout(() => setShowSmoke(false),                              1850);
  };

  const handleRevealedClick = () => {
    if (animState === 'revealed' && selectedIdx !== null) onSelect(cards[selectedIdx]);
  };

  return (
    <div
      style={{
        ...containerStyle,
        animation: shaking ? 'screenShake 0.4s ease-out' : undefined,
      }}
    >
      <style>{cssAnimations}</style>

      <div style={titleStyle}>Pick a card</div>
      <div style={subtitleStyle}>Choose one to reveal your race modifier</div>

      <div style={cardRowStyle}>
        {cards.map((card, idx) => {
          const isSelected = selectedIdx === idx;
          const isOther    = selectedIdx !== null && !isSelected;

          let outerTransform = '';
          let opacity = 1;
          if (animState === 'centering' || animState === 'flipping' || animState === 'revealed') {
            if (isOther)      { outerTransform = 'translateY(140%) scale(0.85)'; opacity = 0; }
            else if (isSelected) { outerTransform = `translateX(${CENTER_OFFSETS[idx]}px)`; }
          }

          const cursor =
            animState === 'idle' ? 'pointer'
            : (animState === 'revealed' && isSelected ? 'pointer' : 'default');

          // Flip container: animated while flipping, frozen via static transform after
          const flipAnimation =
            isSelected && animState === 'flipping' && !cardFlipped
              ? 'liftFlipSlam 1.0s cubic-bezier(0.4, 0, 0.2, 1) forwards'
              : undefined;
          const flipTransform =
            isSelected && cardFlipped ? 'scale(1.1) rotateY(180deg)' : undefined;

          return (
            <div
              key={card.id}
              style={{
                position: 'relative',
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                flexShrink: 0,
                transform: outerTransform,
                opacity,
                transition: animState === 'dealing'
                  ? undefined
                  : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease',
                animation: animState === 'dealing'
                  ? `dealIn 0.48s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 160}ms both`
                  : undefined,
                cursor,
                '--deal-rot': DEAL_ROTS[idx],
              } as React.CSSProperties}
              onClick={
                animState === 'idle'     ? () => handleCardClick(idx)
                : (animState === 'revealed' && isSelected ? handleRevealedClick : undefined)
              }
            >
              {/* ── Shockwave ring ── */}
              {showShockwave && isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(50% - 10px)',
                    left: 'calc(50% - 10px)',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: '3px solid rgba(255,210,63,0.9)',
                    pointerEvents: 'none',
                    animation: 'shockwaveExpand 0.5s ease-out forwards',
                  }}
                />
              )}

              {/* ── Sparks ── */}
              {showSparks && isSelected && sparkParticles.map(p => (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: p.len,
                    height: 3,
                    marginTop: -1.5,
                    marginLeft: -(p.len / 2),
                    borderRadius: 2,
                    background: `linear-gradient(90deg, rgba(255,255,200,0.95), rgba(255,180,0,0.6))`,
                    pointerEvents: 'none',
                    boxShadow: '0 0 6px rgba(255,220,80,0.8)',
                    animation: `sparkShoot 0.45s ease-out ${p.id * 18}ms forwards`,
                    '--dx': `${p.dx}px`,
                    '--dy': `${p.dy}px`,
                    '--rot': `${p.rot}deg`,
                  } as unknown as React.CSSProperties}
                />
              ))}

              {/* ── Smoke ── rendered after sparks so it sits on top */}
              {showSmoke && isSelected && smokeParticles.map(p => (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,220,80,0.85) 0%, rgba(255,140,0,0.4) 55%, transparent 100%)',
                    pointerEvents: 'none',
                    animation: `smokePuff 0.8s ease-out ${p.id * 25}ms forwards`,
                    '--dx': `${p.dx}px`,
                    '--dy': `${p.dy}px`,
                  } as unknown as React.CSSProperties}
                />
              ))}

              {/* ── Card face (rendered after smoke → appears on top) ── */}
              <div style={perspectiveWrapStyle}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transformStyle: 'preserve-3d',
                    animation: flipAnimation,
                    transform: flipTransform,
                  }}
                >
                  {/* Back face */}
                  <div style={{ ...cardFaceStyle, ...cardBackStyle, backfaceVisibility: 'hidden' }}>
                    <div style={cardBackPatternStyle} />
                    <div style={cardBackLabelStyle}>?</div>
                  </div>

                  {/* Front face — pre-rotated so it's hidden until container flips past 90° */}
                  <div
                    style={{
                      ...cardFaceStyle,
                      ...cardFrontStyle,
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div style={cardLabelStyle}>{card.label}</div>
                    <div style={cardDescStyle}>{card.description}</div>
                    <div style={mutationBadgesStyle}>
                      {card.mutations.map((m, mi) => (
                        <div key={mi} style={mutationBadgeStyle}>
                          {m.target} ×{m.multiplier.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Always in DOM so layout doesn't jump */}
      <button
        style={{
          ...raceButtonStyle,
          opacity: animState === 'revealed' ? 1 : 0,
          pointerEvents: animState === 'revealed' ? 'auto' : 'none',
          animation: animState === 'revealed' ? 'hintPulse 1.2s ease-in-out infinite' : undefined,
          transition: 'opacity 0.3s ease',
        }}
        onClick={handleRevealedClick}
      >
        Race!
      </button>

      <button
        style={{
          ...skipButtonStyle,
          opacity: animState === 'idle' ? 1 : 0,
          pointerEvents: animState === 'idle' ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        onClick={onSkip}
      >
        Skip
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d1a 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 32,
};

const titleStyle: React.CSSProperties = {
  color: '#ffd23f',
  fontSize: 42,
  fontWeight: 800,
  letterSpacing: 3,
  textTransform: 'uppercase',
  textShadow: '0 0 30px rgba(255,210,63,0.5)',
};

const subtitleStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: 16,
  letterSpacing: 1,
  marginTop: -20,
};

const cardRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: CARD_GAP,
  alignItems: 'center',
};

// Provides the perspective projection for child 3D transforms
const perspectiveWrapStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  perspective: '1200px',
};

const cardFaceStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 16,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px 16px',
  boxSizing: 'border-box',
};

const cardBackStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1e3a5f 0%, #0d2035 100%)',
  border: '2px solid rgba(255,210,63,0.4)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
};

const cardFrontStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2a1a0e 0%, #1a0e06 100%)',
  border: '2px solid rgba(255,210,63,0.7)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(255,210,63,0.2)',
  gap: 12,
};

const cardBackPatternStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 12,
  borderRadius: 10,
  background: `repeating-linear-gradient(
    45deg,
    rgba(255,210,63,0.06) 0px, rgba(255,210,63,0.06) 2px,
    transparent 2px, transparent 12px
  )`,
};

const cardBackLabelStyle: React.CSSProperties = {
  fontSize: 72,
  fontWeight: 900,
  color: 'rgba(255,210,63,0.3)',
  position: 'relative',
  zIndex: 1,
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: '#ffd23f',
  textAlign: 'center',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

const cardDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,248,236,0.85)',
  textAlign: 'center',
  lineHeight: 1.4,
};

const mutationBadgesStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  width: '100%',
  marginTop: 8,
};

const mutationBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,210,63,0.7)',
  background: 'rgba(255,210,63,0.08)',
  border: '1px solid rgba(255,210,63,0.2)',
  borderRadius: 4,
  padding: '2px 6px',
  textAlign: 'center',
  letterSpacing: 0.5,
};


const raceButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ffd23f 0%, #ffaa00 100%)',
  border: 'none',
  color: '#1a1a2e',
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: 3,
  padding: '14px 48px',
  borderRadius: 10,
  cursor: 'pointer',
  textTransform: 'uppercase',
  boxShadow: '0 4px 24px rgba(255,210,63,0.4)',
};

const skipButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 14,
  letterSpacing: 2,
  padding: '8px 24px',
  borderRadius: 8,
  cursor: 'pointer',
  textTransform: 'uppercase',
};

// ── CSS Animations ────────────────────────────────────────────────────────────

const cssAnimations = `
/* Cards fly in from above, each with a slight rotation */
@keyframes dealIn {
  from {
    transform: translateY(-85vh) rotate(var(--deal-rot, 0deg));
    opacity: 0;
  }
  40% { opacity: 1; }
  to  { transform: translateY(0) rotate(0deg); opacity: 1; }
}

/* Full-3D lift → flip → slam sequence on a single container element */
@keyframes liftFlipSlam {
  0%   { transform: scale(1.08) rotateY(0deg); }
  12%  { transform: scale(1.45) rotateY(0deg) translateZ(90px); }   /* lifted */
  68%  { transform: scale(1.45) rotateY(180deg) translateZ(90px); } /* flipped */
  78%  { transform: scale(1.1)  rotateY(180deg) translateZ(0) translateY(-14px); } /* slam start */
  90%  { transform: scale(1.1)  rotateY(180deg) translateY(7px);  } /* bounce */
  100% { transform: scale(1.1)  rotateY(180deg) translateY(0);    } /* rest */
}

/* Whole-screen shake at slam impact */
@keyframes screenShake {
  0%   { transform: translate(0,    0   ); }
  10%  { transform: translate(-9px, -4px); }
  22%  { transform: translate( 8px,  4px); }
  34%  { transform: translate(-6px,  2px); }
  46%  { transform: translate( 5px, -3px); }
  58%  { transform: translate(-3px, -1px); }
  70%  { transform: translate( 2px,  1px); }
  82%  { transform: translate(-1px,  0  ); }
  100% { transform: translate( 0,    0  ); }
}

/* Smoke puffs outward in all directions from card centre */
@keyframes smokePuff {
  0%   { transform: translate(-50%, -50%) translate(0, 0) scale(0.2); opacity: 0.95; }
  100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(3.2); opacity: 0; }
}

/* Sharp sparks shoot outward from card centre */
@keyframes sparkShoot {
  0%   { transform: translate(-50%, -50%) translate(0, 0) rotate(var(--rot)) scaleX(0.3); opacity: 1; }
  60%  { opacity: 0.9; }
  100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) rotate(var(--rot)) scaleX(1); opacity: 0; }
}

/* Expanding shockwave ring at impact */
@keyframes shockwaveExpand {
  0%   { transform: scale(1);  opacity: 0.9; }
  100% { transform: scale(14); opacity: 0; }
}

@keyframes hintPulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1;   }
}
`;
