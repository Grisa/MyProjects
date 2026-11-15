import assert from "node:assert/strict";
import test from "node:test";
import { UPGRADES, bonuses, canBuy, nodeGlow, nodeState, upgradeById } from "../js/upgrades.js";

test("only the root can be bought at the start", () => {
  const owned = new Set();
  const root = upgradeById("centelha");
  assert.equal(nodeState(root, owned), "available");
  assert.equal(nodeState(upgradeById("halo"), owned), "locked");
  assert.equal(canBuy(root, owned, root.cost), true);
  assert.equal(canBuy(root, owned, root.cost - 1), false);
  assert.equal(nodeGlow(root, owned, 0), "dim");
  assert.equal(nodeGlow(root, owned, root.cost), "soft");
});

test("buying a node unlocks the ones that require it", () => {
  const owned = new Set(["centelha"]);
  assert.equal(nodeState(upgradeById("centelha"), owned), "owned");
  assert.equal(nodeState(upgradeById("halo"), owned), "available");
  assert.equal(nodeState(upgradeById("casco"), owned), "available");
  assert.equal(nodeState(upgradeById("ima"), owned), "available");
  assert.equal(nodeState(upgradeById("aurora"), owned), "locked");
  assert.equal(nodeState(upgradeById("muralha"), owned), "locked");
  assert.equal(nodeState(upgradeById("brasa"), owned), "locked");
  assert.equal(nodeState(upgradeById("farol"), owned), "locked");
  assert.equal(nodeState(upgradeById("miolo"), owned), "locked");
  assert.equal(nodeState(upgradeById("prisma"), owned), "locked");
});

test("every upgrade can be reached by buying in order", () => {
  const owned = new Set();
  let guard = 0;
  while (owned.size < UPGRADES.length) {
    const next = UPGRADES.find(
      (upgrade) => !owned.has(upgrade.id) && upgrade.requires.every((id) => owned.has(id)),
    );
    assert.ok(next, "a node stayed locked after its parents were bought");
    owned.add(next.id);
    guard += 1;
    assert.ok(guard <= UPGRADES.length);
  }
});

test("bonuses stack along a branch", () => {
  const base = bonuses(new Set());
  assert.equal(base.light, 1);
  assert.equal(base.damage, 0.38);
  assert.equal(base.follow, 5);
  assert.equal(base.sparkValue, 1);
  assert.equal(base.heal, 0.2);
  assert.equal(base.core, 1);
  assert.equal(base.playerY, 0.82);
  assert.equal(base.rim, 0.58);
  assert.equal(base.guard, false);
  assert.equal(base.speed, 1);
  assert.equal(base.sparkScore, 0);
  assert.equal(base.magnet, 0);

  const grown = bonuses(new Set([
    "centelha", "halo", "aurora", "farol", "vela", "casco", "muralha", "respiro",
    "pausa", "folga", "miolo", "ima", "brasa", "prisma",
  ]));
  assert.ok(Math.abs(grown.light - 1.44) < 1e-9);
  assert.equal(grown.damage, 0.28);
  assert.equal(grown.heal, 0.34);
  assert.equal(grown.sparkValue, 2);
  assert.equal(grown.sparkScore, 1);
  assert.equal(grown.magnet, 0.14);
  assert.equal(grown.core, 0.78);
  assert.equal(grown.playerY, 0.785);
  assert.equal(grown.rim, 0.92);
  assert.equal(grown.guard, true);
  assert.equal(grown.speed, 0.88);
  assert.equal(grown.interval, 1.18);
});

test("tiers get stronger and more expensive", () => {
  const owned = new Set();
  assert.equal(nodeGlow(upgradeById("centelha"), new Set(["centelha"]), 0), "bright");
  assert.equal(bonuses(new Set(["passo"])).follow, 11);
  assert.equal(bonuses(new Set(["passo", "reflexo"])).follow, 18);
  assert.equal(bonuses(new Set(["passo", "reflexo", "passo3"])).follow, 32);
  assert.equal(bonuses(new Set(["ima"])).magnet, 0.14);
  assert.equal(bonuses(new Set(["ima", "vortice"])).magnet, 0.3);
  assert.equal(bonuses(new Set(["ima", "vortice", "ima3"])).magnet, 0.5);
  assert.equal(bonuses(new Set(["casco", "muralha", "casco3"])).damage, 0.22);
  assert.ok(upgradeById("vortice").cost > upgradeById("ima").cost);
  assert.ok(upgradeById("ima3").cost > upgradeById("vortice").cost);
  assert.equal(nodeState(upgradeById("ima3"), new Set(["centelha", "ima"])), "locked");
  assert.equal(nodeState(upgradeById("ima3"), new Set(["centelha", "ima", "vortice"])), "available");
  assert.equal(nodeState(upgradeById("passo3"), owned), "locked");
  assert.equal(upgradeById("miolo").requires[0], "passo3");
});
