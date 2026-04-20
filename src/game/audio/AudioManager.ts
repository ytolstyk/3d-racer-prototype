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
  playSplash,
  playCountdownBeep,
  playCountdownFanfare,
  playSpeedStripWoosh,
  createBoostNodes,
  stopBoostNodes,
} from './SoundSynthesizer.js';

export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private carNodes: Map<string, CarAudioNode> = new Map();
  private noiseBuffer: AudioBuffer;
  private lastWooshTime = -1;

  constructor(_camera: THREE.PerspectiveCamera) {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = AUDIO_SYNTH.masterGain;
    this.masterGain.connect(this.ctx.destination);
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

  onSpeedStripCrossed(): void {
    const now = this.ctx.currentTime;
    if (now - this.lastWooshTime < 0.2) return;
    this.lastWooshTime = now;
    playSpeedStripWoosh(this.ctx, this.masterGain, this.noiseBuffer);
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
    if (isPlayer) {
      skidNodes = createSkidNodes(ctx, this.noiseBuffer, cullGain);
      boostNodes = createBoostNodes(ctx, cullGain);
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
    });
  }

  removeCar(carId: string): void {
    const node = this.carNodes.get(carId);
    if (!node) return;
    stopEngineNodes(node.engineNodes);
    if (node.skidNodes) stopSkidNodes(node.skidNodes);
    if (node.boostNodes) stopBoostNodes(node.boostNodes);
    node.cullGain.disconnect();
    node.pannerNode.disconnect();
    this.carNodes.delete(carId);
  }

  update(cars: CarState[], playerCar: CarState | null, camera: THREE.PerspectiveCamera): void {
    const S = AUDIO_SYNTH;
    const ctx = this.ctx;
    const t = ctx.currentTime;

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

  onSplash(): void {
    playSplash(this.ctx, this.masterGain, this.noiseBuffer);
  }

  private isInFrustum(position: THREE.Vector3, camera: THREE.PerspectiveCamera): boolean {
    const ndc = position.clone().project(camera);
    const m = AUDIO_SYNTH.frustumCullMargin;
    return Math.abs(ndc.x) <= 1 + m && Math.abs(ndc.y) <= 1 + m && ndc.z <= 1;
  }

  dispose(): void {
    for (const node of this.carNodes.values()) {
      stopEngineNodes(node.engineNodes);
      if (node.skidNodes) stopSkidNodes(node.skidNodes);
      if (node.boostNodes) stopBoostNodes(node.boostNodes);
      node.cullGain.disconnect();
      node.pannerNode.disconnect();
    }
    this.carNodes.clear();
    void this.ctx.close();
  }
}
