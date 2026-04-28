import type { RandomizerMutation, RandomizerValues } from '../types/game.js';

export interface RandomizerCardDef {
  id: string;
  label: string;
  description: string;
  mutations: RandomizerMutation[];
}

const CARD_POOL: RandomizerCardDef[] = [
  {
    id: 'turbo_fuel',
    label: 'Turbo Fuel',
    description: 'All cars 20% faster',
    mutations: [{ target: 'carSpeed', multiplier: 1.20 }],
  },
  {
    id: 'sticky_tires',
    label: 'Sticky Tires',
    description: 'Handling +25%, cornering loss −20%',
    mutations: [
      { target: 'carHandling', multiplier: 1.25 },
      { target: 'corneringDrag', multiplier: 0.80 },
    ],
  },
  {
    id: 'wet_track',
    label: 'Wet Track',
    description: 'Hazards 30% more punishing',
    mutations: [{ target: 'hazardEffectiveness', multiplier: 1.30 }],
  },
  {
    id: 'sleepy_ai',
    label: 'Sleepy AI',
    description: 'AI reaction doubled, skill −15%',
    mutations: [
      { target: 'aiReaction', multiplier: 2.0 },
      { target: 'aiSkill', multiplier: 0.85 },
    ],
  },
  {
    id: 'rocket_start',
    label: 'Rocket Start',
    description: 'Throttle response 40% quicker',
    mutations: [{ target: 'throttleInertia', multiplier: 0.60 }],
  },
  {
    id: 'banana_oil',
    label: 'Banana Oil',
    description: 'Hazards 30% less effective',
    mutations: [{ target: 'hazardEffectiveness', multiplier: 0.70 }],
  },
  {
    id: 'heavy_load',
    label: 'Heavy Load',
    description: 'Braking +20%, acceleration −15%',
    mutations: [
      { target: 'carBraking', multiplier: 1.20 },
      { target: 'carAccel', multiplier: 0.85 },
    ],
  },
  {
    id: 'nitrous',
    label: 'Nitrous',
    description: 'Acceleration +25%, handling −15%',
    mutations: [
      { target: 'carAccel', multiplier: 1.25 },
      { target: 'carHandling', multiplier: 0.85 },
    ],
  },
  {
    id: 'slippery_track',
    label: 'Slippery Track',
    description: 'Cornering drag +30%',
    mutations: [{ target: 'corneringDrag', multiplier: 1.30 }],
  },
  {
    id: 'pro_ai',
    label: 'Pro AI',
    description: 'AI skill +20%, faster reactions',
    mutations: [
      { target: 'aiSkill', multiplier: 1.20 },
      { target: 'aiReaction', multiplier: 0.70 },
    ],
  },
];

export function pickRandomCards(count = 3): RandomizerCardDef[] {
  const shuffled = [...CARD_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function applyMutations(cards: RandomizerCardDef[]): RandomizerValues {
  const values: RandomizerValues = {
    carSpeedMult: 1.0,
    carAccelMult: 1.0,
    carHandlingMult: 1.0,
    carBrakingMult: 1.0,
    aiSkillMult: 1.0,
    aiNoiseMult: 1.0,
    aiReactionMult: 1.0,
    aiBrakeSensitivityMult: 1.0,
    throttleInertiaMult: 1.0,
    corneringDragMult: 1.0,
    hazardEffectivenessMult: 1.0,
  };

  for (const card of cards) {
    for (const m of card.mutations) {
      switch (m.target) {
        case 'carSpeed':               values.carSpeedMult               *= m.multiplier; break;
        case 'carAccel':               values.carAccelMult               *= m.multiplier; break;
        case 'carHandling':            values.carHandlingMult            *= m.multiplier; break;
        case 'carBraking':             values.carBrakingMult             *= m.multiplier; break;
        case 'aiSkill':                values.aiSkillMult                *= m.multiplier; break;
        case 'aiNoise':                values.aiNoiseMult                *= m.multiplier; break;
        case 'aiReaction':             values.aiReactionMult             *= m.multiplier; break;
        case 'aiBrakeSensitivity':     values.aiBrakeSensitivityMult     *= m.multiplier; break;
        case 'throttleInertia':        values.throttleInertiaMult        *= m.multiplier; break;
        case 'corneringDrag':          values.corneringDragMult          *= m.multiplier; break;
        case 'hazardEffectiveness':    values.hazardEffectivenessMult    *= m.multiplier; break;
      }
    }
  }

  return values;
}
