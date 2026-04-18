export const AUDIO_SYNTH = {
  engineBaseFreq: 55, engineMaxFreq: 220,
  engineDetuneSpread: 8, engineGainBase: 0.18,
  engineFilterFreqIdle: 400, engineFilterFreqMax: 2200,
  skidFilterFreq: 1800, skidFilterQ: 1.4,
  skidMaxGain: 0.55, skidFadeInRate: 0.10, skidFadeOutRate: 0.05,
  collisionDecayMin: 0.10, collisionDecayMax: 0.30,
  collisionNoiseGain: 0.9, collisionThudFreq: 60, collisionThudGain: 0.5,
  splashDurationMin: 0.20, splashDurationMax: 0.40,
  splashFreqMin: 600, splashFreqMax: 2400, splashGain: 0.6,
  pannerRefDistance: 20, pannerMaxDistance: 250, pannerRolloffFactor: 1.8,
  frustumCullMargin: 0.08,
  masterGain: 0.8,

  // Countdown beeps
  countdownBeepFreqs: [330, 370, 440],
  countdownBeepGain: 0.5,
  countdownBeepDuration: 0.12,

  // Engine sputter LFO
  sputterFreqIdle: 4.0,
  sputterDepthMax: 0.06,

  // Max-speed random detune jitter
  maxSpeedJitterThreshold: 0.80,
  maxSpeedJitterCents: 14,

  // Speed strip woosh
  wooshDuration: 0.22,
  wooshGain: 0.55,
  wooshFilterStart: 400, wooshFilterEnd: 4200,

  // Boost turbo hum
  boostHumFreq: 180,
  boostHumGain: 0.28,
  boostHumFilterFreq: 600, boostHumFilterQ: 3.0,
  boostFadeInRate: 0.08, boostFadeOutRate: 0.04,

  // Collision variety ranges
  collisionNoiseFreqMin: 400, collisionNoiseFreqMax: 1200,
  collisionThudFreqMin: 40,  collisionThudFreqMax: 90,
  collisionMetalChance: 0.30,
  collisionMetalFreqMin: 2000, collisionMetalFreqMax: 4000,
};
