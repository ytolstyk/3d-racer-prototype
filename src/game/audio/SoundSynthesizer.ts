import { AUDIO_SYNTH } from '../../constants/audio.js';

export interface EngineNodes {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc3: OscillatorNode;
  oscBuzz: OscillatorNode;
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  baseFreq: number;
  sputterLFO?: OscillatorNode;
  sputterDepthGain?: GainNode;
}

export interface SkidNodes {
  source: AudioBufferSourceNode;
  filterNode: BiquadFilterNode;
  gainNode: GainNode;
}

export interface BoostNodes {
  osc: OscillatorNode;
  filterNode: BiquadFilterNode;
  gainNode: GainNode;
}

export interface TurbineNodes {
  osc: OscillatorNode;
  filterNode: BiquadFilterNode;
  gainNode: GainNode;
}

export interface BoostTrackNodes {
  osc: OscillatorNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  tremoloGain: GainNode;
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
  gainNode.gain.value = S.engineGainIdle;
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

  // Sputter LFO — AM tremolo that fades out at high speed
  const sputterLFO = ctx.createOscillator();
  sputterLFO.type = 'square';
  sputterLFO.frequency.value = S.sputterFreqIdle;
  const sputterDepthGain = ctx.createGain();
  sputterDepthGain.gain.value = S.sputterDepthMax * S.engineGainIdle;
  sputterLFO.connect(sputterDepthGain);
  sputterDepthGain.connect(gainNode.gain);
  sputterLFO.start();

  return { osc1, osc2, osc3, oscBuzz, gainNode, filterNode, baseFreq, sputterLFO, sputterDepthGain };
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

  // Scale gain: quieter at idle, louder at speed
  const targetGain = S.engineGainIdle + speedRatio * (S.engineGainBase - S.engineGainIdle);
  nodes.gainNode.gain.setTargetAtTime(targetGain, t, timeConst);

  // Random osc2 detune jitter at high speed
  if (speedRatio > S.maxSpeedJitterThreshold) {
    const jitter = (Math.random() * 2 - 1) * S.maxSpeedJitterCents;
    nodes.osc2.detune.setTargetAtTime(jitter, t, 0.12);
  }

  // Sputter depth inversely proportional to speed — prominent at idle, gone by half speed
  const sputterDepth = S.sputterDepthMax * S.engineGainIdle * Math.max(0, 1 - speedRatio * 3);
  if (nodes.sputterDepthGain) {
    nodes.sputterDepthGain.gain.setTargetAtTime(sputterDepth, t, 0.15);
  }
}

export function stopEngineNodes(nodes: EngineNodes): void {
  try { nodes.osc1.stop(); } catch { /* already stopped */ }
  try { nodes.osc2.stop(); } catch { /* already stopped */ }
  try { nodes.osc3.stop(); } catch { /* already stopped */ }
  try { nodes.oscBuzz.stop(); } catch { /* already stopped */ }
  if (nodes.sputterLFO) { try { nodes.sputterLFO.stop(); } catch { /* already stopped */ } }
  nodes.osc1.disconnect();
  nodes.osc2.disconnect();
  nodes.osc3.disconnect();
  nodes.oscBuzz.disconnect();
  nodes.gainNode.disconnect();
  nodes.filterNode.disconnect();
  if (nodes.sputterLFO) nodes.sputterLFO.disconnect();
  if (nodes.sputterDepthGain) nodes.sputterDepthGain.disconnect();
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

  // Noise burst with randomized filter frequency
  const noiseFreq = S.collisionNoiseFreqMin + Math.random() * (S.collisionNoiseFreqMax - S.collisionNoiseFreqMin);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(S.collisionNoiseGain * vol, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  noiseGain.connect(destination);

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = noiseFreq;
  noiseFilter.Q.value = 1.0;
  noiseFilter.connect(noiseGain);

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.connect(noiseFilter);
  noiseSrc.start(t);
  noiseSrc.stop(t + decay + 0.05);

  // Thud with randomized frequency
  const thudFreq = S.collisionThudFreqMin + Math.random() * (S.collisionThudFreqMax - S.collisionThudFreqMin);
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(S.collisionThudGain * vol, t);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.6);
  thudGain.connect(destination);

  const thudOsc = ctx.createOscillator();
  thudOsc.type = 'sine';
  thudOsc.frequency.value = thudFreq;
  thudOsc.connect(thudGain);
  thudOsc.start(t);
  thudOsc.stop(t + decay * 0.6 + 0.05);

  // 30% chance: metallic high-freq overtone
  if (Math.random() < S.collisionMetalChance) {
    const metalFreq = S.collisionMetalFreqMin + Math.random() * (S.collisionMetalFreqMax - S.collisionMetalFreqMin);
    const metalQ = 8 + Math.random() * 12;
    const metalGain = ctx.createGain();
    metalGain.gain.setValueAtTime(S.collisionNoiseGain * vol * 0.5, t);
    metalGain.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.3);
    metalGain.connect(destination);

    const metalFilter = ctx.createBiquadFilter();
    metalFilter.type = 'bandpass';
    metalFilter.frequency.value = metalFreq;
    metalFilter.Q.value = metalQ;
    metalFilter.connect(metalGain);

    const metalSrc = ctx.createBufferSource();
    metalSrc.buffer = noiseBuffer;
    metalSrc.connect(metalFilter);
    metalSrc.start(t);
    metalSrc.stop(t + decay * 0.3 + 0.05);
  }
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

export function playCountdownBeep(ctx: AudioContext, destination: AudioNode, step: number): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const freq = S.countdownBeepFreqs[step] ?? 440;
  const dur = S.countdownBeepDuration;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, t);
  gainNode.gain.linearRampToValueAtTime(S.countdownBeepGain, t + 0.003);
  gainNode.gain.setValueAtTime(S.countdownBeepGain, t + dur - 0.01);
  gainNode.gain.linearRampToValueAtTime(0, t + dur);
  gainNode.connect(destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(gainNode);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

export function playCountdownFanfare(ctx: AudioContext, destination: AudioNode): void {
  const t = ctx.currentTime;
  const freqs = [293.66, 370, 440]; // D4, F#4, A4
  for (const freq of freqs) {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.18, t + 0.005);
    gainNode.gain.setValueAtTime(0.18, t + 0.300);
    gainNode.gain.linearRampToValueAtTime(0, t + 0.700);
    gainNode.connect(destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gainNode);
    osc.start(t);
    osc.stop(t + 0.720);
  }
}

export function playSpeedStripWoosh(
  ctx: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const dur = S.wooshDuration;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(S.wooshGain, t);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  gainNode.connect(destination);

  const filterNode = ctx.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.Q.value = 1.5;
  filterNode.frequency.setValueAtTime(S.wooshFilterStart, t);
  filterNode.frequency.linearRampToValueAtTime(S.wooshFilterEnd, t + dur);
  filterNode.connect(gainNode);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.connect(filterNode);
  src.start(t);
  src.stop(t + dur + 0.05);
}

export function createBoostNodes(ctx: AudioContext, destination: AudioNode): BoostNodes {
  const S = AUDIO_SYNTH;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(destination);

  const filterNode = ctx.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.frequency.value = S.boostHumFilterFreq;
  filterNode.Q.value = S.boostHumFilterQ;
  filterNode.connect(gainNode);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = S.boostHumFreq;
  osc.connect(filterNode);
  osc.start();

  return { osc, filterNode, gainNode };
}

export function stopBoostNodes(nodes: BoostNodes): void {
  try { nodes.osc.stop(); } catch { /* already stopped */ }
  nodes.osc.disconnect();
  nodes.filterNode.disconnect();
  nodes.gainNode.disconnect();
}

export function createTurbineNodes(ctx: AudioContext, destination: AudioNode): TurbineNodes {
  const S = AUDIO_SYNTH;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(destination);

  const filterNode = ctx.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.frequency.value = S.turbineBaseFreq;
  filterNode.Q.value = 2.0;
  filterNode.connect(gainNode);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = S.turbineBaseFreq;
  osc.connect(filterNode);
  osc.start();

  return { osc, filterNode, gainNode };
}

export function updateTurbineGain(nodes: TurbineNodes, boostRatio: number, ctx: AudioContext): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const ratio = Math.max(0, Math.min(1, boostRatio));
  const freq = S.turbineBaseFreq + ratio * (S.turbineMaxFreq - S.turbineBaseFreq);
  const gain = ratio * S.turbineMaxGain;
  nodes.osc.frequency.setTargetAtTime(freq, t, 0.05);
  nodes.filterNode.frequency.setTargetAtTime(freq, t, 0.05);
  nodes.gainNode.gain.setTargetAtTime(gain, t, 0.05);
}

export function stopTurbineNodes(nodes: TurbineNodes): void {
  nodes.gainNode.gain.setTargetAtTime(0, 0, 0.05);
  try { nodes.osc.stop(); } catch { /* already stopped */ }
  nodes.osc.disconnect();
  nodes.filterNode.disconnect();
  nodes.gainNode.disconnect();
}

export function createBoostTrackNodes(ctx: AudioContext, destination: AudioNode): BoostTrackNodes {
  const S = AUDIO_SYNTH;

  // gainNode is the on/off gate — LFO must NOT connect here
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(destination);

  // tremoloGain is the inner AM stage — LFO modulates this, not gainNode
  // Base 0.5 + LFO depth 0.5 → effective range [0, 1] (clean tremolo, no DC leak)
  const tremoloGain = ctx.createGain();
  tremoloGain.gain.value = 0.5;
  tremoloGain.connect(gainNode);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = S.boostTrackOscFreq;
  osc.connect(tremoloGain);
  osc.start();

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = S.boostTrackLFORate;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.5;
  lfo.connect(lfoGain);
  lfoGain.connect(tremoloGain.gain); // modulates inner gain only
  lfo.start();

  return { osc, lfo, lfoGain, tremoloGain, gainNode };
}

export function stopBoostTrackNodes(nodes: BoostTrackNodes): void {
  nodes.gainNode.gain.setTargetAtTime(0, 0, 0.05);
  try { nodes.osc.stop(); } catch { /* already stopped */ }
  try { nodes.lfo.stop(); } catch { /* already stopped */ }
  nodes.osc.disconnect();
  nodes.lfo.disconnect();
  nodes.lfoGain.disconnect();
  nodes.tremoloGain.disconnect();
  nodes.gainNode.disconnect();
}

export function playCheckpointChime(ctx: AudioContext, destination: AudioNode): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const dur = S.checkpointNoteDuration;
  for (let i = 0; i < S.checkpointNotes.length; i++) {
    const freq = S.checkpointNotes[i];
    const start = t + i * dur * 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(S.checkpointNoteGain, start + 0.005);
    g.gain.setValueAtTime(S.checkpointNoteGain, start + dur - 0.02);
    g.gain.linearRampToValueAtTime(0, start + dur);
    g.connect(destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(g);
    osc.start(start);
    osc.stop(start + dur + 0.01);
  }
}

export function playFinishChime(ctx: AudioContext, destination: AudioNode): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const dur = S.checkpointNoteDuration;
  for (let i = 0; i < S.finishNotes.length; i++) {
    const freq = S.finishNotes[i];
    const start = t + i * S.finishNoteStagger;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(S.finishNoteGain, start + 0.005);
    g.gain.setValueAtTime(S.finishNoteGain, start + dur - 0.02);
    g.gain.linearRampToValueAtTime(0, start + dur + 0.10);
    g.connect(destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(g);
    osc.start(start);
    osc.stop(start + dur + 0.15);
  }
}

export function playRainDrop(ctx: AudioContext, destination: AudioNode): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const dur = S.rainDropDuration;

  const g = ctx.createGain();
  g.gain.setValueAtTime(S.rainDropGain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(S.rainDropFreq, t);
  osc.frequency.exponentialRampToValueAtTime(S.rainDropFreq * 0.5, t + dur);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

export function playCardSlam(ctx: AudioContext, destination: AudioNode): void {
  const t = ctx.currentTime;

  // Sub-bass thud — deep body of the impact
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.9, t);
  subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  subGain.connect(destination);
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(80, t);
  subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
  subOsc.connect(subGain);
  subOsc.start(t);
  subOsc.stop(t + 0.5);

  // Mid thud — click of the slam
  const midGain = ctx.createGain();
  midGain.gain.setValueAtTime(0.55, t);
  midGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  midGain.connect(destination);
  const midOsc = ctx.createOscillator();
  midOsc.type = 'sine';
  midOsc.frequency.setValueAtTime(160, t);
  midOsc.frequency.exponentialRampToValueAtTime(55, t + 0.18);
  midOsc.connect(midGain);
  midOsc.start(t);
  midOsc.stop(t + 0.25);

  // Noise smack — textured impact transient
  const smackBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
  const smackData = smackBuf.getChannelData(0);
  for (let i = 0; i < smackData.length; i++) smackData[i] = Math.random() * 2 - 1;

  const smackFilter = ctx.createBiquadFilter();
  smackFilter.type = 'bandpass';
  smackFilter.frequency.value = 350;
  smackFilter.Q.value = 0.8;
  smackFilter.connect(destination);

  const smackGain = ctx.createGain();
  smackGain.gain.setValueAtTime(0.5, t);
  smackGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  smackGain.connect(smackFilter);

  const smackSrc = ctx.createBufferSource();
  smackSrc.buffer = smackBuf;
  smackSrc.connect(smackGain);
  smackSrc.start(t);

  // High crack — sharp initial snap
  const crackBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
  const crackData = crackBuf.getChannelData(0);
  for (let i = 0; i < crackData.length; i++) crackData[i] = Math.random() * 2 - 1;

  const crackFilter = ctx.createBiquadFilter();
  crackFilter.type = 'bandpass';
  crackFilter.frequency.value = 1800;
  crackFilter.Q.value = 2.0;
  crackFilter.connect(destination);

  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0.35, t);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  crackGain.connect(crackFilter);

  const crackSrc = ctx.createBufferSource();
  crackSrc.buffer = crackBuf;
  crackSrc.connect(crackGain);
  crackSrc.start(t);
}

export function playLiquidSlosh(
  ctx: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
  type: string,
): void {
  const S = AUDIO_SYNTH;
  const t = ctx.currentTime;
  const freqMap: Record<string, number> = {
    oil: S.sloshOilFreq,
    milk: S.sloshMilkFreq,
    juice: S.sloshJuiceFreq,
    butter: S.sloshButterFreq,
    food: S.sloshFoodFreq,
  };
  const freq = freqMap[type] ?? 500;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(S.sloshGain, t);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + S.sloshDuration);
  gainNode.connect(destination);

  const filterNode = ctx.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.frequency.value = freq;
  filterNode.Q.value = 3.0;
  filterNode.connect(gainNode);

  // Gurgle LFO modulates filter frequency
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 6;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = freq * 0.5;
  lfo.connect(lfoGain);
  lfoGain.connect(filterNode.frequency);
  lfo.start(t);
  lfo.stop(t + S.sloshDuration + 0.05);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.connect(filterNode);
  src.start(t);
  src.stop(t + S.sloshDuration + 0.05);
}
