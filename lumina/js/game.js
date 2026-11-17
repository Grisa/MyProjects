import {
  applyDamage,
  circlesOverlap,
  clamp,
  BLOOM_SCORE,
  BLOOM_SECONDS,
  BLOOM_SPAN,
  bloomEase,
  bloomSpan,
  BOSS_ARRIVE,
  BOSS_BETWEEN,
  BOSS_HITS,
  BOSS_LEAVE,
  bossPhrase,
  bossThreshold,
  bossWallCenters,
  noteBossLight,
  noteShieldSpark,
  novaRadius,
  rollNova,
  scoreForPass,
  shufflePhrases,
  aimPair,
  edgeCamp,
  edgeSlots,
  fieldDust,
  laneNudge,
  pairXs,
  actBanner,
  actIndex,
  actLine,
  castKinds,
  paceAt,
  waveWait,
  staggerDrop,
  variedGap,
  difficultyAt,
  edgeFacing,
  enemyHitsPlayerSweep,
  enemyStep,
  writeEnemyOutline,
  lerp,
  passScore,
} from "./math.js";
import { UPGRADES, bonuses, canBuy, nodeGlow, nodeState, upgradeById } from "./upgrades.js";
import { initAds, noteDeath } from "./ads.js";
import {
  follow,
  getMusicVolume,
  getSfxVolume,
  playBegin,
  playBloom,
  playBoss,
  playBossEnd,
  playBossHit,
  playBuy,
  playDeath,
  playGraze,
  playGuard,
  playHit,
  playPass,
  playSpark,
  playTap,
  setForeground,
  setMusicVolume,
  setSfxVolume,
  unlock,
} from "./audio.js";

const HIGH_SCORE_KEY = "lumina-high-score";
const SPARKS_KEY = "lumina-sparks";
const UPGRADES_KEY = "lumina-upgrades";
const HINT_KEY = "lumina-hint";
const TUTORIAL_KEY = "lumina-tutorial";
const TUTORIAL_PAGES = [
  {
    title: "Arraste",
    lines: ["A bolinha fica embaixo.", "O dedo só a leva para os lados."],
  },
  {
    title: "Desvie",
    lines: ["As sombras caem no escuro.", "Um toque apaga um pedaço da luz."],
  },
  {
    title: "Pontos",
    lines: ["Passar soma 1. Rente soma 2.", "A faísca devolve luz."],
  },
  {
    title: "O campo",
    lines: ["Aos 400 a visão abre e caem dois.", "Ficar no canto não esconde."],
  },
];
const BOSS_HIT_LINES = ["Uma luz.", "Duas luzes."];
const CODEX = [
  {
    kind: "orb",
    tint: "rose",
    title: "Bolha",
    lines: ["Desce reto.", "O caminho é a própria sombra."],
  },
  {
    kind: "diamond",
    tint: "violet",
    title: "Caco",
    lines: ["Escorrega para o lado.", "Bate na borda e volta."],
  },
  {
    kind: "shard",
    tint: "teal",
    title: "Lasca",
    lines: ["Treme rápido no lugar.", "O desvio é curto e frequente."],
  },
  {
    kind: "lantern",
    tint: "copper",
    title: "Vigia",
    lines: ["Segura a queda.", "A borda acende e ele despenca."],
  },
  {
    kind: "grin",
    tint: "blue",
    title: "Riso",
    lines: ["Abre um S largo.", "Devagar, de um lado ao outro."],
  },
  {
    kind: "mantle",
    tint: "violet",
    title: "Manto",
    lines: ["Abre um corredor.", "A luz fica no fim. Três vezes."],
  },
];
const PORTRAIT = 9 / 16;
const CORE_FRAC = 0.028;
const LIGHT_FRAC = 0.22;
const TINTS = {
  rose: [255, 72, 112],
  violet: [188, 112, 255],
  teal: [72, 214, 198],
  copper: [255, 112, 64],
  blue: [132, 170, 255],
};
const KINDS = [
  { kind: "orb", tint: "rose", weight: 34, scale: 1 },
  { kind: "diamond", tint: "violet", weight: 26, scale: 1 },
  { kind: "shard", tint: "teal", weight: 16, scale: 0.88 },
  { kind: "lantern", tint: "copper", weight: 14, scale: 1.08 },
  { kind: "grin", tint: "blue", weight: 10, scale: 1.02 },
];
const LIGHT_LERP = 4.2;
const SHAKE_DECAY = 2.1;
const MAX_DT = 0.05;
const ACT_BLEND = 1.2;
const ACT_BANNER = 2.2;
const ACT_SKY = [
  { glow: "#0c1222", edge: "#04060c" },
  { glow: "#12343a", edge: "#061416" },
  { glow: "#2a1642", edge: "#120818" },
  { glow: "#2a1642", edge: "#120818" },
];

const canvas = document.querySelector("#game");
const statusEl = document.querySelector("#status");
const satProbe = document.querySelector("#sat");
const ctx = canvas.getContext("2d", { alpha: false });
const hitProbe = { x: 0, y: 0, coreRadius: 0, lightRadius: 0 };
const drawPoints = [];

const state = {
  mode: "menu",
  time: 0,
  elapsed: 0,
  score: 0,
  highScore: loadHighScore(),
  sparks: loadSparks(),
  owned: loadOwned(),
  selectedId: "centelha",
  treePanX: 0,
  treePanY: 0,
  gesture: null,
  spawnTimer: 0,
  sparkTimer: 0,
  calm: 0,
  shake: 0,
  dying: false,
  guardUsed: false,
  shielded: false,
  shieldSparks: 0,
  hintSeen: loadHintSeen(),
  tutorialSeen: loadTutorialSeen(),
  tutorialPage: 0,
  tutorialReturn: "menu",
  codexPage: 0,
  codexEnemy: null,
  settingsReturn: "menu",
  confirmErase: false,
  dragSlider: null,
  width: 0,
  height: 0,
  viewW: 0,
  viewH: 0,
  offsetX: 0,
  offsetY: 0,
  dpr: 1,
  safeTop: 0,
  player: null,
  enemies: [],
  orbs: [],
  particles: [],
  floaters: [],
  pointerId: null,
  announced: "",
  span: 1,
  surgeLeft: 0,
  opened: false,
  flash: 0,
  boss: null,
  bossVisit: 0,
  act: 0,
  actFrom: 0,
  actBlend: 1,
  actBanner: "",
  actBannerLeft: 0,
};

function loadHintSeen() {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function loadTutorialSeen() {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

function markTutorialSeen() {
  state.tutorialSeen = true;
  try {
    localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {
    /* The same session still remembers that the pages were shown. */
  }
}

function tutorialStatus() {
  const page = TUTORIAL_PAGES[state.tutorialPage];
  return `Como jogar. ${page.title}. ${page.lines.join(" ")}`;
}

function openTutorial(backTo) {
  state.tutorialPage = 0;
  state.tutorialReturn = backTo;
  state.mode = "tutorial";
  announce(tutorialStatus());
}

function closeTutorial() {
  markTutorialSeen();
  state.mode = state.tutorialReturn || "menu";
  if (state.mode === "settings") announce("Ajustes.");
  else if (state.mode === "paused") announce("Pausado. Toque para continuar.");
  else if (state.mode === "over") announce(`Fim de jogo. Pontos ${state.score}. Recorde ${state.highScore}.`);
  else announce(menuLine());
}

function stepTutorial(direction) {
  const next = state.tutorialPage + direction;
  if (next < 0 || next >= TUTORIAL_PAGES.length) {
    playTap();
    closeTutorial();
    return;
  }
  state.tutorialPage = next;
  playTap();
  announce(tutorialStatus());
}

function codexStatus() {
  const page = CODEX[state.codexPage];
  return `Codex. ${page.title}. ${page.lines.join(" ")}`;
}

function openCodex() {
  state.codexPage = 0;
  state.codexEnemy = null;
  state.mode = "codex";
  announce(codexStatus());
}

function stepCodexPage(direction) {
  const next = state.codexPage + direction;
  if (next < 0 || next >= CODEX.length) {
    playTap();
    state.codexEnemy = null;
    state.mode = "menu";
    announce(menuLine());
    return;
  }
  state.codexPage = next;
  state.codexEnemy = null;
  playTap();
  announce(codexStatus());
}

function rememberHint() {
  if (state.hintSeen) return;
  state.hintSeen = true;
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    /* The sentence can return next time if storage is blocked. */
  }
}

function menuLine() {
  const record = state.highScore > 0 ? ` Recorde ${state.highScore}.` : "";
  const hint = state.hintSeen ? "" : " A luz também é a vida.";
  return `Jogar.${record}${hint}`;
}

function loadHighScore() {
  try {
    const value = Number(localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function loadSparks() {
  try {
    const value = Number(localStorage.getItem(SPARKS_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function loadOwned() {
  try {
    const raw = JSON.parse(localStorage.getItem(UPGRADES_KEY) || "[]");
    const ids = Array.isArray(raw) ? raw.filter((id) => upgradeById(id)) : [];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(SPARKS_KEY, String(state.sparks));
    localStorage.setItem(UPGRADES_KEY, JSON.stringify([...state.owned]));
  } catch {
    /* The run still keeps the sparks in memory. */
  }
}

let perkCache = null;

function perks() {
  if (!perkCache) perkCache = bonuses(state.owned);
  return perkCache;
}

function invalidatePerks() {
  perkCache = null;
}

function saveHighScore(score) {
  if (score <= state.highScore) return;
  state.highScore = score;
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    /* Storage can be blocked in private mode. The run still ends. */
  }
}

function unit() {
  return Math.min(state.viewW, state.viewH);
}

function fieldW() {
  return state.viewW * state.span;
}

function fieldH() {
  return state.viewH * state.span;
}

/** The bright core shrinks with the remaining light so a hit is obvious. */
function shownCoreRadius(player) {
  const health = clamp(player.lightRadius / Math.max(1, player.initialLight), 0, 1);
  return player.coreRadius * (0.42 + 0.58 * health);
}

function makePlayer(x) {
  const perk = perks();
  const core = unit() * CORE_FRAC * perk.core;
  const light = unit() * LIGHT_FRAC * perk.light;
  const clamped = clamp(x, core, Math.max(core, fieldW() - core));
  return {
    x: clamped,
    y: fieldH() * perk.playerY,
    targetX: clamped,
    coreRadius: core,
    lightRadius: light,
    targetLight: light,
    initialLight: light,
  };
}

function viewportSize() {
  const view = window.visualViewport;
  return {
    width: view ? view.width : window.innerWidth,
    height: view ? view.height : window.innerHeight,
  };
}

function layout() {
  const { width, height } = viewportSize();
  const prevW = state.viewW;
  const prevH = state.viewH;
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = width;
  state.height = height;
  state.safeTop = satProbe ? satProbe.offsetHeight : 0;
  document.documentElement.style.height = `${height}px`;
  document.body.style.height = `${height}px`;

  if (width / Math.max(1, height) > PORTRAIT) {
    state.viewH = height;
    state.viewW = height * PORTRAIT;
    state.offsetX = (width - state.viewW) / 2;
    state.offsetY = 0;
  } else {
    state.viewW = width;
    state.viewH = height;
    state.offsetX = 0;
    state.offsetY = 0;
  }

  canvas.width = Math.max(1, Math.round(width * state.dpr));
  canvas.height = Math.max(1, Math.round(height * state.dpr));

  if (!state.player || prevW === 0 || prevH === 0) {
    state.player = makePlayer(state.viewW / 2);
    return;
  }

  const sx = state.viewW / prevW;
  const sy = state.viewH / prevH;
  const player = state.player;
  player.x *= sx;
  player.targetX *= sx;
  player.lightRadius *= sy;
  player.targetLight *= sy;
  player.initialLight *= sy;
  player.y = fieldH() * perks().playerY;
  player.coreRadius = unit() * CORE_FRAC * perks().core;
  player.x = clamp(player.x, player.coreRadius, fieldW() - player.coreRadius);
  player.targetX = clamp(player.targetX, player.coreRadius, fieldW() - player.coreRadius);

  for (const enemy of state.enemies) {
    enemy.x *= sx;
    enemy.y *= sy;
    enemy.r *= sy;
    if (enemy.homeX != null) enemy.homeX *= sx;
  }
  for (const orb of state.orbs) {
    orb.x *= sx;
    orb.y *= sy;
    orb.r *= sy;
  }
  for (const particle of state.particles) {
    particle.x *= sx;
    particle.y *= sy;
    particle.vx *= sx;
    particle.vy *= sy;
    particle.radius *= sy;
  }
  for (const floater of state.floaters) {
    floater.x *= sx;
    floater.y *= sy;
  }
}

function announce(text) {
  if (!statusEl || state.announced === text) return;
  state.announced = text;
  statusEl.textContent = text;
}

function showRunSky() {
  if (state.mode === "play" || state.mode === "paused" || state.mode === "over") return true;
  if (state.mode === "settings") {
    const back = state.settingsReturn;
    return back === "play" || back === "paused" || back === "over";
  }
  return false;
}

function tickAct(dt) {
  if (state.actBlend < 1) state.actBlend = Math.min(1, state.actBlend + dt / ACT_BLEND);
  else state.actFrom = state.act;
  if (state.actBannerLeft > 0) state.actBannerLeft = Math.max(0, state.actBannerLeft - dt);
}

function noteAct() {
  const next = actIndex(state.score);
  if (next === state.act) return false;
  state.actFrom = state.act;
  state.act = next;
  state.actBlend = 0;
  const banner = actBanner(next);
  state.actBanner = banner;
  state.actBannerLeft = banner ? ACT_BANNER : 0;
  const line = actLine(next);
  if (line) announce(line);
  return Boolean(line);
}

function resetRun(pointerX) {
  state.span = 1;
  state.surgeLeft = 0;
  state.opened = false;
  state.flash = 0;
  state.boss = null;
  state.bossVisit = 0;
  state.act = 0;
  state.actFrom = 0;
  state.actBlend = 1;
  state.actBanner = "";
  state.actBannerLeft = 0;
  state.player = makePlayer(Number.isFinite(pointerX) ? pointerX : state.viewW / 2);
  state.enemies = [];
  state.orbs = [];
  state.particles = [];
  state.floaters = [];
  state.score = 0;
  state.elapsed = 0;
  state.spawnTimer = 0.45;
  state.sparkTimer = 1.5;
  state.calm = 0;
  state.shake = 0;
  state.dying = false;
  state.guardUsed = false;
  state.shielded = false;
  state.shieldSparks = 0;
  state.mode = "play";
  rememberHint();
  announce("Pontos 0");
}

function pauseRun() {
  if (state.mode !== "play") return;
  state.mode = "paused";
  state.pointerId = null;
  announce("Pausado. Toque para continuar.");
}

function resumeRun(pointerX) {
  if (state.mode !== "paused") return;
  state.mode = "play";
  state.last = performance.now();
  if (Number.isFinite(pointerX)) aim(pointerX);
  announce(`Pontos ${state.score}`);
}

function endRun() {
  saveHighScore(state.score);
  state.mode = "over";
  state.dying = false;
  state.pointerId = null;
  announce(`Fim de jogo. Pontos ${state.score}. Recorde ${state.highScore}.`);
  playDeath();
  noteDeath();
}

function pickKind(except) {
  const allowed = new Set(castKinds(state.score, state.opened));
  const pool = KINDS.filter((kind) => allowed.has(kind.kind) && kind.kind !== except);
  const source = pool.length ? pool : KINDS.filter((kind) => allowed.has(kind.kind));
  let roll = Math.random() * source.reduce((sum, kind) => sum + kind.weight, 0);
  for (const kind of source) {
    roll -= kind.weight;
    if (roll < 0) return kind;
  }
  return source[0];
}

function rollEnemy(except) {
  const picked = pickKind(except);
  const r = clamp(
    state.viewH * (0.038 + Math.random() * 0.022) * picked.scale,
    16,
    state.viewW * 0.18,
  );
  return { kind: picked.kind, tint: picked.tint, r };
}

function placeEnemy(body, x, y) {
  state.enemies.push({
    kind: body.kind,
    tint: body.tint,
    x,
    y,
    r: body.r,
    homeX: x,
    phase: Math.random() * Math.PI * 2,
    fall: 0.74 + Math.random() * 0.52,
    drift: body.kind === "diamond" ? (Math.random() < 0.5 ? -1 : 1) : 1,
    commit: body.kind === "lantern" ? fieldH() * (0.42 + Math.random() * 0.14) : 0,
  });
}

function topCrowded(x, reach) {
  return state.enemies.some(
    (other) => other.y < reach * 3 && Math.abs(other.x - x) < other.r + reach,
  );
}

function campSide() {
  const player = state.player;
  if (!player) return 0;
  const band = Math.max(player.coreRadius * 4, fieldW() * 0.18);
  return edgeCamp(player.x, fieldW(), band);
}

function spawnEnemy() {
  const body = rollEnemy();
  const side = campSide();
  const margin = body.r + 6;
  const span = Math.max(1, fieldW() - margin * 2);
  const aimed = !side && Math.random() < 0.58;
  let x = side
    ? edgeSlots(state.player.x, fieldW(), body.r, 0, side)[0]
    : aimed
      ? clamp(state.player.x + laneNudge(body.r), margin, Math.max(margin, fieldW() - margin))
      : margin + Math.random() * span;
  if (!side && !aimed) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (!topCrowded(x, body.r)) break;
      x = margin + Math.random() * span;
    }
  }
  placeEnemy(body, x, -body.r - 6);
}

/** A pair with a changing gap. One often sits on the player's lane, and the other arrives later. */
function spawnPair() {
  const a = rollEnemy();
  const b = rollEnemy(a.kind);
  const reach = Math.max(a.r, b.r);
  const margin = reach + 6;
  const minGap = a.r + b.r + unit() * 0.2;
  const maxGap = Math.max(minGap, fieldW() * (state.opened ? 0.5 : 0.34));
  const gap = variedGap(minGap, maxGap);
  const lead = -(reach + 6);
  const side = campSide();
  const aimed = !side && Math.random() < (state.opened ? 0.72 : 0.5);
  let xs = side
    ? edgeSlots(state.player.x, fieldW(), reach, gap, side)
    : aimed
      ? aimPair(state.player.x, fieldW(), reach, gap)
      : pairXs(fieldW(), margin, gap);
  if (!side && !aimed) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!xs.some((x) => topCrowded(x, reach))) break;
      xs = pairXs(fieldW(), margin, gap);
    }
  }
  const drop = staggerDrop(reach);
  placeEnemy(a, xs[0], lead);
  placeEnemy(b, xs[1], lead - drop);
}

function spawnSpark() {
  const nova = rollNova(perks().nova);
  const r = clamp(state.viewH * (nova ? 0.022 : 0.018), 8, state.viewW * 0.05);
  const margin = r + 10;
  const span = Math.max(1, fieldW() - margin * 2);
  state.orbs.push({
    x: margin + Math.random() * span,
    y: -r * 4,
    r,
    nova,
  });
}

function popup(x, y, text) {
  state.floaters.push({ x, y, text, age: 0, life: 0.75 });
}

function collectSpark(orb) {
  const perk = perks();
  const gained = perk.sparkValue;
  state.sparks += gained;
  if (perk.sparkScore && !state.boss) {
    state.score += perk.sparkScore;
    noteAct();
  }
  maybeBloom();
  saveProgress();
  const player = state.player;
  player.targetLight = Math.min(player.initialLight, player.targetLight + player.initialLight * perks().heal);
  if (player.targetLight > 0) state.dying = false;
  const shield = noteShieldSpark(state.shieldSparks, state.shielded, perk.shieldEvery);
  state.shieldSparks = shield.count;
  state.shielded = shield.shielded;
  popup(orb.x, orb.y, shield.gained ? "escudo" : `+${gained}`);
  if (orb.nova) burstNova(orb.x, orb.y);
  playSpark();
}

function burstNova(x, y) {
  const reach = novaRadius(fieldH());
  burst(x, y);
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    if (Math.hypot(enemy.x - x, enemy.y - y) > reach + enemy.r) continue;
    const struck = state.enemies.splice(i, 1)[0];
    burst(struck.x, struck.y);
  }
}

function burst(x, y) {
  const count = 16;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
    const speed = 80 + Math.random() * 170;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: 0.34 + Math.random() * 0.26,
      radius: unit() * (0.01 + Math.random() * 0.014),
    });
  }
}

function impactPoint(player, enemy) {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: player.x + (dx / length) * player.coreRadius,
    y: player.y + (dy / length) * player.coreRadius,
  };
}

function hurt(enemy) {
  const player = state.player;
  const hit = impactPoint(player, enemy);
  if (state.shielded) {
    state.shielded = false;
    state.shake = 0.45;
    burst(hit.x, hit.y);
    popup(player.x, player.y - unit() * 0.06, "escudo");
    playGuard();
    return;
  }
  const perk = perks();
  let next = applyDamage(player.targetLight, player.initialLight, perk.damage);
  let guarded = false;
  if (next === 0 && perk.guard && !state.guardUsed) {
    next = player.initialLight * 0.12;
    state.guardUsed = true;
    guarded = true;
  }
  player.targetLight = next;
  state.calm = 0;
  state.shake = 1;
  burst(hit.x, hit.y);
  if (player.targetLight === 0) state.dying = true;
  if (guarded) playGuard();
  else playHit(player.targetLight === 0);
}

function scaleWorld(k) {
  if (!state.player || k === 1) return;
  state.player.x *= k;
  state.player.targetX *= k;
  state.player.y *= k;
  for (const enemy of state.enemies) {
    enemy.x *= k;
    enemy.y *= k;
    if (enemy.homeX != null) enemy.homeX *= k;
    if (enemy.commit) enemy.commit *= k;
  }
  for (const orb of state.orbs) {
    orb.x *= k;
    orb.y *= k;
  }
  for (const particle of state.particles) {
    particle.x *= k;
    particle.y *= k;
    particle.vx *= k;
    particle.vy *= k;
  }
  for (const floater of state.floaters) {
    floater.x *= k;
    floater.y *= k;
  }
}

function bloomBurst() {
  const player = state.player;
  const reach = Math.max(fieldW(), fieldH());
  const count = 56;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
    const speed = reach * (0.28 + Math.random() * 0.42);
    state.particles.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: 0.85 + Math.random() * 0.55,
      radius: unit() * (0.012 + Math.random() * 0.02),
    });
  }
  state.shake = 1;
}

function maybeBloom() {
  if (state.opened || state.dying || state.score < BLOOM_SCORE) return;
  state.opened = true;
  state.surgeLeft = BLOOM_SECONDS;
  state.flash = 1;
  bloomBurst();
  playBloom();
}

function bossShape() {
  const shown = state.boss ? state.boss.shown : 0;
  const top = (state.safeTop + 58) * state.span;
  const rx = fieldW() * 0.4;
  const ry = Math.min(fieldH() * 0.07, unit() * 0.11 * state.span);
  const rest = top + ry;
  const y = rest + (1 - shown) * (-ry * 2.6);
  return { x: fieldW() * 0.5, y, rx, ry };
}

function bossLane(fraction, radius) {
  const margin = radius + 4;
  const width = fieldW();
  return clamp(width * fraction, margin, Math.max(margin, width - margin));
}

function laneQuiet() {
  if (state.enemies.length > 0) return false;
  return !state.orbs.some((orb) => orb.core);
}

function emitBossBeat(beat, y) {
  if (beat.role === "core") {
    const r = clamp(state.viewH * 0.02, 9, fieldW() * 0.05);
    state.orbs.push({
      x: bossLane(beat.x, r),
      y,
      r,
      core: true,
    });
    return;
  }
  const r = clamp(state.viewH * 0.042, 18, fieldW() * 0.09);
  const kind = beat.kind || "orb";
  placeEnemy(
    { kind, tint: kind === "lantern" ? "copper" : "violet", r },
    bossLane(beat.x, r),
    y,
  );
  const enemy = state.enemies[state.enemies.length - 1];
  enemy.fall = 1;
  enemy.homeX = enemy.x;
  if (kind === "lantern") enemy.commit = fieldH() * 0.22;
}

function beginBoss() {
  state.boss = {
    phase: "arrive",
    timer: BOSS_ARRIVE,
    hits: 0,
    shown: 0,
    flash: 0,
    phrase: null,
    deck: shufflePhrases(),
    deckIndex: 0,
    missed: 0,
    wallSeq: 0,
    wallHit: 0,
  };
  playBoss();
  announce("O Manto cobre o topo.");
}

function bossBirthY() {
  return bossShape().y;
}

function startBossPhrase() {
  const boss = state.boss;
  if (!boss || boss.hits >= BOSS_HITS) {
    dismissBoss();
    return;
  }
  if (boss.deckIndex >= boss.deck.length) {
    boss.deck = shufflePhrases();
    boss.deckIndex = 0;
  }
  boss.phrase = bossPhrase(boss.deck[boss.deckIndex]);
  boss.deckIndex += 1;
  boss.phase = "fall";
  boss.cursor = 0;
  boss.dropped = 0;
  boss.step = Math.max(fieldH() * 0.18, unit() * 0.24);
  boss.minT = boss.phrase.beats.reduce((min, beat) => Math.min(min, beat.t), 0);
}

function dismissBoss() {
  const boss = state.boss;
  if (!boss || boss.phase === "leave") return;
  boss.phase = "leave";
  boss.timer = BOSS_LEAVE;
  boss.flash = 1;
  const shape = bossShape();
  burst(shape.x, shape.y + shape.ry * 0.4);
  state.shake = 0.55;
  playBossEnd();
  announce("O Manto se abre.");
}

function finishBoss() {
  while (state.score >= bossThreshold(state.bossVisit)) state.bossVisit += 1;
  state.boss = null;
  state.spawnTimer = paceAt(state.score).interval;
}

function maybeBoss() {
  if (state.boss || state.dying || !state.opened || state.surgeLeft > 0) return;
  if (state.score < bossThreshold(state.bossVisit)) return;
  beginBoss();
}

function tickBoss(dt, speed) {
  const boss = state.boss;
  if (!boss) return;
  boss.flash = Math.max(0, boss.flash - dt * 2.2);
  if (boss.phase === "arrive") {
    if (boss.timer > 0) {
      boss.timer = Math.max(0, boss.timer - dt);
      boss.shown = 1 - boss.timer / BOSS_ARRIVE;
      return;
    }
    boss.shown = 1;
    if (laneQuiet()) startBossPhrase();
    return;
  }
  if (boss.phase === "fall") {
    boss.shown = 1;
    const beats = boss.phrase ? boss.phrase.beats : [];
    boss.dropped += Math.max(0, speed) * dt;
    const birth = bossBirthY();
    while (
      boss.cursor < beats.length
      && (beats[boss.cursor].t - boss.minT) * boss.step <= boss.dropped + 0.5
    ) {
      emitBossBeat(beats[boss.cursor], birth);
      boss.cursor += 1;
    }
    if (boss.cursor >= beats.length && laneQuiet()) {
      boss.phase = "rest";
      boss.timer = BOSS_BETWEEN;
    }
    return;
  }
  if (boss.phase === "rest") {
    if (boss.hits >= BOSS_HITS) {
      dismissBoss();
      return;
    }
    boss.timer -= dt;
    if (boss.timer <= 0 && laneQuiet()) startBossPhrase();
    return;
  }
  boss.timer -= dt;
  boss.shown = clamp(boss.timer / BOSS_LEAVE, 0, 1);
  if (boss.timer <= 0) finishBoss();
}

function shadowRadius() {
  return clamp(state.viewH * 0.042, 18, fieldW() * 0.09);
}

/** A full line under the mantle. The first touch hurts once. */
function closeBossField() {
  const boss = state.boss;
  if (!boss || boss.phase === "leave") return;
  const r = shadowRadius();
  const y = bossBirthY();
  const id = boss.wallSeq + 1;
  boss.wallSeq = id;
  for (const x of bossWallCenters(fieldW(), r)) {
    placeEnemy({ kind: "orb", tint: "violet", r }, x, y);
    const enemy = state.enemies[state.enemies.length - 1];
    enemy.fall = 1;
    enemy.homeX = x;
    enemy.wall = id;
    enemy.points = 0;
  }
  announce("O Manto fecha o campo.");
}

function resolveBossLight(caught) {
  const boss = state.boss;
  if (!boss || boss.phase === "leave") return;
  const next = noteBossLight(boss.missed, caught);
  boss.missed = next.missed;
  if (next.close) closeBossField();
}

function strikeBoss(orb) {
  const boss = state.boss;
  if (!boss || boss.phase === "leave") return;
  resolveBossLight(true);
  boss.hits += 1;
  boss.flash = 1;
  const player = state.player;
  player.targetLight = Math.min(
    player.initialLight,
    player.targetLight + player.initialLight * 0.1,
  );
  popup(orb.x, orb.y, "luz");
  burst(orb.x, orb.y);
  playBossHit();
  if (boss.hits >= BOSS_HITS) dismissBoss();
  else announce(BOSS_HIT_LINES[boss.hits - 1] || "Uma luz.");
}

function tickBloom(dt) {
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.35);
  if (state.surgeLeft <= 0) return;
  state.surgeLeft = Math.max(0, state.surgeLeft - dt);
  const elapsed = BLOOM_SECONDS - state.surgeLeft;
  const next = bloomSpan(elapsed);
  const prev = state.span;
  if (Math.abs(next - prev) < 1e-5) return;
  state.span = next;
  scaleWorld(next / prev);
}

function update(dt) {
  if (state.mode === "settings" || state.mode === "tutorial" || state.mode === "codex") {
    if (state.mode === "tutorial" || state.mode === "codex") state.time += dt;
    if (state.mode === "codex") stepCodex(dt);
    follow("menu", 0.85);
    return;
  }
  if (state.mode === "paused") {
    const pausedLight = state.player?.initialLight
      ? state.player.lightRadius / state.player.initialLight
      : 0.4;
    follow("paused", pausedLight);
    return;
  }

  state.time += dt;
  const player = state.player;
  const perk = perks();
  player.y = fieldH() * perk.playerY;
  player.coreRadius = unit() * CORE_FRAC * perk.core;

  if (state.mode === "play") {
    tickBloom(dt);
    player.y = fieldH() * perk.playerY;
    player.x = lerp(player.x, player.targetX, perk.follow, dt);
    player.x = clamp(player.x, player.coreRadius, fieldW() - player.coreRadius);

    if (!state.dying) {
      state.elapsed += dt;
      state.calm += dt;
      const { speed } = difficultyAt(state.score, state.viewH, state.span);
      if (state.boss) tickBoss(dt, speed);
      if (!state.boss && state.surgeLeft <= 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          if (state.opened) spawnPair();
          else spawnEnemy();
          const wait = waveWait(state.score, perk.interval);
          state.spawnTimer = Math.max(state.spawnTimer + wait, wait);
        }
      }
      if (!state.boss) {
        state.sparkTimer -= dt;
        if (state.sparkTimer <= 0) {
          spawnSpark();
          state.sparkTimer += perk.sparkInterval;
        }
      }
      if (perk.regen > 0 && state.calm >= perk.calmDelay && player.targetLight < player.initialLight) {
        player.targetLight = Math.min(
          player.initialLight,
          player.targetLight + player.initialLight * perk.regen * dt,
        );
      }

      hitProbe.x = player.x;
      hitProbe.y = player.y;
      hitProbe.coreRadius = shownCoreRadius(player);
      hitProbe.lightRadius = player.lightRadius;
      for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = state.enemies[i];
        const previousY = enemy.y;
        enemyStep(enemy, dt, speed, state.time, fieldW());
        const wallAlreadyHit = enemy.wall && state.boss && state.boss.wallHit === enemy.wall;
        if (!state.dying && !wallAlreadyHit && enemyHitsPlayerSweep(hitProbe, enemy, previousY)) {
          if (enemy.wall && state.boss) state.boss.wallHit = enemy.wall;
          const struck = state.enemies.splice(i, 1)[0];
          hurt(struck);
          continue;
        }
        if (
          enemy.points == null
          && !state.boss
          && previousY < player.y
          && enemy.y >= player.y
        ) {
          enemy.points = passScore(hitProbe, enemy);
          if (enemy.points > 1) {
            popup(enemy.x, player.y - unit() * 0.05, "+2");
            playGraze();
          }
        }
        if (enemy.y - enemy.r > fieldH()) {
          state.enemies.splice(i, 1);
          if (!state.dying) {
            const gained = scoreForPass(enemy.points ?? 1, Boolean(state.boss));
            if (gained > 0) {
              state.score += gained;
              const crossed = noteAct();
              if (!crossed) announce(`Pontos ${state.score}`);
              if (gained === 1) playPass();
              maybeBloom();
            }
          }
        }
      }

      const magnet = perk.magnet * fieldH();
      for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
        const orb = state.orbs[i];
        const previousY = orb.y;
        orb.y += speed * dt;
        if (!orb.core && magnet > 0) {
          const dx = player.x - orb.x;
          const dy = player.y - orb.y;
          const distance = Math.hypot(dx, dy);
          if (distance < magnet && distance > 1) {
            const pull = fieldH() * 0.55 * dt;
            orb.x += (dx / distance) * pull;
            orb.y += (dy / distance) * pull * 0.35;
          }
        }
        const reach = shownCoreRadius(player) * 1.35;
        const caught = circlesOverlap(player.x, player.y, reach, orb.x, orb.y, orb.r)
          || (player.y >= Math.min(previousY, orb.y)
            && player.y <= Math.max(previousY, orb.y)
            && circlesOverlap(player.x, player.y, reach, orb.x, player.y, orb.r));
        if (caught) {
          const taken = state.orbs.splice(i, 1)[0];
          if (taken.core) strikeBoss(taken);
          else collectSpark(taken);
          continue;
        }
        if (orb.y - orb.r > fieldH()) {
          const lost = state.orbs.splice(i, 1)[0];
          if (lost.core) resolveBossLight(false);
        }
      }
      maybeBoss();
    }

    player.lightRadius = lerp(player.lightRadius, player.targetLight, LIGHT_LERP, dt);
    if (state.dying && player.lightRadius < 1.5) endRun();
  }

  const light = state.mode === "play" && player?.initialLight
    ? player.lightRadius / player.initialLight
    : state.mode === "over" ? 0.04 : 0.85;
  follow(state.mode, light);

  if (state.mode === "play" || state.mode === "over") tickAct(dt);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - SHAKE_DECAY * dt);

  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const particle = state.particles[i];
    particle.age += dt;
    if (particle.age >= particle.life) {
      state.particles.splice(i, 1);
      continue;
    }
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
  }

  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const floater = state.floaters[i];
    floater.age += dt;
    floater.y -= 36 * dt;
    if (floater.age >= floater.life) state.floaters.splice(i, 1);
  }
}

function playfieldPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * state.width - state.offsetX,
    y: ((clientY - rect.top) / rect.height) * state.height - state.offsetY,
  };
}

function buttonRect(yFraction = 0.58) {
  const w = Math.min(state.viewW * 0.74, 320);
  const h = Math.max(52, unit() * 0.09);
  return {
    x: (state.viewW - w) / 2,
    y: state.viewH * yFraction,
    w,
    h,
  };
}

function insideRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function aim(x) {
  const core = state.player.coreRadius;
  state.player.targetX = clamp(x * state.span, core, fieldW() - core);
}

function capturePointer(event) {
  state.pointerId = event.pointerId;
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    /* The pointer can end before capture. Aiming still follows the last point. */
  }
}

function settingsRect() {
  const w = Math.max(112, unit() * 0.3);
  const h = Math.max(44, unit() * 0.08);
  const y = Math.max(12, state.safeTop + 8);
  if (state.mode === "play" || state.mode === "paused") {
    return { x: state.viewW - w - 12, y, w, h };
  }
  return { x: 14, y, w, h };
}

function openSettings() {
  if (state.mode === "play") pauseRun();
  state.settingsReturn = state.mode === "paused" ? "paused" : state.mode;
  state.confirmErase = false;
  state.dragSlider = null;
  state.mode = "settings";
  playTap();
  announce("Ajustes.");
}

function closeSettings() {
  state.confirmErase = false;
  state.dragSlider = null;
  state.mode = state.settingsReturn || "menu";
  if (state.mode === "paused") announce("Pausado. Toque para continuar.");
  else if (state.mode === "over") announce(`Fim de jogo. Pontos ${state.score}. Recorde ${state.highScore}.`);
  else announce(menuLine());
}

function onPointerDown(event) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  const point = playfieldPoint(event.clientX, event.clientY);
  if (
    state.mode !== "tree"
    && state.mode !== "settings"
    && state.mode !== "tutorial"
    && state.mode !== "codex"
    && insideRect(point.x, point.y, settingsRect())
  ) {
    unlock();
    openSettings();
    return;
  }
  unlock();
  if (state.mode === "tutorial") {
    onTutorialDown(point.x, point.y);
    return;
  }
  if (state.mode === "codex") {
    onCodexDown(point.x, point.y);
    return;
  }
  if (state.mode === "settings") {
    onSettingsDown(point.x, point.y);
    if (state.dragSlider) capturePointer(event);
    return;
  }
  if (state.mode === "paused") {
    resumeRun(point.x);
    capturePointer(event);
    return;
  }
  if (state.mode === "menu") {
    if (insideRect(point.x, point.y, upgradesRect())) {
      playTap();
      openTree();
      return;
    }
    if (insideRect(point.x, point.y, codexRect())) {
      playTap();
      openCodex();
      return;
    }
    if (insideRect(point.x, point.y, playRect())) {
      playBegin();
      resetRun(point.x);
      capturePointer(event);
    }
    return;
  }
  if (state.mode === "over") {
    if (insideRect(point.x, point.y, buttonRect(0.58))) {
      playBegin();
      resetRun(point.x);
      capturePointer(event);
      return;
    }
    if (insideRect(point.x, point.y, buttonRect(0.7))) {
      playTap();
      openTree();
    }
    return;
  }
  if (state.mode === "tree") {
    state.gesture = {
      id: event.pointerId,
      x: point.x,
      y: point.y,
      sx: point.x,
      sy: point.y,
      dragged: false,
    };
    capturePointer(event);
    return;
  }
  capturePointer(event);
  aim(point.x);
}

function onPointerMove(event) {
  const point = playfieldPoint(event.clientX, event.clientY);
  if (state.mode === "settings" && state.dragSlider) {
    setSlider(state.dragSlider, point.x);
    return;
  }
  if (state.mode === "tree" && state.gesture?.id === event.pointerId) {
    const gesture = state.gesture;
    if (!gesture.dragged && Math.hypot(point.x - gesture.sx, point.y - gesture.sy) > 12) {
      gesture.dragged = true;
    }
    if (gesture.dragged) {
      state.treePanX = clamp(state.treePanX + point.x - gesture.x, -280, 280);
      state.treePanY = clamp(state.treePanY + point.y - gesture.y, -360, 360);
      gesture.x = point.x;
      gesture.y = point.y;
    }
    return;
  }
  if (state.mode !== "play" || state.pointerId !== event.pointerId) return;
  aim(point.x);
}

function onPointerUp(event) {
  if (state.dragSlider === "sfx") playTap();
  state.dragSlider = null;
  if (state.mode === "tree" && state.gesture?.id === event.pointerId) {
    if (!state.gesture.dragged) onTreeTap(state.gesture.sx, state.gesture.sy);
    state.gesture = null;
  }
  if (state.pointerId === event.pointerId) state.pointerId = null;
}

function openTree() {
  state.mode = "tree";
  state.gesture = null;
  announce(`Melhorias. ${state.sparks} faíscas.`);
}

function tryBuy(id) {
  const upgrade = upgradeById(id);
  if (!upgrade || !canBuy(upgrade, state.owned, state.sparks)) return;
  state.sparks -= upgrade.cost;
  state.owned.add(id);
  invalidatePerks();
  saveProgress();
  playBuy();
  announce(`${upgrade.name} comprado. ${state.sparks} faíscas.`);
}

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
document.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
window.addEventListener("resize", layout);
window.addEventListener("orientationchange", layout);
window.visualViewport?.addEventListener("resize", layout);
window.addEventListener("contextmenu", (event) => event.preventDefault());

function font(size, weight = 500) {
  const face = weight <= 300 ? 100 : weight >= 700 ? 700 : 500;
  return `${face} ${Math.round(size)}px "Lumina Sans", "Segoe UI", system-ui, sans-serif`;
}

function setLetterSpacing(px) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
}

function drawBackground() {
  const run = showRunSky();
  const from = run ? state.actFrom : 0;
  const to = run ? state.act : 0;
  const blend = run ? state.actBlend : 1;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(backgroundLayer(from), 0, 0);
  if (blend < 1 && to !== from) {
    ctx.globalAlpha = blend;
    ctx.drawImage(backgroundLayer(to), 0, 0);
    ctx.globalAlpha = 1;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    drawActSweep(blend);
  }
  ctx.restore();
}

const backgroundLayers = new Map();
let backgroundSize = "";

function backgroundLayer(act) {
  const size = `${state.width}x${state.height}x${state.viewW}x${state.viewH}x${state.offsetX}x${state.offsetY}x${state.dpr}`;
  if (backgroundSize !== size) {
    backgroundLayers.clear();
    backgroundSize = size;
  }
  const key = `${size}|${act}`;
  const cached = backgroundLayers.get(key);
  if (cached) return cached;
  const sky = ACT_SKY[act] || ACT_SKY[0];
  const layer = document.createElement("canvas");
  layer.width = Math.max(1, Math.ceil(state.width * state.dpr));
  layer.height = Math.max(1, Math.ceil(state.height * state.dpr));
  const g = layer.getContext("2d");
  g.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  g.fillStyle = sky.edge;
  g.fillRect(0, 0, state.width, state.height);
  const gradient = g.createRadialGradient(
    state.offsetX + state.viewW / 2,
    state.offsetY + state.viewH * 0.35,
    state.viewH * 0.02,
    state.offsetX + state.viewW / 2,
    state.offsetY + state.viewH * 0.55,
    state.viewH * 0.8,
  );
  gradient.addColorStop(0, sky.glow);
  gradient.addColorStop(1, sky.edge);
  g.fillStyle = gradient;
  g.fillRect(state.offsetX, state.offsetY, state.viewW, state.viewH);
  backgroundLayers.set(key, layer);
  return layer;
}

function drawActSweep(blend) {
  const y = state.offsetY + state.viewH * (blend * 1.15 - 0.08);
  const band = ctx.createLinearGradient(0, y - state.viewH * 0.08, 0, y + state.viewH * 0.1);
  band.addColorStop(0, "rgba(244, 252, 255, 0)");
  band.addColorStop(0.5, "rgba(214, 244, 255, 0.2)");
  band.addColorStop(1, "rgba(244, 252, 255, 0)");
  ctx.fillStyle = band;
  ctx.fillRect(state.offsetX, y - state.viewH * 0.08, state.viewW, state.viewH * 0.18);
}

let glowSprite = null;

function glowSpriteCanvas() {
  if (glowSprite) return glowSprite;
  const size = 256;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext("2d");
  const mid = size / 2;
  const gradient = g.createRadialGradient(mid, mid, size * 0.02, mid, mid, mid);
  gradient.addColorStop(0, "rgba(244, 254, 255, 0.92)");
  gradient.addColorStop(0.22, "rgba(126, 249, 255, 0.62)");
  gradient.addColorStop(0.55, "rgba(70, 190, 255, 0.28)");
  gradient.addColorStop(0.82, "rgba(50, 140, 210, 0.08)");
  gradient.addColorStop(1, "rgba(40, 110, 180, 0)");
  g.fillStyle = gradient;
  g.beginPath();
  g.arc(mid, mid, mid, 0, Math.PI * 2);
  g.fill();
  glowSprite = sprite;
  return sprite;
}

function drawGlow(x, y, radius, alpha) {
  if (radius <= 0.5 || alpha <= 0) return;
  const sprite = glowSpriteCanvas();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

function drawCore(x, y, radius) {
  ctx.fillStyle = "#f7feff";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function traceOutline(points, x, y, r) {
  ctx.beginPath();
  if (!points) {
    ctx.arc(x, y, r, 0, Math.PI * 2);
    return;
  }
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function traceEnemy(enemy) {
  traceOutline(writeEnemyOutline(enemy, drawPoints), enemy.x, enemy.y, enemy.r);
}

/** 0 outside the glow, 1 when the light reaches the body. */
function beamOn(enemy) {
  const player = state.player;
  const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
  const gap = Math.max(0, distance - enemy.r * 0.82);
  const reach = Math.max(player.lightRadius, 1);
  const linear = clamp(1 - gap / reach, 0, 1);
  return linear ** 0.45;
}

function rgba(color, alpha) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function drawLitFaces(enemy, color, beam, points) {
  const player = state.player;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const facing = edgeFacing(a.x, a.y, b.x, b.y, enemy.x, enemy.y, player.x, player.y);
    if (facing <= 0.04) continue;
    const amount = Math.min(1, facing * (0.35 + beam * 0.9));
    const pull = 0.42;
    const ax = enemy.x + (a.x - enemy.x) * pull;
    const ay = enemy.y + (a.y - enemy.y) * pull;
    const bx = enemy.x + (b.x - enemy.x) * pull;
    const by = enemy.y + (b.y - enemy.y) * pull;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(bx, by);
    ctx.lineTo(ax, ay);
    ctx.closePath();
    ctx.fillStyle = rgba(color, 0.72 * amount);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(244, 254, 255, ${0.95 * amount})`;
    ctx.lineWidth = Math.max(2.5, enemy.r * 0.11);
    ctx.stroke();
  }
}

function drawLitOrb(enemy, color, beam) {
  const player = state.player;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const nx = dx / distance;
  const ny = dy / distance;
  ctx.fillStyle = rgba(color, 0.55 * beam);
  ctx.beginPath();
  ctx.arc(
    enemy.x + nx * enemy.r * 0.34,
    enemy.y + ny * enemy.r * 0.34,
    enemy.r * 0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  const face = Math.atan2(ny, nx);
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.r * 0.9, face - 1.05, face + 1.05);
  ctx.strokeStyle = `rgba(244, 254, 255, ${0.98 * beam})`;
  ctx.lineWidth = Math.max(3, enemy.r * 0.18);
  ctx.stroke();
}

function personaEye(x, y, rx, ry, px, py, color) {
  ctx.fillStyle = "rgba(244, 252, 255, 0.95)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(color, 0.95);
  ctx.beginPath();
  ctx.arc(x + px, y + py, Math.min(rx, ry) * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#07090f";
  ctx.beginPath();
  ctx.arc(x + px, y + py, Math.min(rx, ry) * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

function drawPersona(enemy, color, beam, points) {
  const reveal = clamp((beam - 0.14) / 0.5, 0, 1);
  if (reveal <= 0) return;
  const player = state.player;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const look = enemy.r * 0.12;
  const ox = (dx / dist) * look;
  const oy = (dy / dist) * look;
  const r = enemy.r;
  ctx.save();
  traceOutline(points, enemy.x, enemy.y, enemy.r);
  ctx.clip();
  ctx.globalAlpha = reveal;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(244, 252, 255, 0.9)";
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  if (enemy.kind === "diamond") {
    personaEye(enemy.x - r * 0.22, enemy.y - r * 0.04, r * 0.14, r * 0.07, ox * 0.4, oy * 0.2, color);
    personaEye(enemy.x + r * 0.22, enemy.y - r * 0.04, r * 0.14, r * 0.07, ox * 0.4, oy * 0.2, color);
    ctx.beginPath();
    ctx.moveTo(enemy.x - r * 0.38, enemy.y - r * 0.24);
    ctx.lineTo(enemy.x - r * 0.06, enemy.y - r * 0.12);
    ctx.moveTo(enemy.x + r * 0.38, enemy.y - r * 0.24);
    ctx.lineTo(enemy.x + r * 0.06, enemy.y - r * 0.12);
    ctx.strokeStyle = "#07090f";
    ctx.stroke();
  } else if (enemy.kind === "shard") {
    personaEye(enemy.x - r * 0.2, enemy.y + r * 0.02, r * 0.15, r * 0.15, ox * 0.35, oy * 0.2, color);
    personaEye(enemy.x + r * 0.2, enemy.y + r * 0.02, r * 0.15, r * 0.15, ox * 0.35, oy * 0.2, color);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y + r * 0.34, r * 0.09, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.kind === "lantern") {
    personaEye(enemy.x, enemy.y, r * 0.4, r * 0.4, ox * 1.3, oy * 1.3, color);
  } else if (enemy.kind === "grin") {
    ctx.beginPath();
    ctx.arc(enemy.x - r * 0.3, enemy.y - r * 0.02, r * 0.13, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(enemy.x + r * 0.3, enemy.y - r * 0.02, r * 0.13, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y + r * 0.02, r * 0.3, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  } else {
    personaEye(enemy.x + ox * 0.15, enemy.y + oy * 0.1, r * 0.32, r * 0.15, ox * 0.55, oy * 0.25, color);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y + r * 0.36, r * 0.16, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

let frameRim = 0.58;

function drawBossCore(orb) {
  const pulse = 0.82 + Math.sin(state.time * 7) * 0.18;
  drawGlow(orb.x, orb.y, orb.r * 3.4, 0.92 * pulse);
  ctx.fillStyle = "#f7feff";
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
  ctx.fill();
}

/** Wide silhouette across the top. Three motes mark the lights still to catch. */
function drawBoss() {
  const boss = state.boss;
  if (!boss || boss.shown <= 0.02) return;
  const shape = bossShape();
  const eye = boss.phase === "fall" ? 1 : boss.phase === "rest" ? 0.45 : boss.shown;
  ctx.save();
  ctx.globalAlpha = clamp(boss.shown, 0, 1);
  ctx.fillStyle = "#05070f";
  ctx.beginPath();
  ctx.ellipse(shape.x, shape.y, shape.rx, shape.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(188, 150, 255, ${0.35 + eye * 0.45})`;
  ctx.lineWidth = Math.max(2, shape.ry * 0.14);
  ctx.beginPath();
  ctx.ellipse(shape.x, shape.y, shape.rx * 0.96, shape.ry * 0.92, 0, 0.18, Math.PI - 0.18);
  ctx.stroke();
  const look = clamp((state.player.x - shape.x) / fieldW(), -1, 1) * shape.rx * 0.05;
  const eyeX = shape.x + look;
  const eyeY = shape.y - shape.ry * 0.08;
  const slitW = shape.rx * 0.07;
  const slitH = Math.max(2, shape.ry * 0.16 * eye);
  ctx.fillStyle = boss.flash > 0.2 ? "rgba(247, 254, 255, 0.95)" : "rgba(214, 236, 255, 0.9)";
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, slitW, slitH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#07090f";
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, slitH * 0.55, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < BOSS_HITS; i += 1) {
    const lit = i < boss.hits;
    const mx = shape.x + (i - 1) * shape.rx * 0.16;
    const my = shape.y + shape.ry * 0.62;
    const mr = Math.max(4, shape.ry * 0.16);
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fillStyle = lit ? "rgba(247, 254, 255, 0.96)" : "rgba(186, 204, 220, 0.38)";
    ctx.fill();
  }
  ctx.restore();
}

/** Dark body, a faint colored rim in the dark, and a face that appears in the light. */
function drawEnemy(enemy) {
  if (enemy.y + enemy.r < 0 || enemy.y - enemy.r > fieldH()) return;
  const color = TINTS[enemy.tint] ?? TINTS.rose;
  const points = writeEnemyOutline(enemy, drawPoints);
  const dx = enemy.x - state.player.x;
  const dy = enemy.y - state.player.y;
  const reach = state.player.lightRadius + enemy.r;
  const beam = dx * dx + dy * dy > reach * reach ? 0 : beamOn(enemy);
  const diving = enemy.kind === "lantern" && enemy.commit > 0 && enemy.y >= enemy.commit;
  const rim = frameRim + (diving
    ? 0.36
    : enemy.kind === "lantern"
      ? 0.08 * Math.sin(state.time * 2.2 + (enemy.phase || 0))
      : 0);
  traceOutline(points, enemy.x, enemy.y, enemy.r);
  ctx.fillStyle = "#05070f";
  ctx.fill();
  const ink = clamp(rim, 0, 1);
  ctx.strokeStyle = rgba(color, ink * 0.45);
  ctx.lineWidth = Math.max(3, enemy.r * 0.16);
  ctx.stroke();
  ctx.strokeStyle = rgba(color, ink);
  ctx.lineWidth = Math.max(1.75, enemy.r * 0.075);
  ctx.stroke();
  if (beam > 0.03) {
    if (points) drawLitFaces(enemy, color, beam, points);
    else drawLitOrb(enemy, color, beam);
  }
  drawPersona(enemy, color, beam, points);
}

function drawParticles() {
  for (const particle of state.particles) {
    const fade = 1 - particle.age / particle.life;
    ctx.fillStyle = `rgba(198, 250, 255, ${fade})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, Math.max(0.5, particle.radius * fade), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawScore() {
  const text = String(state.score);
  const x = state.viewW / 2;
  const y = Math.max(16, state.safeTop + 10);
  ctx.font = font(Math.max(22, unit() * 0.058), 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(5, 6, 15, 0.85)";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = "rgba(244, 252, 255, 0.92)";
  ctx.fillText(text, x, y);
  drawActBanner(y);
}

function drawActLine(text, y, size) {
  ctx.font = font(size, 500);
  ctx.fillStyle = "rgba(5, 6, 15, 0.8)";
  ctx.fillText(text, state.viewW / 2 + 1, y + 1);
  ctx.fillStyle = "rgba(244, 252, 255, 0.96)";
  ctx.fillText(text, state.viewW / 2, y);
}

function drawActBanner(scoreTop) {
  const left = state.actBannerLeft;
  const banner = state.actBanner;
  if (left <= 0 || !banner?.title) return;
  const age = ACT_BANNER - left;
  const fadeIn = Math.min(1, age / 0.28);
  const fadeOut = Math.min(1, left / 0.55);
  const alpha = Math.min(fadeIn, fadeOut);
  const drop = (1 - fadeIn) * 8;
  const titleY = scoreTop + Math.max(26, unit() * 0.06) + drop;
  const button = settingsRect();
  const detailY = button.y + button.h + 6 + drop;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  drawActLine(banner.title, titleY, Math.max(16, unit() * 0.04));
  if (banner.detail) drawActLine(banner.detail, detailY, Math.max(14, unit() * 0.034));
  ctx.restore();
}

function treeSpan() {
  let minCol = 0;
  let maxCol = 0;
  let minRow = 0;
  let maxRow = 0;
  for (const upgrade of UPGRADES) {
    minCol = Math.min(minCol, upgrade.col);
    maxCol = Math.max(maxCol, upgrade.col);
    minRow = Math.min(minRow, upgrade.row);
    maxRow = Math.max(maxRow, upgrade.row);
  }
  return { minCol, maxCol, minRow, maxRow };
}

function treeMetrics() {
  const span = treeSpan();
  const spanX = Math.max(1, span.maxCol - span.minCol);
  const pitchX = Math.min(84, (state.viewW - 24) / (spanX + 0.62));
  const pitchY = Math.min(78, state.viewH * 0.09);
  const node = Math.min(50, pitchX * 0.56);
  const originX = (state.viewW - pitchX * spanX) / 2 - span.minCol * pitchX + state.treePanX;
  const originY = state.safeTop + state.viewH * 0.16 - span.minRow * pitchY + state.treePanY;
  return { pitchX, pitchY, node, originX, originY };
}

function nodePoint(upgrade, metrics = treeMetrics()) {
  return {
    x: metrics.originX + upgrade.col * metrics.pitchX,
    y: metrics.originY + upgrade.row * metrics.pitchY,
  };
}

function nodeBox(upgrade, metrics = treeMetrics()) {
  const center = nodePoint(upgrade, metrics);
  const node = metrics.node;
  return {
    x: center.x - node / 2,
    y: center.y - node / 2,
    w: node,
    h: node,
    cx: center.x,
    cy: center.y,
  };
}

function detailCard() {
  const h = Math.max(118, unit() * 0.2);
  return { x: 14, y: state.viewH - h - 16, w: state.viewW - 28, h };
}

function buyRect() {
  const card = detailCard();
  return { x: card.x + 14, y: card.y + card.h - 48, w: card.w - 28, h: 36 };
}

function backRect() {
  return { x: 16, y: Math.max(12, state.safeTop + 8), w: 92, h: 36 };
}

function onTreeTap(x, y) {
  if (insideRect(x, y, backRect())) {
    state.mode = "menu";
    announce(menuLine());
    return;
  }
  const selected = upgradeById(state.selectedId);
  if (selected && insideRect(x, y, buyRect())) {
    tryBuy(selected.id);
    return;
  }
  const metrics = treeMetrics();
  for (const upgrade of UPGRADES) {
    if (insideRect(x, y, nodeBox(upgrade, metrics))) {
      state.selectedId = upgrade.id;
      announce(`${upgrade.name}. ${upgrade.text}`);
      return;
    }
  }
}

function drawPill(rect, label, accent, glow = true) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  if (glow) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12;
  }
  roundRect(rect.x, rect.y, rect.w, rect.h, rect.h / 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#e9fdff";
  ctx.font = font(Math.max(15, unit() * 0.038), 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

let sparkSprite = null;

function sparkSpriteCanvas() {
  if (sparkSprite) return sparkSprite;
  const size = 128;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext("2d");
  const mid = size / 2;
  const radius = size * 0.16;
  const glow = g.createRadialGradient(mid, mid, 0, mid, mid, radius * 3.1);
  glow.addColorStop(0, "rgba(255, 236, 186, 0.95)");
  glow.addColorStop(0.4, "rgba(255, 186, 72, 0.28)");
  glow.addColorStop(1, "rgba(255, 170, 40, 0)");
  g.fillStyle = glow;
  g.beginPath();
  g.arc(mid, mid, radius * 3.1, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff4d2";
  g.beginPath();
  g.arc(mid, mid, radius, 0, Math.PI * 2);
  g.fill();
  sparkSprite = sprite;
  return sprite;
}

function drawSparkGlyph(x, y, radius) {
  const sprite = sparkSpriteCanvas();
  const size = radius * 3.1 * 2;
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
}

let novaSprite = null;

function novaSpriteCanvas() {
  if (novaSprite) return novaSprite;
  const size = 128;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext("2d");
  const mid = size / 2;
  const radius = size * 0.16;
  const glow = g.createRadialGradient(mid, mid, 0, mid, mid, radius * 3.4);
  glow.addColorStop(0, "rgba(232, 248, 255, 0.98)");
  glow.addColorStop(0.35, "rgba(64, 168, 255, 0.55)");
  glow.addColorStop(1, "rgba(40, 110, 255, 0)");
  g.fillStyle = glow;
  g.beginPath();
  g.arc(mid, mid, radius * 3.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#d7f4ff";
  g.beginPath();
  g.arc(mid, mid, radius, 0, Math.PI * 2);
  g.fill();
  novaSprite = sprite;
  return sprite;
}

function drawNovaGlyph(x, y, radius) {
  const sprite = novaSpriteCanvas();
  const size = radius * 3.4 * 2;
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
}

function drawSparkCount(x, y, align = "left") {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.font = font(Math.max(15, unit() * 0.038), 600);
  ctx.fillStyle = "rgba(255, 228, 170, 0.92)";
  const text = String(state.sparks);
  if (align === "center") {
    const width = ctx.measureText(text).width;
    const glyph = 5;
    const gap = 8;
    const left = x - (width + gap + glyph * 2) / 2;
    ctx.textAlign = "left";
    ctx.fillText(text, left, y);
    drawSparkGlyph(left + width + gap + glyph, y, glyph);
  } else if (align === "left") {
    drawSparkGlyph(x + 7, y, 5);
    ctx.fillText(text, x + 20, y);
  } else {
    ctx.fillText(text, x - 16, y);
    drawSparkGlyph(x, y, 5);
  }
  ctx.restore();
}

function drawIcon(icon, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, size * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const s = size * 0.34;
  ctx.translate(x, y);
  ctx.beginPath();
  if (icon === "spark" || icon === "double") {
    ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
    if (icon === "double") ctx.fillText("+", s * 0.7, s * 0.15);
  } else if (icon === "halo" || icon === "sun") {
    ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    if (icon === "sun") {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.moveTo(Math.cos(angle) * s * 0.8, Math.sin(angle) * s * 0.8);
        ctx.lineTo(Math.cos(angle) * s * 1.15, Math.sin(angle) * s * 1.15);
      }
      ctx.stroke();
    }
  } else if (icon === "shield" || icon === "wall") {
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.85, -s * 0.45);
    ctx.lineTo(s * 0.7, s * 0.45);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.7, s * 0.45);
    ctx.lineTo(-s * 0.85, -s * 0.45);
    ctx.closePath();
    ctx.stroke();
    if (icon === "wall") {
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, 0);
      ctx.lineTo(s * 0.35, 0);
      ctx.moveTo(0, -s * 0.35);
      ctx.lineTo(0, s * 0.35);
      ctx.stroke();
    }
  } else if (icon === "step" || icon === "reflex") {
    ctx.moveTo(-s, 0);
    ctx.lineTo(s * 0.2, 0);
    ctx.moveTo(s * 0.15, -s * 0.45);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.15, s * 0.45);
    ctx.stroke();
    if (icon === "reflex") {
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.55);
      ctx.lineTo(s * 0.55, -s * 0.55);
      ctx.lineTo(s * 0.2, -s);
      ctx.moveTo(s * 0.55, -s * 0.55);
      ctx.lineTo(s * 0.2, -s * 0.1);
      ctx.stroke();
    }
  } else if (icon === "magnet") {
    ctx.arc(0, s * 0.15, s * 0.7, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, s * 0.15);
    ctx.lineTo(-s * 0.7, s * 0.85);
    ctx.moveTo(s * 0.7, s * 0.15);
    ctx.lineTo(s * 0.7, s * 0.85);
    ctx.stroke();
  } else if (icon === "vortex") {
    ctx.arc(0, 0, s * 0.85, 0.4, Math.PI * 1.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 1.4);
    ctx.stroke();
  } else if (icon === "coins") {
    ctx.arc(-s * 0.28, 0, s * 0.48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.32, s * 0.1, s * 0.48, 0, Math.PI * 2);
    ctx.stroke();
  } else if (icon === "breath") {
    ctx.arc(-s * 0.15, s * 0.1, s * 0.62, 0.2, Math.PI * 1.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.35, -s * 0.85);
    ctx.lineTo(s * 0.35, -s * 0.15);
    ctx.moveTo(s * 0.05, -s * 0.5);
    ctx.lineTo(s * 0.65, -s * 0.5);
    ctx.stroke();
  } else if (icon === "core") {
    ctx.arc(0, 0, s * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === "beacon") {
    ctx.moveTo(0, s * 0.9);
    ctx.lineTo(0, -s * 0.05);
    ctx.moveTo(-s * 0.62, -s * 0.05);
    ctx.lineTo(0, -s * 0.85);
    ctx.lineTo(s * 0.62, -s * 0.05);
    ctx.stroke();
  } else if (icon === "eye") {
    ctx.ellipse(0, 0, s * 0.9, s * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.24, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === "heart") {
    ctx.moveTo(0, s * 0.72);
    ctx.bezierCurveTo(-s * 1.15, -s * 0.05, -s * 0.55, -s * 0.95, 0, -s * 0.38);
    ctx.bezierCurveTo(s * 0.55, -s * 0.95, s * 1.15, -s * 0.05, 0, s * 0.72);
    ctx.closePath();
    ctx.stroke();
  } else if (icon === "gap") {
    ctx.moveTo(-s * 0.85, 0);
    ctx.lineTo(-s * 0.25, 0);
    ctx.moveTo(s * 0.25, 0);
    ctx.lineTo(s * 0.85, 0);
    ctx.stroke();
  } else if (icon === "nova") {
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      ctx.moveTo(Math.cos(angle) * s * 0.5, Math.sin(angle) * s * 0.5);
      ctx.lineTo(Math.cos(angle) * s * 1.05, Math.sin(angle) * s * 1.05);
    }
    ctx.stroke();
  } else if (icon === "prism") {
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(s * 0.7, 0);
    ctx.lineTo(0, s * 0.8);
    ctx.lineTo(-s * 0.7, 0);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawTree() {
  const metrics = treeMetrics();
  const card = detailCard();
  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(22, unit() * 0.055), 500);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Melhorias", state.viewW / 2, backRect().y + 18);
  drawSparkCount(state.viewW - 28, backRect().y + 18, "right");
  drawPill(backRect(), "Voltar", "rgba(190, 248, 255, 0.7)");

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, backRect().y + 44, state.viewW, card.y - backRect().y - 52);
  ctx.clip();

  for (const upgrade of UPGRADES) {
    const child = nodePoint(upgrade, metrics);
    for (const parentId of upgrade.requires) {
      const parent = nodePoint(upgradeById(parentId), metrics);
      const childState = nodeGlow(upgrade, state.owned, state.sparks);
      ctx.strokeStyle = childState === "bright"
        ? "rgba(186, 244, 255, 0.9)"
        : childState === "soft"
          ? "rgba(150, 200, 220, 0.5)"
          : "rgba(70, 84, 96, 0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(child.x, child.y);
      ctx.stroke();
    }
  }

  for (const upgrade of UPGRADES) {
    const box = nodeBox(upgrade, metrics);
    const glow = nodeGlow(upgrade, state.owned, state.sparks);
    const selected = upgrade.id === state.selectedId;
    if (glow === "bright") drawGlow(box.cx, box.cy, box.w * 0.95, 0.85);
    else if (glow === "soft") drawGlow(box.cx, box.cy, box.w * 0.72, 0.28);
    ctx.fillStyle = glow === "dim" ? "#080a10" : "#121820";
    ctx.globalAlpha = glow === "dim" ? 0.72 : 1;
    roundRect(box.x, box.y, box.w, box.h, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = selected ? 3.2 : 1.6;
    ctx.strokeStyle = glow === "bright"
      ? "rgba(244, 254, 255, 0.95)"
      : glow === "soft"
        ? "rgba(186, 230, 244, 0.7)"
        : selected
          ? "rgba(180, 196, 208, 0.45)"
          : "rgba(70, 84, 96, 0.35)";
    ctx.stroke();
    const ink = glow === "bright"
      ? "#f7feff"
      : glow === "soft"
        ? "rgba(214, 236, 244, 0.9)"
        : "rgba(150, 166, 176, 0.32)";
    drawIcon(upgrade.icon, box.cx, box.cy, box.w, ink);
  }
  ctx.restore();

  const selected = upgradeById(state.selectedId) ?? UPGRADES[0];
  const status = nodeState(selected, state.owned);
  ctx.fillStyle = "rgba(8, 10, 18, 0.94)";
  roundRect(card.x, card.y, card.w, card.h, 16);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(18, unit() * 0.045), 600);
  ctx.fillText(selected.name, card.x + 16, card.y + 14);
  ctx.fillStyle = "rgba(210, 226, 236, 0.82)";
  ctx.font = font(Math.max(14, unit() * 0.034), 500);
  ctx.fillText(selected.text, card.x + 16, card.y + 42);
  const buy = buyRect();
  const affordable = canBuy(selected, state.owned, state.sparks);
  const label = status === "owned"
    ? "Comprado"
    : status === "locked"
      ? "Bloqueado"
      : affordable
        ? `Comprar · ${selected.cost}`
        : `Precisa de ${selected.cost}`;
  const accent = status === "owned"
    ? "rgba(186, 244, 255, 0.95)"
    : affordable
      ? "rgba(186, 220, 232, 0.7)"
      : "rgba(90, 104, 116, 0.45)";
  drawPill(buy, label, accent);
}

let lightLayer = null;

function lightLayerContext() {
  if (!lightLayer) lightLayer = document.createElement("canvas");
  const width = Math.max(1, Math.ceil(state.viewW));
  const height = Math.max(1, Math.ceil(state.viewH));
  if (lightLayer.width !== width || lightLayer.height !== height) {
    lightLayer.width = width;
    lightLayer.height = height;
  }
  const layer = lightLayer.getContext("2d");
  layer.setTransform(1, 0, 0, 1, 0, 0);
  layer.globalCompositeOperation = "source-over";
  layer.clearRect(0, 0, width, height);
  return layer;
}

/** A faint letter in the dark, and the same letter caught by the ball's light. */
function drawTextInLight(text, x, y, size, weight, tracking, lightX, lightY, radius, ghost) {
  const face = font(size, weight);
  ctx.save();
  ctx.font = face;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  setLetterSpacing(tracking);
  ctx.fillStyle = `rgba(186, 214, 228, ${ghost})`;
  ctx.fillText(text, x, y);
  ctx.restore();

  const layer = lightLayerContext();
  layer.font = face;
  layer.textAlign = "center";
  layer.textBaseline = "middle";
  if ("letterSpacing" in layer) layer.letterSpacing = `${tracking}px`;
  layer.fillStyle = "#f7feff";
  layer.shadowColor = "rgba(186, 244, 255, 0.95)";
  layer.shadowBlur = size * 0.28;
  layer.fillText(text, x, y);
  layer.shadowBlur = 0;
  layer.globalCompositeOperation = "destination-in";
  const glow = layer.createRadialGradient(lightX, lightY, radius * 0.02, lightX, lightY, radius);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.34, "rgba(255,255,255,1)");
  glow.addColorStop(0.58, "rgba(255,255,255,0.35)");
  glow.addColorStop(0.78, "rgba(255,255,255,0)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  layer.fillStyle = glow;
  layer.fillRect(0, 0, lightLayer.width, lightLayer.height);
  ctx.drawImage(lightLayer, 0, 0);
}

function playRect() {
  return buttonRect(0.48);
}

function upgradesRect() {
  return buttonRect(0.74);
}

function codexRect() {
  return buttonRect(0.86);
}

function drawLightRays(x, y, length) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.time * 0.12);
  ctx.strokeStyle = "rgba(190, 248, 255, 0.22)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    ctx.moveTo(Math.cos(angle) * length * 0.22, Math.sin(angle) * length * 0.22);
    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
  }
  ctx.stroke();
  ctx.restore();
}

function drawLightButton(rect, label) {
  const breath = 0.72 + Math.sin(state.time * 1.8) * 0.28;
  ctx.save();
  ctx.shadowColor = "rgba(126, 249, 255, 0.9)";
  ctx.shadowBlur = 18;
  const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  fill.addColorStop(0, `rgba(232, 254, 255, ${0.34 + breath * 0.18})`);
  fill.addColorStop(0.55, "rgba(126, 220, 245, 0.16)");
  fill.addColorStop(1, "rgba(40, 110, 170, 0.08)");
  ctx.fillStyle = fill;
  roundRect(rect.x, rect.y, rect.w, rect.h, rect.h / 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(244, 254, 255, ${0.75 + breath * 0.25})`;
  ctx.lineWidth = 1.75;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f7feff";
  ctx.font = font(Math.max(18, unit() * 0.046), 500);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

function drawMenu() {
  const pulse = 0.94 + Math.sin(state.time * 1.6) * 0.06;
  const x = state.viewW / 2;
  const titleSize = Math.max(48, unit() * 0.135);
  const core = unit() * CORE_FRAC * 1.2;
  const titleY = state.viewH * 0.24;
  const y = titleY + titleSize * 0.95;
  const radius = unit() * 0.4 * pulse;

  drawGlow(x, y, radius * 1.25, 0.42);
  drawGlow(x, y, radius * 0.72, 1);
  drawLightRays(x, y, radius * 0.62);
  drawTextInLight(
    "LUMINA",
    x,
    titleY,
    titleSize,
    100,
    Math.round(titleSize * 0.22),
    x,
    y,
    radius * 0.95,
    0.16,
  );
  ctx.save();
  ctx.strokeStyle = "rgba(214, 252, 255, 0.45)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(x, y, core * 3.4 + Math.sin(state.time * 2.1) * 1.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawCore(x, y, core);

  const play = playRect();
  drawLightButton(play, "Jogar");

  const button = upgradesRect();
  const sparkY = button.y - Math.max(36, unit() * 0.09);
  const recordY = sparkY - Math.max(28, unit() * 0.07);
  if (!state.hintSeen && recordY - (play.y + play.h) > 48) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(214, 232, 240, 0.82)";
    ctx.font = font(Math.max(15, unit() * 0.038), 500);
    ctx.fillText("A luz também é a vida", x, play.y + play.h + (recordY - play.y - play.h) * 0.45);
    ctx.restore();
  }
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(210, 226, 236, 0.72)";
  ctx.font = font(Math.max(14, unit() * 0.036), 500);
  ctx.fillText(state.highScore > 0 ? `Recorde ${state.highScore}` : "Recorde 0", x, recordY);
  ctx.restore();
  drawSparkCount(x, sparkY, "center");
  drawPill(button, "Melhorias", "rgba(255, 214, 120, 0.9)");
  drawPill(codexRect(), "Codex", "rgba(190, 248, 255, 0.75)");
  drawSettingsButton();
}

function roundRect(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGameOver() {
  const x = state.viewW / 2;
  ctx.fillStyle = "rgba(5, 6, 15, 0.72)";
  ctx.fillRect(0, 0, state.viewW, state.viewH);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 255, 255, 0.66)";
  ctx.font = font(Math.max(16, unit() * 0.04), 500);
  ctx.fillText("A luz se apagou", x, state.viewH * 0.3);

  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(64, unit() * 0.18), 600);
  ctx.fillText(String(state.score), x, state.viewH * 0.42);

  ctx.fillStyle = "rgba(190, 248, 255, 0.84)";
  ctx.font = font(Math.max(16, unit() * 0.042), 500);
  ctx.fillText(`Recorde ${state.highScore}`, x, state.viewH * 0.5);
  drawSparkCount(x - 8, state.viewH * 0.545, "right");

  const button = buttonRect(0.58);
  ctx.save();
  ctx.strokeStyle = "rgba(126, 249, 255, 0.95)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(126, 249, 255, 0.55)";
  ctx.shadowBlur = 14;
  roundRect(button.x, button.y, button.w, button.h, button.h / 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#e9fdff";
  ctx.font = font(Math.max(16, unit() * 0.04), 600);
  ctx.fillText("Jogar novamente", x, button.y + button.h / 2);
  drawPill(buttonRect(0.7), "Melhorias", "rgba(255, 214, 120, 0.9)");
  drawSettingsButton();
}

function drawSettingsButton() {
  drawPill(settingsRect(), "Ajustes", "rgba(190, 248, 255, 0.7)", state.mode !== "play" && state.mode !== "paused");
}

function sliderTrack(which) {
  const w = Math.min(state.viewW * 0.78, 340);
  const y = which === "music" ? state.viewH * 0.36 : state.viewH * 0.52;
  return { x: (state.viewW - w) / 2, y, w, h: 44 };
}

function setSlider(which, x) {
  const rect = sliderTrack(which);
  const value = clamp((x - rect.x) / rect.w, 0, 1);
  if (which === "music") setMusicVolume(value);
  else setSfxVolume(value);
}

function tutorialButtonRect() {
  return buttonRect(0.66);
}

function eraseRect() {
  return buttonRect(0.8);
}

function confirmCard() {
  const w = Math.min(state.viewW - 40, 340);
  const h = 220;
  return { x: (state.viewW - w) / 2, y: state.viewH * 0.3, w, h };
}

function confirmButtons() {
  const card = confirmCard();
  const gap = 12;
  const w = (card.w - 36 - gap) / 2;
  const y = card.y + card.h - 58;
  return {
    erase: { x: card.x + 18, y, w, h: 44 },
    cancel: { x: card.x + 18 + w + gap, y, w, h: 44 },
  };
}

function eraseProgress() {
  state.sparks = 0;
  state.owned = new Set();
  invalidatePerks();
  state.highScore = 0;
  state.hintSeen = false;
  state.tutorialSeen = false;
  state.selectedId = "centelha";
  try {
    localStorage.removeItem(SPARKS_KEY);
    localStorage.removeItem(UPGRADES_KEY);
    localStorage.removeItem(HIGH_SCORE_KEY);
    localStorage.removeItem(HINT_KEY);
    localStorage.removeItem(TUTORIAL_KEY);
  } catch {
    /* The memory copy is already empty. */
  }
  state.confirmErase = false;
  announce("Dados apagados.");
}

function onSettingsDown(x, y) {
  if (state.confirmErase) {
    const buttons = confirmButtons();
    if (insideRect(x, y, buttons.erase)) {
      eraseProgress();
      playTap();
    } else if (insideRect(x, y, buttons.cancel) || !insideRect(x, y, confirmCard())) {
      state.confirmErase = false;
      playTap();
    }
    return;
  }
  if (insideRect(x, y, backRect())) {
    closeSettings();
    return;
  }
  if (insideRect(x, y, tutorialButtonRect())) {
    playTap();
    openTutorial("settings");
    return;
  }
  if (insideRect(x, y, eraseRect())) {
    state.confirmErase = true;
    playTap();
    announce("Confirmar para apagar os dados.");
    return;
  }
  if (insideRect(x, y, sliderTrack("music"))) {
    state.dragSlider = "music";
    setSlider("music", x);
    return;
  }
  if (insideRect(x, y, sliderTrack("sfx"))) {
    state.dragSlider = "sfx";
    setSlider("sfx", x);
  }
}

function drawSlider(which, label) {
  const rect = sliderTrack(which);
  const value = which === "music" ? getMusicVolume() : getSfxVolume();
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(16, unit() * 0.04), 600);
  ctx.fillText(label, rect.x, rect.y - 18);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(210, 226, 236, 0.8)";
  ctx.fillText(`${Math.round(value * 100)}%`, rect.x + rect.w, rect.y - 18);
  const trackY = rect.y + rect.h / 2;
  ctx.lineCap = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(120, 150, 168, 0.45)";
  ctx.beginPath();
  ctx.moveTo(rect.x, trackY);
  ctx.lineTo(rect.x + rect.w, trackY);
  ctx.stroke();
  ctx.strokeStyle = value > 0.02 ? "rgba(186, 244, 255, 0.95)" : "rgba(120, 150, 168, 0.45)";
  ctx.beginPath();
  ctx.moveTo(rect.x, trackY);
  ctx.lineTo(rect.x + rect.w * value, trackY);
  ctx.stroke();
  ctx.fillStyle = "#f7feff";
  ctx.shadowColor = "rgba(126, 249, 255, 0.85)";
  ctx.shadowBlur = value > 0.02 ? 14 : 0;
  ctx.beginPath();
  ctx.arc(rect.x + rect.w * value, trackY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawConfirmErase() {
  ctx.fillStyle = "rgba(4, 6, 12, 0.84)";
  ctx.fillRect(0, 0, state.viewW, state.viewH);
  const card = confirmCard();
  ctx.fillStyle = "#0c1018";
  roundRect(card.x, card.y, card.w, card.h, 18);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(20, unit() * 0.05), 600);
  ctx.fillText("Apagar tudo?", state.viewW / 2, card.y + 46);
  ctx.fillStyle = "rgba(210, 226, 236, 0.82)";
  ctx.font = font(Math.max(14, unit() * 0.034), 500);
  ctx.fillText("Recorde, faíscas e melhorias", state.viewW / 2, card.y + 90);
  ctx.fillText("somem deste aparelho.", state.viewW / 2, card.y + 114);
  const buttons = confirmButtons();
  drawPill(buttons.erase, "Apagar", "rgba(255, 96, 110, 0.9)");
  drawPill(buttons.cancel, "Cancelar", "rgba(190, 248, 255, 0.75)");
}

function drawSettings() {
  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(22, unit() * 0.055), 500);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Ajustes", state.viewW / 2, backRect().y + 18);
  drawPill(backRect(), "Voltar", "rgba(190, 248, 255, 0.7)");
  drawSlider("music", "Música");
  drawSlider("sfx", "Efeitos");
  drawPill(tutorialButtonRect(), "Como jogar", "rgba(190, 248, 255, 0.85)");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(210, 226, 236, 0.55)";
  ctx.font = font(Math.max(13, unit() * 0.032), 500);
  ctx.fillText("Apaga recorde, faíscas e melhorias.", state.viewW / 2, eraseRect().y - 26);
  drawPill(eraseRect(), "Apagar dados", "rgba(255, 120, 130, 0.5)");
  if (state.confirmErase) drawConfirmErase();
}

function drawPlayerGlow() {
  const player = state.player;
  drawGlow(player.x, player.y, player.lightRadius, state.mode === "play" ? 1 : 0.35);
}

let dustLayerCanvas = null;
let dustLayerKey = "";

/** Dim specks in world space, behind the light, so the zoom has something to reveal. */
function drawFieldDust() {
  const width = state.viewW * BLOOM_SPAN;
  const height = state.viewH * BLOOM_SPAN;
  const key = `${Math.ceil(width)}x${Math.ceil(height)}`;
  if (!dustLayerCanvas || dustLayerKey !== key) {
    const layer = document.createElement("canvas");
    layer.width = Math.max(1, Math.ceil(width));
    layer.height = Math.max(1, Math.ceil(height));
    const g = layer.getContext("2d");
    const { specks, motes, rings } = fieldDust(width, height);
    for (const mote of motes) {
      const gradient = g.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.r);
      gradient.addColorStop(0, `rgba(168, 198, 220, ${mote.alpha})`);
      gradient.addColorStop(1, "rgba(168, 198, 220, 0)");
      g.fillStyle = gradient;
      g.beginPath();
      g.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
      g.fill();
    }
    g.lineWidth = Math.max(0.8, unit() * 0.004);
    for (const ring of rings) {
      g.beginPath();
      g.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      g.strokeStyle = `rgba(154, 186, 210, ${ring.alpha})`;
      g.stroke();
    }
    for (const speck of specks) {
      g.fillStyle = `rgba(198, 220, 236, ${speck.alpha})`;
      g.beginPath();
      g.arc(speck.x, speck.y, speck.r, 0, Math.PI * 2);
      g.fill();
    }
    dustLayerCanvas = layer;
    dustLayerKey = key;
  }
  ctx.drawImage(dustLayerCanvas, 0, 0, width, height);
}

function drawBloom() {
  if (!state.opened || state.surgeLeft <= 0 || !state.player) return;
  const t = bloomEase(BLOOM_SECONDS - state.surgeLeft);
  const player = state.player;
  const reach = Math.hypot(fieldW(), fieldH()) * 0.62;
  const radius = player.lightRadius + (reach - player.lightRadius) * t;
  drawGlow(player.x, player.y, radius, 0.95 * (1 - t));
}

function drawFlash() {
  if (state.flash <= 0) return;
  ctx.fillStyle = `rgba(244, 254, 255, ${state.flash * 0.62})`;
  ctx.fillRect(0, 0, state.viewW, state.viewH);
}

function tutorialPhotoRect() {
  const nav = tutorialNav();
  const top = Math.max(86, state.safeTop + 78);
  const w = Math.min(state.viewW - 48, 360);
  const room = nav.back.y - 112 - top;
  const h = Math.max(120, Math.min(room, w * 1.08, state.viewH * 0.42));
  return { x: (state.viewW - w) / 2, y: top, w, h };
}

function tutorialNav() {
  const gap = 12;
  const w = Math.min(156, (state.viewW - 48 - gap) / 2);
  const h = Math.max(48, unit() * 0.08);
  const y = state.viewH - h - Math.max(24, state.viewH * 0.05);
  const x = (state.viewW - (w * 2 + gap)) / 2;
  return {
    back: { x, y, w, h },
    next: { x: x + w + gap, y, w, h },
  };
}

function tutorialStandIn(x, y, light, core) {
  return {
    x,
    y,
    targetX: x,
    coreRadius: core,
    lightRadius: light,
    targetLight: light,
    initialLight: light,
  };
}

function tutorialEnemy(kind, tint, x, y, r) {
  return { kind, tint, x, y, r, homeX: x, phase: 0.6 };
}

function withPlayer(player, drawScene) {
  const previous = state.player;
  state.player = player;
  drawScene();
  state.player = previous;
}

function drawTutorialScene(page, photo) {
  const ballY = photo.y + photo.h * 0.78;
  const core = Math.min(photo.w, photo.h) * 0.05;
  const light = Math.min(photo.w, photo.h) * 0.3;
  const mid = photo.x + photo.w / 2;

  ctx.save();
  roundRect(photo.x, photo.y, photo.w, photo.h, 22);
  ctx.clip();
  ctx.fillStyle = "#04060c";
  ctx.fillRect(photo.x, photo.y, photo.w, photo.h);
  const wash = ctx.createRadialGradient(mid, photo.y + photo.h * 0.7, 8, mid, photo.y + photo.h * 0.55, photo.h * 0.7);
  wash.addColorStop(0, "#10182a");
  wash.addColorStop(1, "#04060c");
  ctx.fillStyle = wash;
  ctx.fillRect(photo.x, photo.y, photo.w, photo.h);
  ctx.fillStyle = "rgba(198, 220, 236, 0.16)";
  for (const [px, py] of [[0.18, 0.16], [0.74, 0.22], [0.42, 0.36], [0.86, 0.58], [0.22, 0.64], [0.6, 0.48]]) {
    ctx.beginPath();
    ctx.arc(photo.x + photo.w * px, photo.y + photo.h * py, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  if (page === 0) {
    const sway = Math.sin(state.time * 1.5);
    const ballX = mid + sway * photo.w * 0.2;
    const fingerY = photo.y + photo.h * 0.4;
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = "rgba(190, 248, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(photo.x + photo.w * 0.16, fingerY);
    ctx.lineTo(photo.x + photo.w * 0.84, fingerY);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(244, 254, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(mid + sway * photo.w * 0.26, fingerY, 11, 0, Math.PI * 2);
    ctx.fill();
    withPlayer(tutorialStandIn(ballX, ballY, light, core), () => {
      drawGlow(ballX, ballY, light, 1);
      drawCore(ballX, ballY, core);
    });
  } else if (page === 1) {
    const ballX = mid;
    const near = tutorialEnemy("diamond", "violet", mid, photo.y + photo.h * 0.52, photo.h * 0.1);
    const far = tutorialEnemy("shard", "teal", photo.x + photo.w * 0.78, photo.y + photo.h * 0.16, photo.h * 0.07);
    withPlayer(tutorialStandIn(ballX, ballY, light * 0.85, core), () => {
      drawGlow(ballX, ballY, light * 0.85, 1);
      drawEnemy(far);
      drawEnemy(near);
      drawCore(ballX, ballY, core);
    });
  } else if (page === 2) {
    const ballX = mid - photo.w * 0.08;
    const passer = tutorialEnemy("orb", "rose", mid + photo.w * 0.16, ballY - light * 0.35, photo.h * 0.09);
    withPlayer(tutorialStandIn(ballX, ballY, light, core), () => {
      drawGlow(ballX, ballY, light, 1);
      drawEnemy(passer);
      drawSparkGlyph(photo.x + photo.w * 0.22, photo.y + photo.h * 0.34, photo.h * 0.028);
      drawCore(ballX, ballY, core);
    });
    ctx.fillStyle = "#ffe2a4";
    ctx.font = font(Math.max(18, photo.h * 0.07), 700);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+2", passer.x, passer.y - passer.r - 16);
  } else {
    const ballX = mid + photo.w * 0.06;
    const left = tutorialEnemy("lantern", "copper", photo.x + photo.w * 0.2, photo.y + photo.h * 0.28, photo.h * 0.09);
    const right = tutorialEnemy("grin", "blue", photo.x + photo.w * 0.74, photo.y + photo.h * 0.28, photo.h * 0.09);
    withPlayer(tutorialStandIn(ballX, ballY, light * 0.72, core), () => {
      drawGlow(ballX, ballY, light * 0.72, 1);
      drawEnemy(left);
      drawEnemy(right);
      drawCore(ballX, ballY, core);
    });
  }

  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(186, 214, 228, 0.35)";
  ctx.lineWidth = 1.5;
  roundRect(photo.x, photo.y, photo.w, photo.h, 22);
  ctx.stroke();
  ctx.restore();
}

function onTutorialDown(x, y) {
  const buttons = tutorialNav();
  if (insideRect(x, y, buttons.back)) stepTutorial(-1);
  else if (insideRect(x, y, buttons.next)) stepTutorial(1);
}

function codexFrame() {
  const nav = tutorialNav();
  const top = Math.max(86, state.safeTop + 78);
  const w = Math.min(state.viewW - 48, 360);
  const room = nav.back.y - 120 - top;
  const h = Math.max(150, Math.min(room, w * 1.05, state.viewH * 0.42));
  return { x: (state.viewW - w) / 2, y: top, w, h };
}

function drawMantlePreview(frame) {
  const mid = frame.x + frame.w / 2;
  const top = frame.y + frame.h * 0.16;
  const rx = frame.w * 0.34;
  const ry = frame.h * 0.055;
  ctx.fillStyle = "#05070f";
  ctx.beginPath();
  ctx.ellipse(mid, top, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(188, 150, 255, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(mid, top, rx * 0.96, ry * 0.9, 0, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = "rgba(247, 254, 255, 0.9)";
  ctx.beginPath();
  ctx.ellipse(mid, top, ry * 0.7, ry * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  const shift = (state.time % 3.2) / 3.2;
  const r = frame.w * 0.04;
  const lanes = [-0.28, 0, 0.28];
  const opens = [0, 1, 2];
  for (let row = 0; row < opens.length; row += 1) {
    const y = frame.y + frame.h * (0.7 - row * 0.18) + shift * frame.h * 0.02;
    for (let lane = 0; lane < lanes.length; lane += 1) {
      const x = mid + frame.w * lanes[lane];
      if (lane === opens[row] && row === opens.length - 1) drawBossCore({ x, y, r: r * 0.62 });
      else if (lane !== opens[row]) {
        drawEnemy({ kind: "orb", tint: "violet", x, y, r, phase: row + lane });
      }
    }
  }
}

function ensureCodexEnemy() {
  const page = CODEX[state.codexPage];
  if (page.kind === "mantle") {
    state.codexEnemy = { kind: "mantle" };
    return state.codexEnemy;
  }
  const frame = codexFrame();
  const enemy = state.codexEnemy;
  if (enemy && enemy.kind === page.kind) return enemy;
  const next = {
    kind: page.kind,
    tint: page.tint,
    x: frame.x + frame.w / 2,
    y: frame.y - frame.h * 0.04,
    r: Math.min(frame.w, frame.h) * 0.16,
    homeX: frame.x + frame.w / 2,
    phase: 0.4,
    fall: 1,
    drift: 1,
    commit: frame.y + frame.h * 0.42,
  };
  state.codexEnemy = next;
  return next;
}

function stepCodex(dt) {
  if (CODEX[state.codexPage].kind === "mantle") {
    state.codexEnemy = { kind: "mantle" };
    return;
  }
  const frame = codexFrame();
  const enemy = ensureCodexEnemy();
  enemyStep(enemy, dt, frame.h * 0.28, state.time, frame.x + frame.w, frame.x);
  if (enemy.y - enemy.r > frame.y + frame.h) {
    enemy.y = frame.y - enemy.r;
    if (enemy.kind !== "diamond") enemy.x = enemy.homeX;
  }
}

function onCodexDown(x, y) {
  const buttons = tutorialNav();
  if (insideRect(x, y, buttons.back)) stepCodexPage(-1);
  else if (insideRect(x, y, buttons.next)) stepCodexPage(1);
}

function drawCodex() {
  const page = CODEX[state.codexPage];
  const frame = codexFrame();
  const enemy = ensureCodexEnemy();
  const x = state.viewW / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(190, 248, 255, 0.62)";
  ctx.font = font(Math.max(13, unit() * 0.032), 500);
  ctx.fillText("Codex", x, Math.max(22, state.safeTop + 16));
  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(26, unit() * 0.064), 500);
  ctx.fillText(page.title, x, frame.y - 30);

  ctx.save();
  roundRect(frame.x, frame.y, frame.w, frame.h, 22);
  ctx.clip();
  const mantle = page.kind === "mantle";
  const ballX = mantle ? frame.x + frame.w * 0.22 : frame.x + frame.w / 2;
  const ballY = frame.y + frame.h * (mantle ? 0.88 : 0.78);
  const core = Math.min(frame.w, frame.h) * 0.05;
  const light = Math.min(frame.w, frame.h) * (mantle ? 0.16 : 0.34);
  withPlayer(tutorialStandIn(ballX, ballY, light, core), () => {
    frameRim = 0.72;
    drawGlow(ballX, ballY, light, 1);
    if (page.kind === "mantle") drawMantlePreview(frame);
    else drawEnemy(enemy);
    drawCore(ballX, ballY, core);
  });
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(186, 214, 228, 0.35)";
  ctx.lineWidth = 1.5;
  roundRect(frame.x, frame.y, frame.w, frame.h, 22);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(214, 232, 240, 0.88)";
  ctx.font = font(Math.max(16, unit() * 0.04), 500);
  page.lines.forEach((line, index) => {
    ctx.fillText(line, x, frame.y + frame.h + 28 + index * 26);
  });
  const dotsY = frame.y + frame.h + 88;
  for (let i = 0; i < CODEX.length; i += 1) {
    const dx = x + (i - (CODEX.length - 1) / 2) * 16;
    ctx.beginPath();
    ctx.arc(dx, dotsY, i === state.codexPage ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = i === state.codexPage ? "#f4feff" : "rgba(186, 214, 228, 0.35)";
    ctx.fill();
  }
  const buttons = tutorialNav();
  drawPill(buttons.back, state.codexPage === 0 ? "Voltar" : "Anterior", "rgba(190, 248, 255, 0.55)");
  const last = state.codexPage === CODEX.length - 1;
  drawPill(buttons.next, last ? "Fechar" : "Próximo", "rgba(126, 249, 255, 0.95)");
}

function drawTutorial() {
  const page = TUTORIAL_PAGES[state.tutorialPage];
  const photo = tutorialPhotoRect();
  const x = state.viewW / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(190, 248, 255, 0.62)";
  ctx.font = font(Math.max(13, unit() * 0.032), 500);
  ctx.fillText("Como jogar", x, Math.max(22, state.safeTop + 16));
  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(26, unit() * 0.064), 500);
  ctx.fillText(page.title, x, photo.y - 30);
  drawTutorialScene(state.tutorialPage, photo);
  ctx.fillStyle = "rgba(214, 232, 240, 0.88)";
  ctx.font = font(Math.max(16, unit() * 0.04), 500);
  page.lines.forEach((line, index) => {
    ctx.fillText(line, x, photo.y + photo.h + 32 + index * 26);
  });
  const dotsY = photo.y + photo.h + 96;
  for (let i = 0; i < TUTORIAL_PAGES.length; i += 1) {
    const dx = x + (i - (TUTORIAL_PAGES.length - 1) / 2) * 16;
    ctx.beginPath();
    ctx.arc(dx, dotsY, i === state.tutorialPage ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = i === state.tutorialPage ? "#f4feff" : "rgba(186, 214, 228, 0.35)";
    ctx.fill();
  }
  const buttons = tutorialNav();
  const leaving = state.tutorialReturn === "settings" ? "Fechar" : "Pular";
  drawPill(buttons.back, state.tutorialPage === 0 ? leaving : "Anterior", "rgba(190, 248, 255, 0.55)");
  const last = state.tutorialPage === TUTORIAL_PAGES.length - 1;
  drawPill(buttons.next, last ? "Entendi" : "Próximo", "rgba(126, 249, 255, 0.95)");
}

function draw() {
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawBackground();

  ctx.save();
  ctx.beginPath();
  ctx.rect(state.offsetX, state.offsetY, state.viewW, state.viewH);
  ctx.clip();
  ctx.translate(state.offsetX, state.offsetY);

  if (state.shake > 0) {
    const magnitude = 14 * state.shake * state.shake;
    ctx.translate((Math.random() - 0.5) * magnitude * 2, (Math.random() - 0.5) * magnitude * 2);
  }

  if (state.mode === "menu") {
    drawMenu();
  } else if (state.mode === "tutorial") {
    drawTutorial();
  } else if (state.mode === "codex") {
    drawCodex();
  } else if (state.mode === "settings") {
    drawSettings();
  } else if (state.mode === "tree") {
    drawTree();
  } else {
    ctx.save();
    ctx.scale(1 / state.span, 1 / state.span);
    frameRim = perks().rim;
    drawFieldDust();
    drawBloom();
    drawPlayerGlow();
    if (state.mode === "play" || state.mode === "paused") {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (const enemy of state.enemies) drawEnemy(enemy);
      for (const orb of state.orbs) {
        if (orb.core) drawBossCore(orb);
        else if (orb.nova) drawNovaGlyph(orb.x, orb.y, orb.r);
        else drawSparkGlyph(orb.x, orb.y, orb.r);
      }
      if (state.boss) drawBoss();
    }
    drawParticles();
    for (const floater of state.floaters) {
      const fade = 1 - floater.age / floater.life;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = "#ffe2a4";
      ctx.font = font(Math.max(16, unit() * 0.04), 700);
      ctx.textAlign = "center";
      ctx.fillText(floater.text, floater.x, floater.y);
      ctx.globalAlpha = 1;
    }
    if (state.player.lightRadius > 2) {
      drawCore(state.player.x, state.player.y, shownCoreRadius(state.player));
      if (state.shielded) {
        const ring = shownCoreRadius(state.player) + unit() * 0.03;
        ctx.strokeStyle = "rgba(186, 244, 255, 0.9)";
        ctx.lineWidth = Math.max(2, unit() * 0.006);
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, ring, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    drawFlash();
    if (state.mode === "play" || state.mode === "paused") {
      drawScore();
      drawSparkCount(18, Math.max(18, state.safeTop + 18));
      if (state.mode === "paused") drawPaused();
      drawSettingsButton();
    } else drawGameOver();
  }

  ctx.restore();
}

function drawPaused() {
  ctx.fillStyle = "rgba(4, 6, 12, 0.5)";
  ctx.fillRect(0, 0, state.viewW, state.viewH);
  const x = state.viewW / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(28, unit() * 0.07), 500);
  ctx.fillText("Pausado", x, state.viewH * 0.42);
  ctx.fillStyle = "rgba(210, 226, 236, 0.82)";
  ctx.font = font(Math.max(16, unit() * 0.04), 500);
  ctx.fillText("Toque para continuar", x, state.viewH * 0.5);
}

function leaveScreen() {
  setForeground(false);
  pauseRun();
}

function returnScreen() {
  setForeground(true);
}

function frame(now) {
  if (document.hidden) {
    setForeground(false);
    if (state.mode === "play") pauseRun();
  }
  const dt = Math.min(MAX_DT, (now - state.last) / 1000);
  state.last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

layout();
document.fonts?.load('100 64px "Lumina Sans"');
document.fonts?.load('500 28px "Lumina Sans"');
document.fonts?.load('700 64px "Lumina Sans"');
if (!state.tutorialSeen) openTutorial("menu");
else announce(menuLine());
initAds();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") leaveScreen();
  else returnScreen();
});
window.addEventListener("pagehide", leaveScreen);
window.addEventListener("pageshow", returnScreen);
window.addEventListener("blur", leaveScreen);
window.addEventListener("focus", returnScreen);

function watchNativeApp() {
  const cap = globalThis.Capacitor;
  if (!cap?.isNativePlatform?.() || !cap.registerPlugin) return;
  try {
    const app = cap.registerPlugin("App");
    app.addListener?.("appStateChange", ({ isActive }) => {
      if (isActive) returnScreen();
      else leaveScreen();
    });
  } catch {
    /* The page events already cut the sound. */
  }
}

watchNativeApp();
state.last = performance.now();
requestAnimationFrame(frame);
