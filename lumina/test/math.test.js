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
  bossWallCenters,
  noteBossLight,
  scoreForPass,
  dueBeats,
  shufflePhrases,
  aimPair,
  edgeCamp,
  edgeSlots,
  fieldDust,
  laneNudge,
  pairXs,
  ACT_PACE,
  CAST_SCORE,
  ENDLESS_PACE,
  actIndex,
  actLine,
  castKinds,
  paceAt,
  spawnJitter,
  staggerDrop,
  waveWait,
  variedGap,
  DIAMOND_SLIDE,
  LANTERN_CRAWL,
  LANTERN_DIVE,
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

  const caco = { kind: "diamond", x: 40, y: 10, r: 10, fall: 1, drift: 1 };
  enemyStep(caco, 0.5, 100, 0, 400);
  assert.ok(Math.abs(caco.x - (40 + 100 * DIAMOND_SLIDE * 0.5)) < 1e-9);
  assert.ok(DIAMOND_SLIDE < 0.45);
  const wall = { kind: "diamond", x: 80, y: 10, r: 10, fall: 1, drift: 1 };
  enemyStep(wall, 0.5, 100, 0, 100);
  assert.equal(wall.x, 90);
  assert.equal(wall.drift, -1);

  const slow = { kind: "lantern", x: 40, y: 0, r: 10, fall: 1, commit: 30 };
  enemyStep(slow, 1, 10, 0, 200);
  assert.ok(Math.abs(slow.y - 10 * LANTERN_CRAWL) < 1e-9);
  slow.y = 30;
  enemyStep(slow, 1, 10, 0, 200);
  assert.ok(Math.abs(slow.y - (30 + 10 * LANTERN_DIVE)) < 1e-9);
  assert.ok(LANTERN_DIVE < 1.4);
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

test("each act climbs to its own ceiling and the next act continues it", () => {
  assert.equal(actIndex(0), 0);
  assert.equal(actIndex(199), 0);
  assert.equal(actIndex(200), 1);
  assert.equal(actIndex(399), 1);
  assert.equal(actIndex(400), 2);
  assert.equal(actIndex(599), 2);
  assert.equal(actIndex(600), 3);
  assert.equal(actIndex(900), 3);

  assert.equal(actLine(0), "");
  assert.equal(actLine(1), "Ato 2. A lasca e o riso entram.");
  assert.equal(actLine(2), "Ato 3. A luz abre o campo.");
  assert.equal(actLine(3), "Sem fim.");

  const height = DIFFICULTY.referenceHeight;
  const start = difficultyAt(0, height);
  assert.equal(start.travel, ACT_PACE[0].travel[0]);
  assert.equal(start.interval, ACT_PACE[0].interval[0]);
  assert.ok(start.interval < 0.9);
  const travelPx = height * DIFFICULTY.travelFraction;
  assert.ok(Math.abs(travelPx / start.speed - start.travel) < 1e-9);

  const lateAct = paceAt(199);
  const actTwo = paceAt(200);
  assert.ok(lateAct.travel < start.travel);
  assert.ok(lateAct.interval < start.interval);
  assert.ok(Math.abs(lateAct.travel - actTwo.travel) < 0.01);
  assert.ok(Math.abs(lateAct.interval - actTwo.interval) < 0.01);
  assert.ok(Math.abs(paceAt(399).travel - paceAt(400).travel) < 0.01);
  assert.ok(Math.abs(paceAt(599).travel - ENDLESS_PACE.travel) < 0.01);
  assert.ok(paceAt(399).travel >= 1.55);
  assert.equal(paceAt(400).interval, ACT_PACE[2].interval[0]);
  assert.ok(paceAt(500).interval < 0.5);

  const capped = difficultyAt(199, height);
  const endless = difficultyAt(600, height);
  const lifted = difficultyAt(800, height);
  assert.ok(capped.speed < endless.speed);
  assert.ok(Math.abs(endless.travel / lifted.travel - DIFFICULTY.endlessGrowth ** 2) < 1e-9);
  assert.ok(Math.abs(endless.interval / lifted.interval - DIFFICULTY.endlessGrowth ** 2) < 1e-9);
  assert.ok(lifted.speed > endless.speed);
  assert.ok(lifted.interval < endless.interval);
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
  assert.equal(spawnJitter(() => 0), 0.93);
  assert.equal(spawnJitter(() => 1), 1.07);
  const calm = waveWait(0, 1, () => 0.5);
  assert.ok(Math.abs(calm - paceAt(0).interval) < 1e-9);
  assert.ok(waveWait(0, 1.18, () => 0.5) > calm);
  assert.ok(waveWait(180, 1, () => 0.5) < calm);
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

test("the mantle scores nothing, and two missed lights close the field", () => {
  assert.equal(scoreForPass(1, true), 0);
  assert.equal(scoreForPass(2, true), 0);
  assert.equal(scoreForPass(2, false), 2);

  assert.deepEqual(noteBossLight(0, false), { missed: 1, close: false });
  assert.deepEqual(noteBossLight(1, true), { missed: 0, close: false });
  assert.deepEqual(noteBossLight(1, false), { missed: 0, close: true });

  const width = 390;
  const radius = 22;
  const core = 12;
  const centers = bossWallCenters(width, radius);
  assert.ok(centers[0] <= radius);
  assert.ok(centers.at(-1) >= width - radius);
  for (const x of [0, core, width * 0.08, width / 2, width - core, width]) {
    const covered = centers.some((center) => Math.abs(center - x) <= radius + core);
    assert.equal(covered, true);
  }
});

test("the mantle waits at 600 and returns 300 points later", () => {
  assert.equal(BOSS_SCORE, 600);
  assert.equal(BOSS_GAP, 300);
  assert.equal(BOSS_HITS, 3);
  assert.equal(bossThreshold(0), 600);
  assert.equal(bossThreshold(1), 900);
  assert.equal(bossThreshold(2), 1200);
});

function corridorRows(phrase) {
  const rows = new Map();
  for (const beat of phrase.beats) {
    if (Math.abs(beat.t - Math.round(beat.t)) > 0.05) continue;
    const key = Math.round(beat.t);
    const row = rows.get(key) || [];
    row.push(beat);
    rows.set(key, row);
  }
  return [...rows.keys()].sort((a, b) => a - b).map((key) => rows.get(key));
}

function openLane(row) {
  const core = row.find((beat) => beat.role === "core");
  if (core) return core.x;
  const taken = new Set(row.filter((beat) => beat.role === "shadow").map((beat) => beat.x));
  const lanes = [0.16, 0.39, 0.61, 0.84, 1 - 0.16, 1 - 0.39, 1 - 0.61, 1 - 0.84];
  return lanes.find((lane) => !taken.has(lane));
}

test("each mantle phrase is a corridor that ends in one light", () => {
  assert.equal(BOSS_PHRASES.length >= 6, true);
  for (const id of BOSS_PHRASES) {
    const phrase = bossPhrase(id, () => 0);
    const cores = phrase.beats.filter((beat) => beat.role === "core");
    assert.equal(cores.length, 1);
    const maxT = Math.max(...phrase.beats.map((beat) => beat.t));
    assert.equal(cores[0].t, maxT);
    for (let i = 1; i < phrase.beats.length; i += 1) {
      assert.ok(phrase.beats[i].t >= phrase.beats[i - 1].t);
    }
    const rows = corridorRows(phrase);
    assert.ok(rows.length >= 4);
    const opens = rows.map(openLane);
    assert.equal(opens.at(-1), cores[0].x);
    assert.ok(new Set(opens).size >= 2);
    for (const row of rows) {
      const shadows = row.filter((beat) => beat.role === "shadow").map((beat) => beat.x).sort((a, b) => a - b);
      assert.equal(shadows.length, 3);
      for (let i = 1; i < shadows.length; i += 1) assert.ok(shadows[i] - shadows[i - 1] >= 0.18);
      assert.equal(shadows.includes(openLane(row)), false);
    }
    const closers = phrase.beats.filter((beat) => Math.abs(beat.t - Math.round(beat.t)) > 0.05);
    assert.ok(closers.length >= 1);
  }

  const snake = bossPhrase("serpente", () => 0);
  assert.deepEqual(corridorRows(snake).map(openLane), [0.16, 0.39, 0.61, 0.84]);
  const mirrored = bossPhrase("serpente", () => 0.99);
  assert.notEqual(openLane(corridorRows(mirrored)[0]), 0.16);

  const feint = corridorRows(bossPhrase("finta", () => 0)).map(openLane);
  assert.equal(feint[0], feint[1]);
  assert.notEqual(feint.at(-1), feint[0]);

  const zag = corridorRows(bossPhrase("zigue", () => 0)).map(openLane);
  assert.ok(Math.abs(zag[1] - zag[0]) >= 0.4);
});

test("a phrase releases each beat once, even when the clock jumps", () => {
  const phrase = bossPhrase("serpente", () => 0);
  const opening = dueBeats(phrase, 0, 0);
  assert.equal(opening.beats.length, 3);
  assert.equal(opening.beats.every((beat) => beat.role === "shadow"), true);
  const rest = dueBeats(phrase, 10, opening.cursor);
  assert.equal(opening.cursor + rest.beats.length, phrase.beats.length);
  assert.equal(rest.beats.filter((beat) => beat.role === "core").length, 1);
  const again = dueBeats(phrase, 10, rest.cursor);
  assert.equal(again.beats.length, 0);
  assert.equal(again.cursor, phrase.beats.length);
});

test("a shuffled mantle deck keeps every phrase once", () => {
  let step = 0;
  const rolls = [0.1, 0.9, 0.4, 0.2, 0.7];
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

test("difficulty scales speed with the view height and the open field", () => {
  const phone = difficultyAt(0, 422);
  const reference = difficultyAt(0, DIFFICULTY.referenceHeight);
  assert.ok(Math.abs(phone.speed - reference.speed * 0.5) < 1e-9);
  const opened = difficultyAt(400, DIFFICULTY.referenceHeight, 1.7);
  const closed = difficultyAt(400, DIFFICULTY.referenceHeight, 1);
  assert.ok(Math.abs(opened.speed - closed.speed * 1.7) < 1e-9);
  assert.equal(opened.travel, closed.travel);
});
