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
} as const;
