/**
 * The score is synthesized here. Nothing is downloaded, and the browser
 * stays quiet until the first tap, which is when the audio device unlocks.
 */

const MUTE_KEY = "lumina-muted";
const MUSIC_KEY = "lumina-music";
const SFX_KEY = "lumina-sfx";
const VOICE = [0.46, 0.24, 0.12];
const CHORDS = [
  [73.42, 110, 174.61],
  [87.31, 130.81, 220],
  [65.41, 98, 146.83],
  [110, 164.81, 246.94],
];
const MELODY = [
  [349.23, 440, 523.25],
  [349.23, 440, 523.25],
  [392, 523.25, 587.33],
  [440, 523.25, 659.25],
];
const NEIGHBORS = [
  [1, 3],
  [2, 0],
  [1, 3],
  [0, 2],
];

let audio = null;
let master = null;
let music = null;
let sfx = null;
let color = null;
let noise = null;
let muted = loadMuted();
let musicVolume = loadVolume(MUSIC_KEY, muted ? 0 : 0.9);
let sfxVolume = loadVolume(SFX_KEY, muted ? 0 : 0.75);
let musicMix = 0.7;
let layers = [];
let active = 0;
let chordIndex = 0;
let nextChord = 0;
let nextBell = 0;
let lastFollow = -1;
let lastMode = "";
let lastLight = -1;

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function loadVolume(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === "") return fallback;
    const value = Number(raw);
    if (Number.isFinite(value)) return Math.max(0, Math.min(1, value));
  } catch {
    /* The slider falls back to the built-in level. */
  }
  return fallback;
}

function saveVolume(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* The slider still holds until the page closes. */
  }
}

export function isMuted() {
  return muted || (musicVolume <= 0.001 && sfxVolume <= 0.001);
}

export function getMusicVolume() {
  return musicVolume;
}

export function getSfxVolume() {
  return sfxVolume;
}

function musicBus() {
  return musicMix * musicVolume;
}

function syncMute() {
  const silent = musicVolume <= 0.001 && sfxVolume <= 0.001;
  if (silent === muted) return;
  muted = silent;
  saveMuted();
  applyMute();
}

export function setMusicVolume(value) {
  musicVolume = Math.max(0, Math.min(1, value));
  saveVolume(MUSIC_KEY, musicVolume);
  syncMute();
  if (music && audio) music.gain.setTargetAtTime(musicBus(), audio.currentTime, 0.04);
}

export function setSfxVolume(value) {
  sfxVolume = Math.max(0, Math.min(1, value));
  saveVolume(SFX_KEY, sfxVolume);
  syncMute();
  if (sfx && audio) sfx.gain.setTargetAtTime(sfxVolume, audio.currentTime, 0.04);
}

function saveMuted() {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* The choice still holds until the page closes. */
  }
}

function ensure() {
  if (audio) return true;
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context) return false;
  audio = new Context();

  master = audio.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(audio.destination);

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 720;
  color = filter.frequency;

  music = audio.createGain();
  music.gain.value = musicBus();
  music.connect(filter);
  filter.connect(master);

  sfx = audio.createGain();
  sfx.gain.value = sfxVolume;
  sfx.connect(master);

  layers = [0, 1].map((layer) => VOICE.map((amount, index) => {
    const osc = audio.createOscillator();
    osc.type = index === 1 ? "triangle" : "sine";
    osc.frequency.value = CHORDS[0][index];
    const gain = audio.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(music);
    osc.start();
    return { osc, gain, amount };
  }));
  active = 0;
  chordIndex = 0;
  const start = audio.currentTime;
  layers[0].forEach((voice) => {
    voice.gain.gain.setValueAtTime(0.0001, start);
    voice.gain.gain.exponentialRampToValueAtTime(voice.amount, start + 0.12);
    voice.gain.gain.exponentialRampToValueAtTime(voice.amount * 0.28, start + 1.7);
  });
  nextChord = start + 2.2;

  const seconds = 1;
  const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  noise = buffer;
  nextBell = audio.currentTime + 1.4;
  return true;
}

function applyMute() {
  if (!master || !audio) return;
  master.gain.setTargetAtTime(muted ? 0 : 1, audio.currentTime, 0.03);
}

export function unlock() {
  if (!ensure()) return;
  if (audio.state === "suspended") audio.resume();
}

export function toggleMuted() {
  muted = !muted;
  saveMuted();
  unlock();
  applyMute();
  if (!muted) tone(660, 0.14, 0.05);
  return muted;
}

function tone(freq, duration, peak, type = "sine", destination = sfx) {
  if (!audio || !destination) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + Math.min(0.03, duration * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function sweep(from, to, duration, peak) {
  if (!audio || !sfx) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(Math.max(1, from), now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(sfx);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function rustle(duration, frequency, peak) {
  if (!audio || !noise || !sfx) return;
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  const now = audio.currentTime;
  source.buffer = noise;
  source.loop = true;
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 0.8;
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfx);
  source.start(now);
  source.stop(now + duration + 0.02);
}

function stepChord(light) {
  const now = audio.currentTime;
  if (now < nextChord || layers.length < 2) return;
  const options = NEIGHBORS[chordIndex];
  chordIndex = options[Math.floor(Math.random() * options.length)];
  const idle = 1 - active;
  const arriving = layers[idle];
  const leaving = layers[active];
  arriving.forEach((voice, index) => {
    voice.osc.frequency.setValueAtTime(CHORDS[chordIndex][index], now);
    const level = Math.max(0.0001, index === 2 ? voice.amount * light : voice.amount);
    voice.gain.gain.setValueAtTime(0.0001, now);
    voice.gain.gain.exponentialRampToValueAtTime(level, now + 0.12);
    voice.gain.gain.exponentialRampToValueAtTime(level * 0.28, now + 1.7);
  });
  leaving.forEach((voice) => {
    voice.gain.gain.setTargetAtTime(0.0001, now, 0.15);
  });
  active = idle;
  nextChord = now + 2.4 + Math.random() * 1.3;
}

export function follow(mode, light) {
  if (!audio || !music) return;
  const now = audio.currentTime;
  const amount = Math.max(0, Math.min(1, light));
  if (mode !== "over" && mode !== "paused") stepChord(amount);
  if (now - lastFollow >= 0.12 || mode !== lastMode) {
    lastFollow = now;
    lastMode = mode;
    musicMix = mode === "play" ? 1 : mode === "over" ? 0.42 : mode === "paused" ? 0.55 : 0.78;
    music.gain.setTargetAtTime(musicBus(), now, 0.5);
    color?.setTargetAtTime(460 + amount * 1100, now, 0.6);
    if (Math.abs(amount - lastLight) > 0.05) {
      lastLight = amount;
      const high = layers[active]?.[2];
      if (high) high.gain.gain.setTargetAtTime(Math.max(0.0001, high.amount * amount), now, 0.7);
    }
  }
  if (muted || mode === "over" || mode === "paused" || now < nextBell) return;
  nextBell = now + (mode === "play" ? 1.15 : 2.1) + Math.random() * 1.15;
  if (Math.random() < 0.12) return;
  const scale = MELODY[chordIndex];
  let note = scale[Math.floor(Math.random() * scale.length)];
  if (amount < 0.45) note *= 0.5;
  tone(note, 0.62, 0.16, "sine", music);
}

export function playBegin() {
  unlock();
  sweep(220, 660, 0.34, 0.06);
}

export function playPass() {
  tone(920 + Math.random() * 180, 0.07, 0.025);
}

export function playGraze() {
  tone(1180, 0.09, 0.045);
  tone(1560, 0.14, 0.03);
}

export function playSpark() {
  tone(880, 0.16, 0.06);
  tone(1320, 0.22, 0.04);
}

export function playHit(fatal) {
  sweep(fatal ? 150 : 210, fatal ? 42 : 74, fatal ? 0.42 : 0.24, fatal ? 0.16 : 0.1);
  rustle(fatal ? 0.2 : 0.09, 280, fatal ? 0.12 : 0.06);
}

export function playGuard() {
  tone(520, 0.18, 0.06);
  tone(780, 0.24, 0.04);
}

export function playDeath() {
  sweep(330, 55, 0.9, 0.1);
  rustle(0.45, 180, 0.08);
}

export function playBuy() {
  tone(523.25, 0.12, 0.05);
  tone(659.25, 0.18, 0.04);
}

export function playTap() {
  tone(740, 0.06, 0.03);
}
