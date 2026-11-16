/** Pure gameplay math. No DOM, so Node tests and the canvas game share it. */

export const DIFFICULTY = {
  referenceHeight: 844,
  /** Share of the view the shadow crosses before it reaches the player. */
  travelFraction: 0.85,
  endlessEvery: 100,
  endlessGrowth: 1.02,
};

/**
 * Score bands. Travel is seconds until a shadow reaches the player.
 * Interval is seconds between waves. Each act climbs to its own ceiling,
 * and the next act starts where the last one stopped.
 * Waves sit closer than the old flat 1.2 s / 0.9 s waits.
 */
export const ACT_PACE = [
  { travel: [2.6, 2.05], interval: [0.72, 0.58] },
  { travel: [2.05, 1.6], interval: [0.58, 0.48] },
  { travel: [1.6, 1.35], interval: [0.48, 0.4] },
];

export const ENDLESS_PACE = { travel: 1.35, interval: 0.4 };

/** Sideways speed of a caco, as a share of the fall. Low enough to read the bounce. */
export const DIAMOND_SLIDE = 0.34;
/** Vigia holds, then dives only a little faster than the other shadows. */
export const LANTERN_CRAWL = 0.34;
export const LANTERN_DIVE = 1.25;

export const ACT_LINES = [
  null,
  { title: "Ato 2", detail: "A lasca e o riso entram." },
  { title: "Ato 3", detail: "A luz abre o campo." },
  { title: "Sem fim", detail: "" },
];

export const BLOOM_SCORE = 400;
export const BLOOM_SECONDS = 3;
export const BLOOM_SPAN = 1.7;
export const DAMAGE_FRACTION = 0.38;
export const EXTINGUISH_FRACTION = 0.25;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Frame-rate independent exponential smoothing. */
export function lerp(current, target, speed, dt) {
  const t = 1 - Math.exp(-speed * dt);
  return current + (target - current) * t;
}

export function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const reach = ar + br;
  return dx * dx + dy * dy <= reach * reach;
}

export function distPointToSegmentSq(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  let t = 0;
  if (abLenSq > 0) {
    t = clamp(((px - ax) * abx + (py - ay) * aby) / abLenSq, 0, 1);
  }
  const dx = ax + abx * t - px;
  const dy = ay + aby * t - py;
  return dx * dx + dy * dy;
}

/** Convex polygon, points in order. Includes the boundary. */
export function pointInConvexPolygon(x, y, points) {
  let sign = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (cross === 0) continue;
    const next = cross > 0 ? 1 : -1;
    if (sign === 0) sign = next;
    else if (next !== sign) return false;
  }
  return points.length >= 3;
}

export function circleHitsPolygon(cx, cy, radius, points) {
  if (points.length < 3) return false;
  if (pointInConvexPolygon(cx, cy, points)) return true;
  const reach = radius * radius;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (distPointToSegmentSq(cx, cy, a.x, a.y, b.x, b.y) <= reach) return true;
  }
  return false;
}

/** Offsets from the center, in units of the radius. Built once. */
const LOCAL_OUTLINE = {
  diamond: [
    [0, -1],
    [0.72, 0],
    [0, 1],
    [-0.72, 0],
  ],
  shard: [
    [0, -0.9],
    [0.78, 0.68],
    [-0.78, 0.68],
  ],
  lantern: Array.from({ length: 6 }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 6;
    return [Math.cos(angle) * 0.9, Math.sin(angle) * 0.9];
  }),
  grin: [
    [-0.92 * 0.42, -0.52],
    [0.92 * 0.42, -0.52],
    [0.92, 0],
    [0.92 * 0.42, 0.52],
    [-0.92 * 0.42, 0.52],
    [-0.92, 0],
  ],
};

const outlineScratch = [];

/** Diamond (rhombus) matching the shape drawn in the game. */
export function diamondPoints(x, y, r) {
  return enemyOutline({ kind: "diamond", x, y, r });
}

/**
 * Writes the world outline into `out`, reusing its point objects.
 * A circle has no outline and returns null. The default buffer is shared,
 * so callers that keep the points pass their own array.
 */
export function writeEnemyOutline(enemy, out = outlineScratch) {
  const local = LOCAL_OUTLINE[enemy.kind];
  if (!local) return null;
  const { x, y, r } = enemy;
  for (let i = 0; i < local.length; i += 1) {
    const point = out[i] || (out[i] = { x: 0, y: 0 });
    point.x = x + local[i][0] * r;
    point.y = y + local[i][1] * r;
  }
  out.length = local.length;
  return out;
}

/** Convex outline for every enemy that is not a circle. Null means a round body. */
export function enemyOutline(enemy) {
  const local = LOCAL_OUTLINE[enemy.kind];
  if (!local) return null;
  const { x, y, r } = enemy;
  const points = new Array(local.length);
  for (let i = 0; i < local.length; i += 1) {
    points[i] = { x: x + local[i][0] * r, y: y + local[i][1] * r };
  }
  return points;
}

/**
 * How directly a light hits one edge of a shape. 1 is face-on, 0 is grazing,
 * negative means the edge points away from the light.
 */
export function edgeFacing(ax, ay, bx, by, cx, cy, lightX, lightY) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  let nx = ay - by;
  let ny = bx - ax;
  const length = Math.hypot(nx, ny) || 1;
  nx /= length;
  ny /= length;
  if ((mx - cx) * nx + (my - cy) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const lx = lightX - mx;
  const ly = lightY - my;
  const reach = Math.hypot(lx, ly) || 1;
  return (lx / reach) * nx + (ly / reach) * ny;
}

export function enemyHitsPlayer(player, enemy) {
  const points = writeEnemyOutline(enemy);
  if (points) return circleHitsPolygon(player.x, player.y, player.coreRadius, points);
  return circlesOverlap(player.x, player.y, player.coreRadius, enemy.x, enemy.y, enemy.r);
}

/**
 * Straight vertical fall. Also tests the point where the body crosses the player,
 * so a fast enemy cannot jump the core in a single frame.
 */
export function enemyHitsPlayerSweep(player, enemy, previousY) {
  if (enemyHitsPlayer(player, enemy)) return true;
  const y = enemy.y;
  if (previousY !== y) {
    enemy.y = previousY;
    const hitAbove = enemyHitsPlayer(player, enemy);
    enemy.y = y;
    if (hitAbove) return true;
  }
  const low = Math.min(previousY, y);
  const high = Math.max(previousY, y);
  if (player.y < low || player.y > high) return false;
  enemy.y = player.y;
  const hitCross = enemyHitsPlayer(player, enemy);
  enemy.y = y;
  return hitCross;
}

/**
 * One step of a shadow. The shape is the tell:
 * the orb drops straight, the diamond slides and bounces,
 * the shard shivers, the grin draws a wide S,
 * and the lantern crawls until `commit`, then dives.
 * `left` and `width` are the walls. Mutates `enemy`.
 */
export function enemyStep(enemy, dt, speed, time, width, left = 0) {
  const r = Math.max(0, enemy.r);
  const lo = left + r;
  const hi = Math.max(lo, width - r);
  const fall = enemy.fall || 1;
  let x = enemy.x;
  let drift = enemy.drift || 1;
  if (enemy.kind === "shard") {
    const home = enemy.homeX ?? x;
    x = clamp(home + Math.sin(time * 3.1 + (enemy.phase || 0)) * r * 0.9, lo, hi);
  } else if (enemy.kind === "grin") {
    const home = enemy.homeX ?? x;
    x = clamp(home + Math.sin(time * 1.05 + (enemy.phase || 0)) * r * 1.55, lo, hi);
  } else if (enemy.kind === "diamond") {
    x += speed * DIAMOND_SLIDE * fall * drift * dt;
    if (x <= lo) {
      x = lo;
      drift = 1;
    } else if (x >= hi) {
      x = hi;
      drift = -1;
    }
  }
  const diving = enemy.kind === "lantern" && enemy.y >= (enemy.commit ?? Infinity);
  const rush = enemy.kind === "lantern" ? (diving ? LANTERN_DIVE : LANTERN_CRAWL) : 1;
  enemy.x = x;
  enemy.y += speed * fall * rush * dt;
  enemy.drift = drift;
  return enemy;
}

/**
 * Each hit removes ~38% of the remaining light.
 * The third hit drops the radius under 25% of the run's starting light and extinguishes it.
 */
export function applyDamage(targetRadius, initialRadius, fraction = DAMAGE_FRACTION) {
  if (initialRadius <= 0) return 0;
  const next = targetRadius * (1 - fraction);
  if (next <= initialRadius * EXTINGUISH_FRACTION) return 0;
  return next;
}

/** Share of the light radius that still counts as skimming the core. */
export const GRAZE_LIGHT_FRACTION = 0.28;

export function grazeMargin(player) {
  return Math.max(player.coreRadius * 1.6, player.lightRadius * GRAZE_LIGHT_FRACTION);
}

/**
 * Points for an enemy that passed without hitting.
 * A far pass is 1. Skimming the core, inside the light, is 2.
 * A smaller light makes that skim harder.
 */
export function passScore(player, enemy) {
  const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  const inLight = distance <= player.lightRadius + enemy.r;
  const close = distance <= player.coreRadius + enemy.r + grazeMargin(player);
  return inLight && close ? 2 : 1;
}

/** 0 at the flash, 1 when the wider field has finished opening. */
export function bloomEase(elapsed, seconds = BLOOM_SECONDS) {
  const t = clamp(elapsed / Math.max(0.001, seconds), 0, 1);
  return 1 - (1 - t) ** 3;
}

/** Camera span while the field opens. 1 is the starting view. */
export function bloomSpan(elapsed, seconds = BLOOM_SECONDS, span = BLOOM_SPAN) {
  return 1 + (span - 1) * bloomEase(elapsed, seconds);
}

/**
 * Two horizontal slots in the same wave, held apart by `separation`.
 * The pair slides along the field so the gap is not always in the middle.
 */
export function pairXs(width, margin, separation, random = Math.random) {
  const lo = margin;
  const hi = Math.max(margin, width - margin);
  const room = Math.max(0, hi - lo);
  const gap = Math.min(Math.max(0, separation), room);
  const midLo = lo + gap / 2;
  const midHi = hi - gap / 2;
  const mid = midLo + random() * Math.max(0, midHi - midLo);
  return [mid - gap / 2, mid + gap / 2];
}

/** Gap between a pair. Wide enough to slip through, and not the same every wave. */
export function variedGap(minGap, maxGap, random = Math.random) {
  const lo = Math.max(0, minGap);
  const hi = Math.max(lo, maxGap);
  return lo + random() * (hi - lo);
}

/** How far the second enemy of a wave starts above the first. Sometimes they share a line. */
export function staggerDrop(reach, random = Math.random) {
  if (!(reach > 0) || random() < 0.2) return 0;
  return reach * (1.5 + random() * 2.8);
}

/** Lasca and riso join halfway to the bloom. The vigia waits for the open field. */
export const CAST_SCORE = 200;

/** 0–199 act 1, 200–399 act 2, 400–599 act 3, 600+ endless. */
export function actIndex(score) {
  const points = Math.max(0, score);
  if (points >= 600) return 3;
  if (points >= 400) return 2;
  if (points >= 200) return 1;
  return 0;
}

export function actBanner(index) {
  return ACT_LINES[index] || null;
}

/** Spoken line for the act change. The title and the detail stay on separate rows. */
export function actLine(index) {
  const banner = actBanner(index);
  if (!banner) return "";
  return banner.detail ? `${banner.title}. ${banner.detail}` : `${banner.title}.`;
}

/** Kind ids allowed at this point in the run, in roster order. */
export function castKinds(score, opened) {
  const kinds = ["orb", "diamond"];
  if (score >= CAST_SCORE || opened) kinds.push("shard", "grin");
  if (opened) kinds.push("lantern");
  return kinds;
}

/**
 * Multiplier for the wait before the next wave.
 * Stays near 1 so two waves cannot land on top of each other.
 */
export function spawnJitter(random = Math.random) {
  return 0.93 + random() * 0.14;
}

function bandT(score, start, end) {
  const span = end - start;
  if (!(span > 0)) return 1;
  return clamp((Math.max(0, score) - start) / span, 0, 1);
}

/** Travel time and wave interval at this score, both already at the act ceiling. */
export function paceAt(score) {
  const points = Math.max(0, score);
  const act = actIndex(points);
  if (act >= 3) {
    const steps = Math.floor((points - 600) / DIFFICULTY.endlessEvery);
    const lift = DIFFICULTY.endlessGrowth ** steps;
    return {
      act,
      travel: ENDLESS_PACE.travel / lift,
      interval: ENDLESS_PACE.interval / lift,
    };
  }
  const pace = ACT_PACE[act];
  const t = bandT(points, act * 200, (act + 1) * 200);
  return {
    act,
    travel: pace.travel[0] + (pace.travel[1] - pace.travel[0]) * t,
    interval: pace.interval[0] + (pace.interval[1] - pace.interval[0]) * t,
  };
}

/**
 * Seconds until the next wave.
 * `intervalScale` is the Folga perk. The act already sets how close the waves sit.
 */
export function waveWait(score, intervalScale = 1, random = Math.random) {
  const scale = Math.max(0.5, intervalScale);
  return paceAt(score).interval * scale * spawnJitter(random);
}

/** Sideways offset that still covers a player who stays put. */
export function laneNudge(radius, random = Math.random) {
  const sign = random() < 0.5 ? -1 : 1;
  return sign * Math.max(0, radius) * (0.2 + random() * 0.7);
}

/**
 * One slot sits just off the player. The other stays `gap` away,
 * so the open side is the way through.
 */
export function aimPair(playerX, width, radius, gap, random = Math.random) {
  const margin = Math.max(0, radius);
  const lo = margin;
  const hi = Math.max(lo, width - margin);
  const span = Math.min(Math.max(0, gap), Math.max(0, hi - lo));
  let sign = random() < 0.5 ? -1 : 1;
  const nudge = sign * Math.max(0, radius) * (0.2 + random() * 0.7);
  const aimed = clamp(playerX + nudge, lo, hi);
  let other = clamp(aimed + sign * span, lo, hi);
  if (span > 0 && Math.abs(other - aimed) < span * 0.85) {
    sign = -sign;
    other = clamp(aimed + sign * span, lo, hi);
  }
  if (span > 0 && Math.abs(other - aimed) < span * 0.85) return [lo, hi];
  return aimed <= other ? [aimed, other] : [other, aimed];
}

function dustRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sparse dust fixed on the opened field. `width` and `height` are the
 * wide field, so marks past the first view appear when the camera pulls back.
 * The same size always returns the same layout. Alphas stay dim.
 */
export function fieldDust(width, height, seed = 0x5eed) {
  const random = dustRandom(seed);
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const short = Math.min(w, h);
  const specks = [];
  const cols = 7;
  const rows = 8;
  const cellW = w / cols;
  const cellH = h / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const jx = (random() - 0.5) * cellW * 0.72;
      const jy = (random() - 0.5) * cellH * 0.72;
      specks.push({
        x: clamp(cellW * (col + 0.5) + jx, 0, w),
        y: clamp(cellH * (row + 0.5) + jy, 0, h),
        r: short * (0.0032 + random() * 0.0048),
        alpha: 0.06 + random() * 0.1,
      });
    }
  }
  const motes = [];
  for (let i = 0; i < 10; i += 1) {
    motes.push({
      x: random() * w,
      y: random() * h,
      r: short * (0.018 + random() * 0.034),
      alpha: 0.05 + random() * 0.07,
    });
  }
  const rings = [];
  for (let i = 0; i < 6; i += 1) {
    rings.push({
      x: w * (0.12 + random() * 0.76),
      y: h * (0.1 + random() * 0.8),
      r: short * (0.05 + random() * 0.075),
      alpha: 0.05 + random() * 0.08,
    });
  }
  return { specks, motes, rings };
}

/** -1 on the left edge, 1 on the right, 0 when the player is out of the corner. */
export function edgeCamp(x, width, band) {
  if (!(width > 0) || !(band > 0)) return 0;
  if (x <= band) return -1;
  if (x >= width - band) return 1;
  return 0;
}

/**
 * A camper gets one enemy on top of them. The partner sits `gap` toward
 * the open field, so the way out is inward.
 */
export function edgeSlots(x, width, radius, gap, side) {
  const lo = Math.max(0, radius) * 0.45;
  const hi = Math.max(lo, width - lo);
  const aimed = clamp(x, lo, hi);
  if (!side) return [aimed];
  const inward = clamp(aimed - side * gap, Math.max(0, radius), Math.max(radius, width - radius));
  return [aimed, inward];
}

/** First mantle, then again after each chapter, once the run has moved on. */
export const BOSS_SCORE = 600;
export const BOSS_GAP = 300;
export const BOSS_HITS = 3;
export const BOSS_ARRIVE = 1.15;
export const BOSS_BETWEEN = 0.48;
export const BOSS_LEAVE = 0.7;
export const BOSS_PHRASES = ["serpente", "retorno", "zigue", "finta", "quebra", "espiral"];

export function bossThreshold(visit) {
  return BOSS_SCORE + Math.max(0, visit) * BOSS_GAP;
}

/** A pass scores nothing while the mantle owns the field. */
export function scoreForPass(gained, bossUp) {
  if (bossUp) return 0;
  return gained;
}

/**
 * The lights that hit the mantle. Two misses in a row close the field.
 * Catching one clears the count.
 */
export function noteBossLight(missed, caught) {
  if (caught) return { missed: 0, close: false };
  const next = Math.max(0, missed) + 1;
  if (next >= 2) return { missed: 0, close: true };
  return { missed: next, close: false };
}

/**
 * Centers of one solid line. Circles of `radius` cover the field edge to edge,
 * so a sideways dodge has nowhere to stand.
 */
export function bossWallCenters(width, radius) {
  const r = Math.max(1, radius);
  const span = Math.max(r * 2, width);
  const step = r * 1.8;
  const last = span - r;
  const centers = [];
  let x = r;
  while (x < last - 0.01) {
    centers.push(x);
    x += step;
  }
  centers.push(last);
  return centers;
}

/** Every corridor, in a new order. Each one stays in the deck once. */
export function shufflePhrases(random = Math.random) {
  const deck = BOSS_PHRASES.slice();
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    const swap = deck[i];
    deck[i] = deck[j];
    deck[j] = swap;
  }
  return deck;
}

const BOSS_LANES = [0.16, 0.39, 0.61, 0.84];

/** Open-lane sequences. The last index is where the light waits. */
const CORRIDORS = {
  serpente: [0, 1, 2, 3],
  retorno: [0, 1, 2, 3, 1, 0],
  zigue: [0, 3, 1, 2, 0, 3],
  finta: [1, 1, 1, 0, 3],
  quebra: [0, 1, 2, 2, 0],
  espiral: [2, 3, 2, 1, 0, 1],
};

/**
 * A corridor of gates. Each row blocks every lane but one.
 * The lane you just left closes behind you.
 * The light sits in the last open lane.
 * `x` is a fraction of the field width. `t` is the row, lowest first.
 */
export function bossPhrase(id, random = Math.random) {
  const opens = CORRIDORS[id] || CORRIDORS.serpente;
  const mirror = random() >= 0.5;
  const lane = (index) => BOSS_LANES[mirror ? BOSS_LANES.length - 1 - index : index];
  const beats = [];
  let previous = null;
  opens.forEach((open, row) => {
    const last = row === opens.length - 1;
    for (let index = 0; index < BOSS_LANES.length; index += 1) {
      if (index === open) {
        if (last) beats.push({ t: row, x: lane(index), role: "core" });
        continue;
      }
      beats.push({ t: row, x: lane(index), role: "shadow", kind: "orb" });
    }
    if (previous != null && previous !== open) {
      beats.push({ t: row - 0.5, x: lane(previous), role: "shadow", kind: "orb" });
    }
    previous = open;
  });
  beats.sort((a, b) => a.t - b.t || a.x - b.x);
  return { id: CORRIDORS[id] ? id : "serpente", beats };
}

/** Beats that have come due since `cursor`. A late clock releases each beat once. */
export function dueBeats(phrase, elapsed, cursor) {
  const beats = phrase.beats;
  const ready = [];
  let next = cursor;
  while (next < beats.length && beats[next].t <= elapsed + 0.0001) {
    ready.push(beats[next]);
    next += 1;
  }
  return { beats: ready, cursor: next };
}

/**
 * Field speed in px/s. `span` keeps the fall looking the same after the field opens:
 * the world is drawn smaller, so the field has to move faster by the same amount.
 */
export function difficultyAt(score, viewHeight, span = 1) {
  const pace = paceAt(score);
  const height = Math.max(1, viewHeight);
  const visual = (DIFFICULTY.referenceHeight * DIFFICULTY.travelFraction) / pace.travel;
  const speed = visual * (height / DIFFICULTY.referenceHeight) * Math.max(0.05, span);
  return { ...pace, speed };
}
