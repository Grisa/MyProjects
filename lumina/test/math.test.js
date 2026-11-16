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
  BOSS_GAP,
  BOSS_HITS,
  BOSS_PHRASES,
  BOSS_SCORE,
  bossPhrase,
  bossThreshold,
  dueBeats,
  shufflePhrases,
  aimPair,
  edgeCamp,
  edgeSlots,
  fieldDust,
  laneNudge,
  pairXs,
  CAST_SCORE,
  castKinds,
  spawnJitter,
  staggerDrop,
  WAVE_INTERVAL,
  waveInterval,
  variedGap,
  difficultyAt,
  passScore,
  edgeFacing,
  distPointToSegmentSq,
  enemyHitsPlayer,
  enemyHitsPlayerSweep,
  enemyOutline,
  enemyStep,
  writeEnemyOutline,
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

test("the outline buffer is reused and matches a fresh outline", () => {
  const enemy = { kind: "lantern", x: 12, y: 40, r: 25 };
  const fresh = enemyOutline(enemy);
  const reused = [];
  const first = writeEnemyOutline(enemy, reused);
  assert.equal(first, reused);
  assert.equal(reused.length, fresh.length);
  for (let i = 0; i < fresh.length; i += 1) {
    assert.ok(Math.abs(reused[i].x - fresh[i].x) < 1e-9);
    assert.ok(Math.abs(reused[i].y - fresh[i].y) < 1e-9);
  }
  const point = reused[0];
  writeEnemyOutline({ kind: "shard", x: 3, y: 4, r: 10 }, reused);
  assert.equal(reused[0], point);
  assert.equal(reused.length, 3);
  assert.equal(writeEnemyOutline({ kind: "orb", x: 0, y: 0, r: 8 }, reused), null);
});

test("each shadow moves in its own way", () => {
  const orb = { kind: "orb", x: 50, y: 0, r: 10, fall: 1, drift: 1 };
  enemyStep(orb, 0.5, 100, 0, 200);
  assert.equal(orb.x, 50);
  assert.equal(orb.y, 50);

  const shard = { kind: "shard", x: 100, y: 0, r: 20, homeX: 100, phase: 0, fall: 1 };
  enemyStep(shard, 0.1, 100, Math.PI / 2 / 3.1, 400);
  assert.ok(Math.abs(shard.x - 118) < 1e-6);

  const grin = { kind: "grin", x: 100, y: 0, r: 20, homeX: 100, phase: 0, fall: 1 };
  enemyStep(grin, 0.1, 100, Math.PI / 2 / 1.05, 400);
  assert.ok(Math.abs(grin.x - 131) < 1e-6);
  assert.ok(Math.abs(grin.x - 100) > Math.abs(shard.x - 100));

  const caco = { kind: "diamond", x: 80, y: 10, r: 10, fall: 1, drift: 1 };
  enemyStep(caco, 0.5, 100, 0, 100);
  assert.equal(caco.x, 90);
  assert.equal(caco.drift, -1);

  const slow = { kind: "lantern", x: 40, y: 0, r: 10, fall: 1, commit: 30 };
  enemyStep(slow, 1, 10, 0, 200);
  assert.ok(Math.abs(slow.y - 3.4) < 1e-9);
  slow.y = 30;
  enemyStep(slow, 1, 10, 0, 200);
  assert.ok(Math.abs(slow.y - 47) < 1e-9);
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

test("waves vary their gap, height, timing, and lane", () => {
  assert.equal(variedGap(40, 200, () => 0), 40);
  assert.equal(variedGap(40, 200, () => 1), 200);
  assert.equal(staggerDrop(20, () => 0.1), 0);
  let step = 0;
  const staggerRolls = [0.5, 0];
  assert.equal(staggerDrop(20, () => staggerRolls[step++]), 30);
  assert.equal(spawnJitter(() => 0), 0.85);
  assert.equal(spawnJitter(() => 1), 1.15);
  assert.equal(waveInterval(false), WAVE_INTERVAL.closed);
  assert.equal(waveInterval(true), WAVE_INTERVAL.open);
  assert.deepEqual(castKinds(0, false), ["orb", "diamond"]);
  assert.deepEqual(castKinds(CAST_SCORE, false), ["orb", "diamond", "shard", "grin"]);
  assert.deepEqual(castKinds(CAST_SCORE, true), ["orb", "diamond", "shard", "grin", "lantern"]);

  const nudge = laneNudge(30, () => 0);
  assert.equal(nudge, -6);

  let i = 0;
  const rolls = [0.8, 0];
  const pair = aimPair(300, 600, 30, 180, () => rolls[i++]);
  assert.equal(pair[0], 306);
  assert.equal(pair[1], 486);
  assert.ok(Math.abs(pair[0] - 300) < 30);
  assert.ok(pair[1] - pair[0] >= 180 * 0.85);
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

test("the mantle waits at 600 and returns 300 points later", () => {
  assert.equal(BOSS_SCORE, 600);
  assert.equal(BOSS_GAP, 300);
  assert.equal(BOSS_HITS, 3);
  assert.equal(bossThreshold(0), 600);
  assert.equal(bossThreshold(1), 900);
  assert.equal(bossThreshold(2), 1200);
});

test("each mantle phrase keeps one light inside a fixed pocket", () => {
  for (const id of BOSS_PHRASES) {
    const phrase = bossPhrase(id, () => 0);
    const cores = phrase.beats.filter((beat) => beat.role === "core");
    assert.equal(cores.length, 1);
    assert.equal(phrase.beats.length >= 2, true);
    for (let i = 1; i < phrase.beats.length; i += 1) {
      assert.ok(phrase.beats[i].t >= phrase.beats[i - 1].t);
    }
    assert.ok(cores[0].x > 0.15 && cores[0].x < 0.85);
  }

  const gate = bossPhrase("gap", () => 0);
  const walls = gate.beats.filter((beat) => beat.role === "shadow").map((beat) => beat.x);
  const gateCore = gate.beats.find((beat) => beat.role === "core");
  assert.ok(gateCore.x - walls[0] >= 0.15);
  assert.ok(walls[1] - gateCore.x >= 0.15);

  const stair = bossPhrase("stair", () => 0);
  const stepCore = stair.beats.find((beat) => beat.role === "core");
  const follower = stair.beats.find(
    (beat) => beat.role === "shadow" && beat.x === stepCore.x && beat.t > stepCore.t,
  );
  assert.ok(follower);

  const sweepA = bossPhrase("sweep", () => 0).beats.find((beat) => beat.role === "core");
  const sweepB = bossPhrase("sweep", () => 0.99).beats.find((beat) => beat.role === "core");
  assert.notEqual(sweepA.x, sweepB.x);

  const diveLeft = bossPhrase("dive", () => 0);
  const diveRight = bossPhrase("dive", () => 0.9);
  assert.equal(diveLeft.beats[0].kind, "lantern");
  assert.notEqual(diveLeft.beats[0].x, diveRight.beats[0].x);
  assert.notEqual(diveLeft.beats[1].x, diveLeft.beats[0].x);
});

test("a phrase releases each beat once, even when the clock jumps", () => {
  const phrase = bossPhrase("stair", () => 0);
  const opening = dueBeats(phrase, 0, 0);
  assert.equal(opening.beats.length, 1);
  assert.equal(opening.beats[0].role, "shadow");
  const rest = dueBeats(phrase, 10, opening.cursor);
  assert.equal(opening.cursor + rest.beats.length, phrase.beats.length);
  assert.equal(rest.beats.filter((beat) => beat.role === "core").length, 1);
  const again = dueBeats(phrase, 10, rest.cursor);
  assert.equal(again.beats.length, 0);
  assert.equal(again.cursor, phrase.beats.length);
});

test("a shuffled mantle deck keeps every phrase once", () => {
  let step = 0;
  const rolls = [0.1, 0.9, 0.4];
  const deck = shufflePhrases(() => rolls[step++]);
  assert.deepEqual([...deck].sort(), [...BOSS_PHRASES].sort());
  assert.equal(new Set(deck).size, BOSS_PHRASES.length);
});

test("field dust stays put, stays dim, and reaches past the first view", () => {
  const wide = 170;
  const tall = 340;
  const first = fieldDust(wide, tall);
  assert.deepEqual(fieldDust(wide, tall), first);
  const marks = [...first.specks, ...first.motes, ...first.rings];
  for (const mark of marks) {
    assert.ok(mark.x >= 0 && mark.x <= wide);
    assert.ok(mark.y >= 0 && mark.y <= tall);
    assert.ok(mark.alpha >= 0.04 && mark.alpha <= 0.16);
    assert.ok(mark.r > 0);
  }
  const earlyW = wide / BLOOM_SPAN;
  const earlyH = tall / BLOOM_SPAN;
  const visibleEarly = first.specks.filter((speck) => speck.x <= earlyW && speck.y <= earlyH);
  const revealed = first.specks.filter((speck) => speck.x > earlyW || speck.y > earlyH);
  assert.ok(visibleEarly.length >= 8);
  assert.ok(revealed.length >= 8);
});

test("difficulty scales speed with the view height", () => {
  const phone = difficultyAt(0, 422);
  assert.ok(Math.abs(phone.speed - DIFFICULTY.baseSpeed * 0.5) < 1e-9);
});
