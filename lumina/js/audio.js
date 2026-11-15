/**
 * The score is synthesized here. Nothing is downloaded, and the browser
 * stays quiet until the first tap, which is when the audio device unlocks.
 */

const MUTE_KEY = "lumina-muted";
const HIGH = [523.25, 587.33, 659.25, 783.99, 880];
const LOW = [196, 220, 261.63, 329.63, 392];

let audio = null;
let master = null;
let music = null;
let sfx = null;
let color = null;
let shimmer = null;
let noise = null;
let muted = loadMuted();
let nextBell = 0;
let lastFollow = -1;
let lastMode = "";

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
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
  music.gain.value = 0.16;
  music.connect(filter);
  filter.connect(master);

  sfx = audio.createGain();
  sfx.gain.value = 0.85;
  sfx.connect(master);

  const bed = [
    { freq: 73.42, type: "sine", gain: 0.34, lfo: 0.045 },
    { freq: 110, type: "sine", gain: 0.2, lfo: 0.06 },
    { freq: 146.83, type: "triangle", gain: 0.07, lfo: 0.08 },
    { freq: 220, type: "sine", gain: 0.05, lfo: 0.05 },
  ];
  for (const voice of bed) {
    const osc = audio.createOscillator();
    osc.type = voice.type;
    osc.frequency.value = voice.freq;
    const gain = audio.createGain();
    gain.gain.value = voice.gain;
    const lfo = audio.createOscillator();
    lfo.frequency.value = voice.lfo;
    const depth = audio.createGain();
    depth.gain.value = voice.gain * 0.4;
    lfo.connect(depth);
    depth.connect(gain.gain);
    osc.connect(gain);
    gain.connect(music);
    osc.start();
    lfo.start();
  }

  const air = audio.createOscillator();
  air.type = "sine";
  air.frequency.value = 440;
  shimmer = audio.createGain();
  shimmer.gain.value = 0.03;
  air.connect(shimmer);
  shimmer.connect(music);
  air.start();

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

export function follow(mode, light) {
  if (!audio || !music) return;
  const now = audio.currentTime;
  if (now - lastFollow >= 0.12 || mode !== lastMode) {
    lastFollow = now;
    lastMode = mode;
    const amount = Math.max(0, Math.min(1, light));
    const level = mode === "play" ? 0.26 : mode === "over" ? 0.07 : mode === "paused" ? 0.1 : 0.16;
    music.gain.setTargetAtTime(level, now, 0.4);
    color?.setTargetAtTime(380 + amount * 1500, now, 0.5);
    shimmer?.gain.setTargetAtTime(0.012 + amount * 0.05, now, 0.5);
  }
  if (muted || mode === "over" || mode === "paused" || now < nextBell) return;
  const amount = Math.max(0, Math.min(1, light));
  const scale = amount < 0.45 ? LOW : HIGH;
  const note = scale[Math.floor(Math.random() * scale.length)];
  tone(note, 1.15, 0.04, "sine", music);
  if (Math.random() < 0.35) tone(note * 1.5, 1.3, 0.018, "sine", music);
  nextBell = now + (mode === "play" ? 3.1 : 5.2) + Math.random() * 2.4;
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
