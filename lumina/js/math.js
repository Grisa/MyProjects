/** Pure gameplay math. No DOM, so Node tests and the canvas game share it. */

export const DIFFICULTY = {
  stepSeconds: 7,
  speedGrowth: 1.08,
  intervalShrink: 0.92,
  baseSpeed: 220,
  baseInterval: 0.9,
  minInterval: 0.28,
  referenceHeight: 844,
};

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

/** Diamond (rhombus) matching the shape drawn in the game. */
export function diamondPoints(x, y, r) {
  const halfW = r * 0.72;
  return [
    { x, y: y - r },
    { x: x + halfW, y },
    { x, y: y + r },
    { x: x - halfW, y },
  ];
}

/** Convex outline for every enemy that is not a circle. Null means a round body. */
export function enemyOutline(enemy) {
  const { x, y, r, kind } = enemy;
  if (kind === "diamond") return diamondPoints(x, y, r);
  if (kind === "shard") {
    return [
      { x, y: y - r * 0.9 },
      { x: x + r * 0.78, y: y + r * 0.68 },
      { x: x - r * 0.78, y: y + r * 0.68 },
    ];
  }
  if (kind === "lantern") {
    const points = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 6;
      points.push({ x: x + Math.cos(angle) * r * 0.9, y: y + Math.sin(angle) * r * 0.9 });
    }
    return points;
  }
  if (kind === "grin") {
    const w = r * 0.92;
    const h = r * 0.52;
    return [
      { x: x - w * 0.42, y: y - h },
      { x: x + w * 0.42, y: y - h },
      { x: x + w, y },
      { x: x + w * 0.42, y: y + h },
      { x: x - w * 0.42, y: y + h },
      { x: x - w, y },
    ];
  }
  return null;
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
  const points = enemyOutline(enemy);
  if (points) return circleHitsPolygon(player.x, player.y, player.coreRadius, points);
  return circlesOverlap(player.x, player.y, player.coreRadius, enemy.x, enemy.y, enemy.r);
}

/**
 * Straight vertical fall. Also tests the point where the body crosses the player,
 * so a fast enemy cannot jump the core in a single frame.
 */
export function enemyHitsPlayerSweep(player, enemy, previousY) {
  if (enemyHitsPlayer(player, enemy)) return true;
  if (previousY !== enemy.y && enemyHitsPlayer(player, { ...enemy, y: previousY })) return true;
  const low = Math.min(previousY, enemy.y);
  const high = Math.max(previousY, enemy.y);
  if (player.y < low || player.y > high) return false;
  return enemyHitsPlayer(player, { ...enemy, y: player.y });
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

export function difficultyAt(elapsedSeconds, viewHeight, config = DIFFICULTY) {
  const elapsed = Math.max(0, elapsedSeconds);
  const height = Math.max(1, viewHeight);
  const steps = Math.floor(elapsed / config.stepSeconds);
  const heightScale = height / config.referenceHeight;
  const speed = config.baseSpeed * heightScale * config.speedGrowth ** steps;
  const interval = Math.max(
    config.minInterval,
    config.baseInterval * config.intervalShrink ** steps,
  );
  return { steps, speed, interval };
}
