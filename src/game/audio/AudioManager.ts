import * as THREE from 'three';
import type { CarState } from '../../types/game.js';
import { AUDIO_SYNTH } from '../../constants/audio.js';
import type { CarAudioNode } from './CarAudioNode.js';
import {
  createNoiseBuffer,
  createEngineNodes,
  updateEngineFreq,
  stopEngineNodes,
  createSkidNodes,
  stopSkidNodes,
  playCollision,
  playCountdownBeep,
  playCountdownFanfare,
  playSpeedStripWoosh,
  createBoostNodes,
  stopBoostNodes,
  createTurbineNodes,
  updateTurbineGain,
  stopTurbineNodes,
  createBoostTrackNodes,
  stopBoostTrackNodes,
  playCheckpointChime,
  playFinishChime,
  playRainDrop,
  playLiquidSlosh,
} from './SoundSynthesizer.js';

export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private dryGain: GainNode;
  private reverbSend: GainNode;
  private carNodes: Map<string, CarAudioNode> = new Map();
  private noiseBuffer: AudioBuffer;
  private lastWooshTimes = new Map<string, number>();
  private lastCamera: THREE.PerspectiveCamera | null = null;
  private boostTrackActive = false;
  private inTunnel = false;

  constructor(_camera: THREE.PerspectiveCamera) {
    const S = AUDIO_SYNTH;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = S.masterGain;

    // Dry path: masterGain → dryGain → destination
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1.0;
    this.masterGain.connect(this.dryGain);
    this.dryGain.connect(this.ctx.destination);

    // Reverb path: masterGain → reverbSend → 3 comb filters → reverbReturn → destination
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0;
    this.masterGain.connect(this.reverbSend);

    const reverbReturn = this.ctx.createGain();
    reverbReturn.gain.value = 1.0;
    reverbReturn.connect(this.ctx.destination);

    for (let i = 0; i < S.tunnelDelayTimes.length; i++) {
      const delay = this.ctx.createDelay(0.5);
      delay.delayTime.value = S.tunnelDelayTimes[i];
      const fbGain = this.ctx.createGain();
      fbGain.gain.value = S.tunnelFeedbacks[i];
      this.reverbSend.connect(delay);
      delay.connect(fbGain);
      fbGain.connect(delay); // feedback loop
      delay.connect(reverbReturn);
    }

    this.noiseBuffer = createNoiseBuffer(this.ctx, 2);
  }

  resumeAudio(): void {
    if (this.ctx.state !== 'closed') void this.ctx.resume();
  }

  suspendAudio(): void {
    if (this.ctx.state !== 'closed') void this.ctx.suspend();
  }

  setMasterVolume(v: number): void {
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.05);
  }

  getMasterVolume(): number {
    return this.masterGain.gain.value;
  }

  onSpeedStripCrossed(carId: string): void {
    const node = this.carNodes.get(carId);
    if (!node) return;
    const isPlayer = node.skidNodes !== null;
    if (!isPlayer && !node.isVisible) return;
    const now = this.ctx.currentTime;
    const last = this.lastWooshTimes.get(carId) ?? -1;
    if (now - last < 0.2) return;
    this.lastWooshTimes.set(carId, now);
    playSpeedStripWoosh(this.ctx, node.cullGain, this.noiseBuffer);
  }

  onCountdownTick(step: number): void {
    if (step === 0) {
      playCountdownFanfare(this.ctx, this.masterGain);
    } else {
      // step 3→index 0, 2→index 1, 1→index 2
      const idx = 3 - step;
      playCountdownBeep(this.ctx, this.masterGain, idx);
    }
  }

  addCar(car: CarState, isPlayer: boolean): void {
    const S = AUDIO_SYNTH;
    const ctx = this.ctx;

    const pannerNode = ctx.createPanner();
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    pannerNode.refDistance = S.pannerRefDistance;
    pannerNode.maxDistance = S.pannerMaxDistance;
    pannerNode.rolloffFactor = S.pannerRolloffFactor;
    pannerNode.connect(this.masterGain);

    const cullGain = ctx.createGain();
    cullGain.gain.value = 0;
    cullGain.connect(pannerNode);

    const idleJitter = Math.random();
    const engineNodes = createEngineNodes(ctx, cullGain, idleJitter);

    let skidNodes = null;
    let boostNodes = null;
    let turbineNodes = null;
    let boostTrackNodes = null;
    if (isPlayer) {
      skidNodes = createSkidNodes(ctx, this.noiseBuffer, cullGain);
      boostNodes = createBoostNodes(ctx, cullGain);
      turbineNodes = createTurbineNodes(ctx, cullGain);
      boostTrackNodes = createBoostTrackNodes(ctx, cullGain);
    }

    this.carNodes.set(car.id, {
      carId: car.id,
      pannerNode,
      engineNodes,
      skidNodes,
      skidVolumeCurrent: 0,
      cullGain,
      cullGainCurrent: 0,
      isVisible: false,
      boostNodes,
      boostVolumeCurrent: 0,
      turbineNodes,
      boostTrackNodes,
    });
  }

  removeCar(carId: string): void {
    const node = this.carNodes.get(carId);
    if (!node) return;
    stopEngineNodes(node.engineNodes);
    if (node.skidNodes) stopSkidNodes(node.skidNodes);
    if (node.boostNodes) stopBoostNodes(node.boostNodes);
    if (node.turbineNodes) stopTurbineNodes(node.turbineNodes);
    if (node.boostTrackNodes) stopBoostTrackNodes(node.boostTrackNodes);
    node.cullGain.disconnect();
    node.pannerNode.disconnect();
    this.carNodes.delete(carId);
  }

  update(cars: CarState[], playerCar: CarState | null, camera: THREE.PerspectiveCamera): void {
    const S = AUDIO_SYNTH;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.lastCamera = camera;

    if (playerCar) {
      ctx.listener.positionX.setValueAtTime(playerCar.position.x, t);
      ctx.listener.positionY.setValueAtTime(0, t);
      ctx.listener.positionZ.setValueAtTime(playerCar.position.z, t);
    }

    for (const car of cars) {
      const node = this.carNodes.get(car.id);
      if (!node) continue;

      const targetVisible = car.isPlayer || this.isInFrustum(car.position, camera);
      node.isVisible = targetVisible;

      const targetCullGain = targetVisible ? 1 : 0;
      const cullRate = 0.05;
      node.cullGainCurrent += (targetCullGain - node.cullGainCurrent) * cullRate;
      node.cullGain.gain.setTargetAtTime(node.cullGainCurrent, t, 0.1);

      node.pannerNode.positionX.setValueAtTime(car.position.x, t);
      node.pannerNode.positionY.setValueAtTime(0, t);
      node.pannerNode.positionZ.setValueAtTime(car.position.z, t);

      const speedRatio = Math.min(1, Math.abs(car.speed) / car.definition.maxSpeed);
      updateEngineFreq(node.engineNodes, speedRatio, ctx);

      if (node.skidNodes) {
        const targetGain = car.isSkidding ? S.skidMaxGain : 0;
        const fadeRate = car.isSkidding ? S.skidFadeInRate : S.skidFadeOutRate;
        node.skidVolumeCurrent += (targetGain - node.skidVolumeCurrent) * fadeRate;
        node.skidNodes.gainNode.gain.setTargetAtTime(
          Math.max(0, node.skidVolumeCurrent),
          t,
          0.02,
        );
      }

      // Boost hum
      if (node.boostNodes) {
        const active = car.boostMultiplier > 1.001;
        const target = active ? S.boostHumGain : 0;
        const rate = active ? S.boostFadeInRate : S.boostFadeOutRate;
        node.boostVolumeCurrent += (target - node.boostVolumeCurrent) * rate;
        node.boostNodes.gainNode.gain.setTargetAtTime(Math.max(0, node.boostVolumeCurrent), t, 0.05);
      }

      // Turbine whine (speed strip boost only — boostDecayRate > 0)
      if (node.turbineNodes) {
        if (car.boostDecayRate > 0 && car.boostMultiplier > 1.0) {
          const boostRatio = (car.boostMultiplier - 1.0) / 0.5;
          updateTurbineGain(node.turbineNodes, boostRatio, ctx);
        } else {
          node.turbineNodes.gainNode.gain.setTargetAtTime(0, t, 0.1);
        }
      }

      // Boost track rev (driven by onBoostTrackState)
      if (node.boostTrackNodes && car.isPlayer) {
        const targetGain = this.boostTrackActive ? S.boostTrackGain : 0;
        node.boostTrackNodes.gainNode.gain.setTargetAtTime(targetGain, t, 0.1);
      }
    }
  }

  onCollision(position: THREE.Vector3): void {
    const S = AUDIO_SYNTH;
    const listenerPos = new THREE.Vector3(
      this.ctx.listener.positionX.value,
      0,
      this.ctx.listener.positionZ.value,
    );
    const dist = position.distanceTo(listenerPos);
    const distanceFactor = Math.max(0, 1 - dist / S.pannerMaxDistance);
    playCollision(this.ctx, this.masterGain, this.noiseBuffer, distanceFactor);
  }

  onCheckpointCrossed(): void {
    playCheckpointChime(this.ctx, this.masterGain);
  }

  onFinishLine(): void {
    playFinishChime(this.ctx, this.masterGain);
  }

  onRainDrop(x: number, z: number): void {
    if (!this.lastCamera) return;
    // Frustum cull: only play if the drop position is visible on screen
    const pos = new THREE.Vector3(x, 0, z);
    if (!this.isInFrustum(pos, this.lastCamera)) return;
    if (Math.random() >= 0.5) return;
    // One-shot spatial panner at the drop's world position — listener distance drives volume
    const S = AUDIO_SYNTH;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = S.pannerRefDistance;
    panner.maxDistance = S.pannerMaxDistance;
    panner.rolloffFactor = S.pannerRolloffFactor;
    panner.positionX.value = x;
    panner.positionY.value = 0;
    panner.positionZ.value = z;
    panner.connect(this.masterGain);
    playRainDrop(this.ctx, panner);
    setTimeout(() => { try { panner.disconnect(); } catch { /* already gone */ } }, 200);
  }

  onLiquidSlosh(type: string, carId: string): void {
    const node = this.carNodes.get(carId);
    if (!node) return;
    const isPlayer = node.skidNodes !== null;
    if (!isPlayer && !node.isVisible) return;
    playLiquidSlosh(this.ctx, node.cullGain, this.noiseBuffer, type);
  }

  onBoostTrackState(active: boolean): void {
    this.boostTrackActive = active;
  }

  setInTunnel(inTunnel: boolean): void {
    if (this.inTunnel === inTunnel) return;
    this.inTunnel = inTunnel;
    const S = AUDIO_SYNTH;
    const t = this.ctx.currentTime;
    const tc = S.tunnelCrossfadeTimeConst;
    this.reverbSend.gain.setTargetAtTime(inTunnel ? S.tunnelWetGain : 0, t, tc);
    this.dryGain.gain.setTargetAtTime(inTunnel ? S.tunnelDryGain : 1.0, t, tc);
  }

  private isInFrustum(position: THREE.Vector3, camera: THREE.PerspectiveCamera): boolean {
    const ndc = position.clone().project(camera);
    const m = AUDIO_SYNTH.frustumCullMargin;
    return Math.abs(ndc.x) <= 1 + m && Math.abs(ndc.y) <= 1 + m && ndc.z <= 1;
  }

  stopCarEngine(carId: string): void {
    const node = this.carNodes.get(carId);
    if (!node) return;
    stopEngineNodes(node.engineNodes);
    if (node.skidNodes) stopSkidNodes(node.skidNodes);
    if (node.boostNodes) stopBoostNodes(node.boostNodes);
    if (node.turbineNodes) stopTurbineNodes(node.turbineNodes);
    if (node.boostTrackNodes) stopBoostTrackNodes(node.boostTrackNodes);
  }

  dispose(): void {
    for (const node of this.carNodes.values()) {
      stopEngineNodes(node.engineNodes);
      if (node.skidNodes) stopSkidNodes(node.skidNodes);
      if (node.boostNodes) stopBoostNodes(node.boostNodes);
      if (node.turbineNodes) stopTurbineNodes(node.turbineNodes);
      if (node.boostTrackNodes) stopBoostTrackNodes(node.boostTrackNodes);
      node.cullGain.disconnect();
      node.pannerNode.disconnect();
    }
    this.carNodes.clear();
    void this.ctx.close();
  }
}
