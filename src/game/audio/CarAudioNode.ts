import type { EngineNodes, SkidNodes, BoostNodes, TurbineNodes, BoostTrackNodes } from './SoundSynthesizer.js';

export interface CarAudioNode {
  carId: string;
  pannerNode: PannerNode;
  engineNodes: EngineNodes;
  skidNodes: SkidNodes | null;
  skidVolumeCurrent: number;
  cullGain: GainNode;
  cullGainCurrent: number;
  isVisible: boolean;
  boostNodes: BoostNodes | null;
  boostVolumeCurrent: number;
  turbineNodes: TurbineNodes | null;
  boostTrackNodes: BoostTrackNodes | null;
}
