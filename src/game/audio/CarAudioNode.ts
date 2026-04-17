import type { EngineNodes, SkidNodes } from './SoundSynthesizer.js';

export interface CarAudioNode {
  carId: string;
  pannerNode: PannerNode;
  engineNodes: EngineNodes;
  skidNodes: SkidNodes | null;
  skidVolumeCurrent: number;
  cullGain: GainNode;
  cullGainCurrent: number;
  isVisible: boolean;
}
