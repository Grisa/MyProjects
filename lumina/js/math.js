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
  if (enemy.kind === "diamond") {
    return circleHitsPolygon(
      player.x,
      player.y,
      player.coreRadius,
      diamondPoints(enemy.x, enemy.y, enemy.r),
    );
  }
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
