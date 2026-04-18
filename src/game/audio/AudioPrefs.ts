export interface AudioPrefs { masterVolume: number; musicVolume: number; }

const KEY = 'kgp_audio_prefs';
const DEFAULTS: AudioPrefs = { masterVolume: 0.8, musicVolume: 0.7 };

export function loadAudioPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      masterVolume: typeof parsed.masterVolume === 'number' ? parsed.masterVolume : DEFAULTS.masterVolume,
      musicVolume: typeof parsed.musicVolume === 'number' ? parsed.musicVolume : DEFAULTS.musicVolume,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAudioPrefs(prefs: Partial<AudioPrefs>): void {
  try {
    const current = loadAudioPrefs();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // ignore
  }
}
