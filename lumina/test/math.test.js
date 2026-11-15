import assert from "node:assert/strict";
import test from "node:test";
import {
  DIFFICULTY,
  applyDamage,
  circleHitsPolygon,
  circlesOverlap,
  clamp,
  diamondPoints,
  BLOOM_SCORE,
  BLOOM_SECONDS,
  BLOOM_SPAN,
  bloomEase,
  bloomSpan,
  edgeCamp,
  edgeSlots,
  pairXs,
  difficultyAt,
  passScore,
  edgeFacing,
  distPointToSegmentSq,
  enemyHitsPlayer,
  enemyHitsPlayerSweep,
  enemyOutline,
  lerp,
  pointInConvexPolygon,
} from "../js/math.js";

test("clamp keeps values inside the range", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(14, 0, 10), 10);
});

test("lerp moves toward the target without overshooting", () => {
  const mid = lerp(0, 10, 8, 1 / 60);
  assert.ok(mid > 0 && mid < 10);
  const close = lerp(9.9, 10, 8, 1);
  assert.ok(close > 9.9 && close <= 10);
  assert.equal(lerp(4, 4, 8, 0.5), 4);
});

test("circles overlap on contact and miss when apart", () => {
  assert.equal(circlesOverlap(0, 0, 10, 15, 0, 5), true);
  assert.equal(circlesOverlap(0, 0, 10, 20, 0, 10), true);
  assert.equal(circlesOverlap(0, 0, 10, 21, 0, 10), false);
});

test("point-to-segment distance is zero on the segment and positive beside it", () => {
  assert.equal(distPointToSegmentSq(5, 0, 0, 0, 10, 0), 0);
  assert.equal(distPointToSegmentSq(5, 3, 0, 0, 10, 0), 9);
  assert.equal(distPointToSegmentSq(-2, 0, 0, 0, 10, 0), 4);
});

test("diamond contains its center and rejects a far point", () => {
  const points = diamondPoints(100, 100, 40);
  assert.equal(pointInConvexPolygon(100, 100, points), true);
  assert.equal(pointInConvexPolygon(0, 0, points), false);
});

test("circle hits a diamond on the center, on an edge, and misses clear of it", () => {
  const points = diamondPoints(100, 200, 30);
  assert.equal(circleHitsPolygon(100, 200, 8, points), true);
  assert.equal(circleHitsPolygon(100, 168, 4, points), true);
  assert.equal(circleHitsPolygon(100, 120, 6, points), false);
});

test("light catches the diamond face turned toward it", () => {
  const points = diamondPoints(0, 0, 40);
  const bottom = edgeFacing(points[1].x, points[1].y, points[2].x, points[2].y, 0, 0, 0, 200);
  const top = edgeFacing(points[0].x, points[0].y, points[1].x, points[1].y, 0, 0, 0, 200);
  assert.ok(bottom > 0.4);
  assert.ok(top < 0);
});

test("each silhouette contains its center and misses a clear miss", () => {
  const player = { x: 80, y: 80, coreRadius: 6 };
  for (const kind of ["shard", "lantern", "grin", "diamond"]) {
    const enemy = { kind, x: 80, y: 80, r: 30 };
    assert.equal(pointInConvexPolygon(80, 80, enemyOutline(enemy)), true);
    assert.equal(enemyHitsPlayer(player, enemy), true);
    assert.equal(enemyHitsPlayer({ x: 80, y: 220, coreRadius: 6 }, enemy), false);
  }
});

test("enemy hit test uses the core, not the glow", () => {
  const player = { x: 100, y: 400, coreRadius: 12 };
  assert.equal(enemyHitsPlayer(player, { kind: "orb", x: 100, y: 400, r: 10 }), true);
  assert.equal(enemyHitsPlayer(player, { kind: "orb", x: 140, y: 400, r: 10 }), false);
  assert.equal(enemyHitsPlayer(player, { kind: "diamond", x: 100, y: 400, r: 20 }), true);
  assert.equal(enemyHitsPlayer(player, { kind: "diamond", x: 180, y: 400, r: 16 }), false);
});

test("a fast enemy still hits the core it jumps across", () => {
  const player = { x: 100, y: 100, coreRadius: 10 };
  const dropped = { kind: "orb", x: 100, y: 220, r: 16 };
  assert.equal(enemyHitsPlayer(player, dropped), false);
  assert.equal(enemyHitsPlayerSweep(player, dropped, 0), true);

  const missed = { kind: "diamond", x: 220, y: 240, r: 18 };
  assert.equal(enemyHitsPlayerSweep(player, missed, -20), false);
});

test("three hits extinguish the light", () => {
  const initial = 100;
  const afterFirst = applyDamage(initial, initial);
  const afterSecond = applyDamage(afterFirst, initial);
  const afterThird = applyDamage(afterSecond, initial);
  assert.ok(afterFirst > initial * 0.25);
  assert.ok(afterSecond > initial * 0.25);
  assert.equal(afterThird, 0);
  assert.ok(Math.abs(afterFirst - initial * (1 - 0.38)) < 1e-9);
});

test("difficulty rises every 7 seconds and the spawn interval has a floor", () => {
  const start = difficultyAt(0, DIFFICULTY.referenceHeight);
  assert.equal(start.steps, 0);
  assert.equal(start.speed, DIFFICULTY.baseSpeed);
  assert.equal(start.interval, DIFFICULTY.baseInterval);

  const step = difficultyAt(7, DIFFICULTY.referenceHeight);
  assert.equal(step.steps, 1);
  assert.ok(Math.abs(step.speed - DIFFICULTY.baseSpeed * 1.08) < 1e-9);
  assert.ok(Math.abs(step.interval - DIFFICULTY.baseInterval * 0.92) < 1e-9);

  const justBefore = difficultyAt(6.99, DIFFICULTY.referenceHeight);
  assert.equal(justBefore.steps, 0);

  const late = difficultyAt(7 * 40, DIFFICULTY.referenceHeight);
  assert.equal(late.interval, DIFFICULTY.minInterval);
  assert.ok(late.speed > step.speed);
});

test("a close pass inside the light scores 2, and a far pass scores 1", () => {
  const player = { x: 200, y: 700, coreRadius: 12, lightRadius: 180 };
  assert.equal(passScore(player, { x: 20, y: 700, r: 18 }), 1);
  assert.equal(passScore(player, { x: 240, y: 700, r: 18 }), 2);

  const dim = { ...player, lightRadius: 36 };
  assert.equal(passScore(dim, { x: 280, y: 700, r: 18 }), 1);
  assert.equal(passScore(player, { x: 280, y: 700, r: 18 }), 2);
});

test("the field opens over three seconds and then stays wider", () => {
  assert.equal(BLOOM_SCORE, 400);
  assert.equal(BLOOM_SECONDS, 3);
  assert.equal(bloomSpan(0), 1);
  assert.ok(bloomSpan(1.5) > 1 && bloomSpan(1.5) < BLOOM_SPAN);
  assert.ok(bloomEase(1.5) > 1.5 / 3);
  assert.equal(bloomSpan(3), BLOOM_SPAN);
  assert.equal(bloomSpan(8), BLOOM_SPAN);
});

test("a pair stays apart and inside the field", () => {
  const centered = pairXs(600, 40, 200, () => 0.5);
  assert.equal(centered[0], 200);
  assert.equal(centered[1], 400);
  const left = pairXs(600, 40, 200, () => 0);
  assert.equal(left[0], 40);
  assert.equal(left[1], 240);
  const tight = pairXs(200, 40, 300, () => 0.5);
  assert.ok(tight[1] - tight[0] >= 120 - 1e-9);
  assert.ok(tight[0] >= 40 && tight[1] <= 160);
});

test("camping a corner pulls the next enemy onto that side", () => {
  assert.equal(edgeCamp(20, 600, 108), -1);
  assert.equal(edgeCamp(300, 600, 108), 0);
  assert.equal(edgeCamp(580, 600, 108), 1);

  const left = edgeSlots(12, 600, 30, 180, -1);
  assert.ok(left[0] < 40);
  assert.ok(left[1] > left[0] + 100);

  const right = edgeSlots(590, 600, 30, 180, 1);
  assert.ok(right[0] > 560);
  assert.ok(right[1] < right[0] - 100);
});

test("difficulty scales speed with the view height", () => {
  const phone = difficultyAt(0, 422);
  assert.ok(Math.abs(phone.speed - DIFFICULTY.baseSpeed * 0.5) < 1e-9);
});
