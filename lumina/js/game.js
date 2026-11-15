import {
  applyDamage,
  clamp,
  diamondPoints,
  difficultyAt,
  edgeFacing,
  enemyHitsPlayerSweep,
  lerp,
} from "./math.js";

const HIGH_SCORE_KEY = "lumina-high-score";
const PORTRAIT = 9 / 16;
const PLAYER_Y = 0.82;
const CORE_FRAC = 0.028;
const LIGHT_FRAC = 0.22;
const TINTS = {
  rose: [255, 72, 112],
  violet: [188, 112, 255],
};
const FOLLOW = 14;
const LIGHT_LERP = 4.2;
const SHAKE_DECAY = 2.1;
const MAX_DT = 0.05;

const canvas = document.querySelector("#game");
const statusEl = document.querySelector("#status");
const satProbe = document.querySelector("#sat");
const ctx = canvas.getContext("2d");

const state = {
  mode: "menu",
  time: 0,
  elapsed: 0,
  score: 0,
  highScore: loadHighScore(),
  spawnTimer: 0,
  shake: 0,
  dying: false,
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
  particles: [],
  pointerId: null,
  announced: "",
};

function loadHighScore() {
  try {
    const value = Number(localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
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

/** The bright core shrinks with the remaining light so a hit is obvious. */
function shownCoreRadius(player) {
  const health = clamp(player.lightRadius / Math.max(1, player.initialLight), 0, 1);
  return player.coreRadius * (0.42 + 0.58 * health);
}

function makePlayer(x) {
  const core = unit() * CORE_FRAC;
  const light = unit() * LIGHT_FRAC;
  const clamped = clamp(x, core, Math.max(core, state.viewW - core));
  return {
    x: clamped,
    y: state.viewH * PLAYER_Y,
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
  state.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
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
  player.y = state.viewH * PLAYER_Y;
  player.coreRadius = unit() * CORE_FRAC;
  player.x = clamp(player.x, player.coreRadius, state.viewW - player.coreRadius);
  player.targetX = clamp(player.targetX, player.coreRadius, state.viewW - player.coreRadius);

  for (const enemy of state.enemies) {
    enemy.x *= sx;
    enemy.y *= sy;
    enemy.r *= sy;
  }
  for (const particle of state.particles) {
    particle.x *= sx;
    particle.y *= sy;
    particle.vx *= sx;
    particle.vy *= sy;
    particle.radius *= sy;
  }
}

function announce(text) {
  if (!statusEl || state.announced === text) return;
  state.announced = text;
  statusEl.textContent = text;
}

function resetRun(pointerX) {
  state.player = makePlayer(Number.isFinite(pointerX) ? pointerX : state.viewW / 2);
  state.enemies = [];
  state.particles = [];
  state.score = 0;
  state.elapsed = 0;
  state.spawnTimer = 0.45;
  state.shake = 0;
  state.dying = false;
  state.mode = "play";
  announce("Pontos 0");
}

function endRun() {
  saveHighScore(state.score);
  state.mode = "over";
  state.dying = false;
  state.pointerId = null;
  announce(`Fim de jogo. Pontos ${state.score}. Recorde ${state.highScore}.`);
}

function spawnEnemy() {
  const diamond = Math.random() >= 0.55;
  const r = clamp(
    state.viewH * (0.038 + Math.random() * 0.022),
    16,
    state.viewW * 0.16,
  );
  const margin = r + 6;
  const span = Math.max(1, state.viewW - margin * 2);
  let x = margin + Math.random() * span;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const crowded = state.enemies.some(
      (other) => other.y < r * 3 && Math.abs(other.x - x) < r + other.r,
    );
    if (!crowded) break;
    x = margin + Math.random() * span;
  }
  state.enemies.push({
    kind: diamond ? "diamond" : "orb",
    tint: diamond ? "violet" : "rose",
    x,
    y: -r - 6,
    r,
  });
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
  player.targetLight = applyDamage(player.targetLight, player.initialLight);
  state.shake = 1;
  burst(hit.x, hit.y);
  if (player.targetLight === 0) state.dying = true;
}

function update(dt) {
  state.time += dt;
  const player = state.player;
  player.y = state.viewH * PLAYER_Y;
  player.coreRadius = unit() * CORE_FRAC;

  if (state.mode === "play") {
    player.x = lerp(player.x, player.targetX, FOLLOW, dt);
    player.x = clamp(player.x, player.coreRadius, state.viewW - player.coreRadius);

    if (!state.dying) {
      state.elapsed += dt;
      const { speed, interval } = difficultyAt(state.elapsed, state.viewH);
      state.spawnTimer -= dt;
      let spawned = 0;
      while (state.spawnTimer <= 0 && spawned < 3) {
        spawnEnemy();
        state.spawnTimer += interval;
        spawned += 1;
      }

      for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = state.enemies[i];
        const previousY = enemy.y;
        enemy.y += speed * dt;
        const body = { ...player, coreRadius: shownCoreRadius(player) };
        if (!state.dying && enemyHitsPlayerSweep(body, enemy, previousY)) {
          const struck = state.enemies.splice(i, 1)[0];
          hurt(struck);
          continue;
        }
        if (enemy.y - enemy.r > state.viewH) {
          state.enemies.splice(i, 1);
          if (!state.dying) {
            state.score += 1;
            announce(`Pontos ${state.score}`);
          }
        }
      }
    }

    player.lightRadius = lerp(player.lightRadius, player.targetLight, LIGHT_LERP, dt);
    if (state.dying && player.lightRadius < 1.5) endRun();
  }

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
}

function playfieldPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * state.width - state.offsetX,
    y: ((clientY - rect.top) / rect.height) * state.height - state.offsetY,
  };
}

function buttonRect() {
  const w = Math.min(state.viewW * 0.74, 320);
  const h = Math.max(56, unit() * 0.1);
  return {
    x: (state.viewW - w) / 2,
    y: state.viewH * 0.62,
    w,
    h,
  };
}

function insideButton(x, y) {
  const button = buttonRect();
  return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h;
}

function aim(x) {
  const core = state.player.coreRadius;
  state.player.targetX = clamp(x, core, state.viewW - core);
}

function capturePointer(event) {
  state.pointerId = event.pointerId;
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    /* The pointer can end before capture. Aiming still follows the last point. */
  }
}

function onPointerDown(event) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  const point = playfieldPoint(event.clientX, event.clientY);
  if (state.mode === "menu") {
    resetRun(point.x);
    capturePointer(event);
    return;
  }
  if (state.mode === "over") {
    if (!insideButton(point.x, point.y)) return;
    resetRun(point.x);
    capturePointer(event);
    return;
  }
  capturePointer(event);
  aim(point.x);
}

function onPointerMove(event) {
  if (state.mode !== "play" || state.pointerId !== event.pointerId) return;
  aim(playfieldPoint(event.clientX, event.clientY).x);
}

function onPointerUp(event) {
  if (state.pointerId === event.pointerId) state.pointerId = null;
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
  return `${weight} ${Math.round(size)}px "Segoe UI", system-ui, sans-serif`;
}

function setLetterSpacing(px) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
}

function drawBackground() {
  ctx.fillStyle = "#04060c";
  ctx.fillRect(0, 0, state.width, state.height);
  const gradient = ctx.createRadialGradient(
    state.offsetX + state.viewW / 2,
    state.offsetY + state.viewH * 0.35,
    state.viewH * 0.02,
    state.offsetX + state.viewW / 2,
    state.offsetY + state.viewH * 0.55,
    state.viewH * 0.8,
  );
  gradient.addColorStop(0, "#0c1222");
  gradient.addColorStop(1, "#04060c");
  ctx.fillStyle = gradient;
  ctx.fillRect(state.offsetX, state.offsetY, state.viewW, state.viewH);
}

function drawGlow(x, y, radius, alpha) {
  if (radius <= 0.5) return;
  const gradient = ctx.createRadialGradient(x, y, radius * 0.04, x, y, radius);
  gradient.addColorStop(0, `rgba(244, 254, 255, ${0.92 * alpha})`);
  gradient.addColorStop(0.22, `rgba(126, 249, 255, ${0.62 * alpha})`);
  gradient.addColorStop(0.55, `rgba(70, 190, 255, ${0.28 * alpha})`);
  gradient.addColorStop(0.82, `rgba(50, 140, 210, ${0.08 * alpha})`);
  gradient.addColorStop(1, "rgba(40, 110, 180, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCore(x, y, radius) {
  ctx.fillStyle = "#f7feff";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function traceEnemy(enemy) {
  ctx.beginPath();
  if (enemy.kind === "diamond") {
    const points = diamondPoints(enemy.x, enemy.y, enemy.r);
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    return;
  }
  ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
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

function drawLitDiamond(enemy, color, beam) {
  const player = state.player;
  const points = diamondPoints(enemy.x, enemy.y, enemy.r);
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const facing = edgeFacing(a.x, a.y, b.x, b.y, enemy.x, enemy.y, player.x, player.y);
    if (facing <= 0.04) continue;
    const amount = Math.min(1, facing * (0.35 + beam * 0.9));
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const face = ctx.createLinearGradient(midX, midY, enemy.x, enemy.y);
    face.addColorStop(0, `rgba(244, 254, 255, ${0.95 * amount})`);
    face.addColorStop(0.38, rgba(color, 0.72 * amount));
    face.addColorStop(1, rgba(color, 0));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(enemy.x, enemy.y);
    ctx.closePath();
    ctx.fillStyle = face;
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
  const highlight = ctx.createRadialGradient(
    enemy.x + nx * enemy.r * 0.42,
    enemy.y + ny * enemy.r * 0.42,
    enemy.r * 0.04,
    enemy.x,
    enemy.y,
    enemy.r,
  );
  highlight.addColorStop(0, `rgba(244, 254, 255, ${0.95 * beam})`);
  highlight.addColorStop(0.34, rgba(color, 0.78 * beam));
  highlight.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = highlight;
  traceEnemy(enemy);
  ctx.fill();

  const face = Math.atan2(ny, nx);
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.r * 0.9, face - 1.05, face + 1.05);
  ctx.strokeStyle = `rgba(244, 254, 255, ${0.98 * beam})`;
  ctx.lineWidth = Math.max(3, enemy.r * 0.18);
  ctx.stroke();
}

/** Dark body, a faint colored rim in the dark, and faces that catch the player's light. */
function drawEnemy(enemy) {
  const color = TINTS[enemy.tint] ?? TINTS.rose;
  const beam = beamOn(enemy);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  traceEnemy(enemy);
  ctx.fillStyle = "#05070f";
  ctx.fill();
  ctx.lineWidth = Math.max(1.75, enemy.r * 0.075);
  ctx.strokeStyle = rgba(color, 0.58);
  ctx.shadowColor = rgba(color, 0.55);
  ctx.shadowBlur = 7;
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (beam > 0.03) {
    if (enemy.kind === "diamond") drawLitDiamond(enemy, color, beam);
    else drawLitOrb(enemy, color, beam);
  }
  ctx.restore();
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
  ctx.save();
  ctx.shadowColor = "rgba(5, 6, 15, 0.9)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(244, 252, 255, 0.92)";
  ctx.font = font(Math.max(22, unit() * 0.058), 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(String(state.score), state.viewW / 2, Math.max(16, state.safeTop + 10));
  ctx.restore();
}

function drawMenu() {
  const pulse = 1 + Math.sin(state.time * 2.4) * 0.08;
  const x = state.viewW / 2;
  const y = state.viewH * 0.44;
  drawGlow(x, y, unit() * LIGHT_FRAC * pulse, 1);
  drawCore(x, y, unit() * CORE_FRAC);

  ctx.fillStyle = "#f4feff";
  ctx.font = font(Math.max(40, unit() * 0.12), 300);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  setLetterSpacing(Math.round(unit() * 0.014));
  ctx.fillText("LUMINA", x, state.viewH * 0.18);
  setLetterSpacing(0);

  const blink = 0.45 + Math.sin(state.time * 3) * 0.35;
  ctx.globalAlpha = 0.4 + blink;
  ctx.fillStyle = "rgba(190, 248, 255, 0.92)";
  ctx.font = font(Math.max(16, unit() * 0.042), 500);
  ctx.fillText("Toque para jogar", x, state.viewH * 0.64);
  ctx.globalAlpha = 1;

  if (state.highScore > 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.font = font(Math.max(14, unit() * 0.036), 500);
    ctx.fillText(`Recorde ${state.highScore}`, x, state.viewH * 0.72);
  }
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
  ctx.fillText(`Recorde ${state.highScore}`, x, state.viewH * 0.52);

  const button = buttonRect();
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
}

function drawPlayerGlow() {
  const player = state.player;
  drawGlow(player.x, player.y, player.lightRadius, state.mode === "play" ? 1 : 0.35);
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
  } else {
    drawPlayerGlow();
    if (state.mode === "play") {
      for (const enemy of state.enemies) drawEnemy(enemy);
    }
    drawParticles();
    if (state.player.lightRadius > 2) {
      drawCore(state.player.x, state.player.y, shownCoreRadius(state.player));
    }
    if (state.mode === "play") drawScore();
    else drawGameOver();
  }

  ctx.restore();
}

function frame(now) {
  const dt = Math.min(MAX_DT, (now - state.last) / 1000);
  state.last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

layout();
announce(state.highScore > 0 ? `Toque para jogar. Recorde ${state.highScore}.` : "Toque para jogar.");
state.last = performance.now();
requestAnimationFrame(frame);
