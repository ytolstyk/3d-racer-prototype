import { AUDIO_SYNTH } from '../../constants/audio.js';

export interface EngineNodes {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc3: OscillatorNode;
  oscBuzz: OscillatorNode;
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  baseFreq: number;
}

export interface SkidNodes {
  source: AudioBufferSourceNode;
  filterNode: BiquadFilterNode;
  gainNode: GainNode;
}

export function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function createEngineNodes(
  ctx: AudioContext,
  destination: AudioNode,
  idleJitter = 0,
): EngineNodes {
  const S = AUDIO_SYNTH;
  const baseFreq = S.engineBaseFreq * (0.97 + idleJitter * 0.06);

  const filterNode = ctx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = S.engineFilterFreqIdle;
  filterNode.Q.value = 1.0;
  filterNode.connect(destination);

  const gainNode = ctx.createGain();
  gainNode.gain.value = S.engineGainBase;
  gainNode.connect(filterNode);

  const osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = baseFreq;
  osc1.detune.value = -S.engineDetuneSpread;
  osc1.connect(gainNode);
  osc1.start();

  const osc2 = ctx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.value = baseFreq;
  osc2.detune.value = 0;
  osc2.connect(gainNode);
  osc2.start();

  const osc3 = ctx.createOscillator();
  osc3.type = 'sawtooth';
  osc3.frequency.value = baseFreq;
  osc3.detune.value = S.engineDetuneSpread;
  osc3.connect(gainNode);
  osc3.start();

  const oscBuzz = ctx.createOscillator();
  oscBuzz.type = 'square';
  oscBuzz.frequency.value = baseFreq * 2;

  const buzzGain = ctx.createGain();
  buzzGain.gain.value = S.engineGainBase * 0.15;
  oscBuzz.connect(buzzGain);
  buzzGain.connect(filterNode);
  oscBuzz.start();

  return { osc1, osc2, osc3, oscBuzz, gainNode, filterNode, baseFreq };
}

export function updateEngineFreq(nodes: EngineNodes, speedRatio: number, ctx: AudioContext): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const timeConst = 0.05;

  const freq = nodes.baseFreq + speedRatio * (S.engineMaxFreq - nodes.baseFreq);
  nodes.osc1.frequency.setTargetAtTime(freq, t, timeConst);
  nodes.osc2.frequency.setTargetAtTime(freq, t, timeConst);
  nodes.osc3.frequency.setTargetAtTime(freq, t, timeConst);
  nodes.oscBuzz.frequency.setTargetAtTime(freq * 2, t, timeConst);

  const filterFreq = S.engineFilterFreqIdle + speedRatio * (S.engineFilterFreqMax - S.engineFilterFreqIdle);
  nodes.filterNode.frequency.setTargetAtTime(filterFreq, t, timeConst);
}

export function stopEngineNodes(nodes: EngineNodes): void {
  try { nodes.osc1.stop(); } catch { /* already stopped */ }
  try { nodes.osc2.stop(); } catch { /* already stopped */ }
  try { nodes.osc3.stop(); } catch { /* already stopped */ }
  try { nodes.oscBuzz.stop(); } catch { /* already stopped */ }
  nodes.osc1.disconnect();
  nodes.osc2.disconnect();
  nodes.osc3.disconnect();
  nodes.oscBuzz.disconnect();
  nodes.gainNode.disconnect();
  nodes.filterNode.disconnect();
}

export function createSkidNodes(
  ctx: AudioContext,
  noiseBuffer: AudioBuffer,
  destination: AudioNode,
): SkidNodes {
  const S = AUDIO_SYNTH;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(destination);

  const filterNode = ctx.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.frequency.value = S.skidFilterFreq;
  filterNode.Q.value = S.skidFilterQ;
  filterNode.connect(gainNode);

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  source.connect(filterNode);
  source.start();

  return { source, filterNode, gainNode };
}

export function stopSkidNodes(nodes: SkidNodes): void {
  try { nodes.source.stop(); } catch { /* already stopped */ }
  nodes.source.disconnect();
  nodes.filterNode.disconnect();
  nodes.gainNode.disconnect();
}

export function playCollision(
  ctx: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
  distanceFactor: number,
): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const vol = Math.max(0, distanceFactor);
  const decay = S.collisionDecayMin + Math.random() * (S.collisionDecayMax - S.collisionDecayMin);

  // Noise burst
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(S.collisionNoiseGain * vol, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  noiseGain.connect(destination);

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 800;
  noiseFilter.Q.value = 1.0;
  noiseFilter.connect(noiseGain);

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.connect(noiseFilter);
  noiseSrc.start(t);
  noiseSrc.stop(t + decay + 0.05);

  // Thud
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(S.collisionThudGain * vol, t);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.6);
  thudGain.connect(destination);

  const thudOsc = ctx.createOscillator();
  thudOsc.type = 'sine';
  thudOsc.frequency.value = S.collisionThudFreq;
  thudOsc.connect(thudGain);
  thudOsc.start(t);
  thudOsc.stop(t + decay * 0.6 + 0.05);
}

export function playSplash(
  ctx: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const duration = S.splashDurationMin + Math.random() * (S.splashDurationMax - S.splashDurationMin);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(S.splashGain, t);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  gainNode.connect(destination);

  const filterNode = ctx.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.Q.value = 8;
  filterNode.frequency.setValueAtTime(S.splashFreqMin, t);
  filterNode.frequency.linearRampToValueAtTime(S.splashFreqMax, t + duration);
  filterNode.connect(gainNode);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.connect(filterNode);
  src.start(t);
  src.stop(t + duration + 0.05);
}
